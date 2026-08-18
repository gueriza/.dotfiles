import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
  assistantMessageToText,
  buildHandoffMessage,
  createHandoffId,
  extractHandoff,
  getLatestUnconsumedHandoff,
} from "../../src/utils/handoff.js";

// Runtime dependencies are provided by pi. Keep this extension dependency-free
// so the package works with only peer dependencies.

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, "..", "..");

const STICKY_AGENTS = new Set(["architect", "developer"]);
const READONLY_AGENTS = new Set(["reviewer"]);
const COMMAND_AGENTS: Record<string, string> = {
  review: "reviewer",
  test: "tester",
};

interface Manifest {
  agents: Array<{ name: string; source: string }>;
  skills: Array<{ name: string; source: string }>;
  commands: Array<{ name: string; source: string }>;
}

interface LoadedRecipe {
  name: string;
  source: string;
  frontmatter: Record<string, string> | null;
  body: string;
}

interface PersonaState {
  activeAgent: string | null;
  task?: string;
}

function loadManifest(): Manifest {
  const manifestPath = join(packageRoot, "manifest.json");
  return JSON.parse(readFileSync(manifestPath, "utf-8")) as Manifest;
}

function parseFrontmatter(content: string): { frontmatter: Record<string, string> | null; body: string } {
  const lines = content.split("\n");
  if (lines[0]?.trim() !== "---") {
    return { frontmatter: null, body: content };
  }

  const endIndex = lines.findIndex((line, i) => i > 0 && line.trim() === "---");
  if (endIndex === -1) {
    return { frontmatter: null, body: content };
  }

  const frontmatter: Record<string, string> = {};
  for (let i = 1; i < endIndex; i++) {
    const line = lines[i];
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      frontmatter[key] = value;
    }
  }

  const body = lines.slice(endIndex + 1).join("\n").trimStart();
  return { frontmatter, body };
}

function loadRecipe(name: string, type: "agent" | "command", manifest: Manifest): LoadedRecipe {
  const collection = type === "agent" ? manifest.agents : manifest.commands;
  const item = collection.find((a) => a.name === name);
  if (!item) {
    throw new Error(`Unknown ${type}: ${name}`);
  }

  const content = readFileSync(join(packageRoot, item.source), "utf-8");
  const { frontmatter, body } = parseFrontmatter(content);
  return { name: item.name, source: item.source, frontmatter, body };
}

function listRecipeNames(manifest: Manifest, type: "agent" | "command"): string[] {
  const collection = type === "agent" ? manifest.agents : manifest.commands;
  return collection.map((a) => a.name);
}

function getActivePersona(ctx: ExtensionContext): PersonaState | undefined {
  const entries = ctx.sessionManager.getEntries();
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.type === "custom" && entry.customType === "buildcrew:persona") {
      const persona = entry.data as PersonaState;
      return persona.activeAgent ? persona : undefined;
    }
  }
  return undefined;
}

function isReadonlyAgent(name: string): boolean {
  return READONLY_AGENTS.has(name);
}

/**
 * pi.sendUserMessage throws while a run is streaming (no deliverAs option)
 * and pi swallows it as an extension error, silently dropping the message.
 * Send only when idle; otherwise warn so the user knows to re-run the command.
 */
function sendWhenIdle(pi: ExtensionAPI, ctx: ExtensionContext, message: string, busyWarning: string): boolean {
  if (ctx.isIdle()) {
    pi.sendUserMessage(message);
    return true;
  }
  ctx.ui.notify(busyWarning, "warning");
  return false;
}

function isTestFile(path: string): boolean {
  const lower = path.toLowerCase();
  return (
    lower.includes("/tests/") ||
    lower.includes("/__tests__/") ||
    lower.includes("/spec/") ||
    lower.endsWith(".test.ts") ||
    lower.endsWith(".test.js") ||
    lower.endsWith(".spec.ts") ||
    lower.endsWith(".spec.js") ||
    lower.endsWith("_test.go") ||
    lower.startsWith("test_")
  );
}

function isDestructiveBash(command: string): boolean {
  const destructivePatterns = [
    /\brm\s+-rf?\b/,
    /\brm\s+.*[-]rf?\b/,
    />\s*\S+/, // output redirect that overwrites
    /\bgit\s+commit\b/,
    /\bgit\s+push\b/,
    /\bgit\s+merge\b/,
    /\bgit\s+rebase\b/,
    /\bsudo\b/,
    /\bdd\s+if=/,
  ];
  return destructivePatterns.some((pattern) => pattern.test(command));
}

function isFirstLevelSubfolder(path: string): boolean {
  if (!path || typeof path !== "string") return false;
  const normalized = path.replace(/^\.\//, "");
  if (normalized.startsWith("../") || normalized.startsWith("/")) return false;
  const parts = normalized.split("/").filter(Boolean);
  // Must have at least one folder component and one file/folder component under it.
  return parts.length >= 2 && parts[0].length > 0;
}

export default function buildcrewPi(pi: ExtensionAPI) {
  const manifest = loadManifest();
  const agentNames = listRecipeNames(manifest, "agent");
  const commandNames = listRecipeNames(manifest, "command");

  // One-shot agent state is kept in memory only for the next turn.
  let oneShotAgent: string | null = null;

  pi.on("session_start", async (_event, ctx) => {
    const persona = getActivePersona(ctx);
    if (persona) {
      ctx.ui.setStatus("buildcrew", `Active: @${persona.activeAgent}`);
    } else {
      ctx.ui.setStatus("buildcrew", undefined);
    }
  });

  pi.on("before_agent_start", async (event, ctx) => {
    // NOTE (pi core limitation): this event only fires for turns started while
    // idle. Messages queued via steer/followUp during streaming reuse the
    // previous run's system prompt, so the prompt-level persona below can lag
    // the session persona entry by one turn. The tool_call gate further down
    // always resolves the live persona and is the authoritative enforcement.
    const additions: string[] = [];
    let handoffMessage: { customType: string; content: string; display: boolean } | undefined;

    // Explicit one-shot personas and command agents apply only for the immediate turn.
    const sticky = getActivePersona(ctx);
    const activeAgent = oneShotAgent ?? sticky?.activeAgent;

    if (activeAgent) {
      const recipe = loadRecipe(activeAgent, "agent", manifest);
      additions.push(recipe.body);
      additions.push(`\nYou are currently acting as the @${activeAgent} agent.`);
      if (activeAgent === "architect") {
        additions.push(
          "You may create and edit documentation files only inside a first-level subfolder of the project root (for example, docs/, project-docs/, design/, etc.). " +
            "Use docs/ as the default folder unless the user asks for a different name. " +
            "If a docs/ folder already exists and you want to create new documentation, ask the user what first-level folder name they would like to use instead. " +
            "You must not write implementation code or documentation files directly to the project root."
        );
      } else if (isReadonlyAgent(activeAgent)) {
        additions.push(
          "You must not modify files, run destructive commands, or create commits. " +
            "Provide analysis, design, or recommendations only."
        );
      }
      if (activeAgent === "tester") {
        additions.push(
          "You may only create or edit test files, test fixtures, or test helpers. " +
            "Do not modify production source code."
        );
      }
      if (activeAgent === "developer") {
        const handoff = getLatestUnconsumedHandoff(ctx.sessionManager.getEntries());
        if (handoff) {
          handoffMessage = buildHandoffMessage(handoff);
          additions.push("Use the injected Architect Handoff as the implementation plan when present.");
          pi.appendEntry("buildcrew:handoff-consumed", {
            handoffId: handoff.id,
            consumedAt: new Date().toISOString(),
          });
        }
      }
    }

    if (additions.length === 0 && !handoffMessage) {
      return undefined;
    }

    return {
      message: handoffMessage,
      systemPrompt: event.systemPrompt + "\n\n" + additions.join("\n\n"),
    };
  });

  pi.on("message_end", async (event, ctx) => {
    if (event.message.role !== "assistant") {
      return undefined;
    }

    const persona = getActivePersona(ctx);
    const activeAgent = oneShotAgent ?? persona?.activeAgent;
    if (activeAgent !== "architect") {
      return undefined;
    }

    const content = extractHandoff(assistantMessageToText(event.message));
    if (!content) {
      return undefined;
    }

    pi.appendEntry("buildcrew:handoff", {
      id: createHandoffId(),
      sourceAgent: "architect",
      createdAt: new Date().toISOString(),
      content,
    });

    return undefined;
  });

  pi.on("agent_end", async () => {
    // Clear one-shot agents after each user prompt/turn completes.
    oneShotAgent = null;
  });

  pi.on("tool_call", async (event, ctx) => {
    const persona = getActivePersona(ctx);
    const activeAgent = oneShotAgent ?? persona?.activeAgent;
    if (!activeAgent) return undefined;

    if (event.toolName === "edit" || event.toolName === "write") {
      if (activeAgent === "architect") {
        const pathArg = (event.input as { path?: string }).path ?? "";
        if (!isFirstLevelSubfolder(pathArg)) {
          return {
            block: true,
            reason: `Agent @architect can only create or edit documentation files inside a first-level subfolder (e.g., docs/, project-docs/). "${pathArg}" is not inside a first-level subfolder.`,
          };
        }
      } else if (isReadonlyAgent(activeAgent)) {
        return { block: true, reason: `Agent @${activeAgent} is read-only` };
      } else if (activeAgent === "tester") {
        const pathArg = (event.input as { path?: string }).path ?? "";
        if (!isTestFile(pathArg)) {
          return {
            block: true,
            reason: `Agent @tester can only edit test files. "${pathArg}" is not a test file.`,
          };
        }
      }
    }

    if (event.toolName === "bash") {
      const command = (event.input as { command?: string }).command ?? "";
      if (isDestructiveBash(command)) {
        return { block: true, reason: `Agent @${activeAgent} cannot run destructive commands` };
      }
    }

    return undefined;
  });

  // Register sticky agent commands.
  for (const name of agentNames) {
    if (!STICKY_AGENTS.has(name)) continue;

    pi.registerCommand(name, {
      description: `Activate the @${name} agent (sticky)`,
      handler: async (args, ctx) => {
        const persona: PersonaState = { activeAgent: name, task: args || undefined };
        pi.appendEntry("buildcrew:persona", persona);
        ctx.ui.setStatus("buildcrew", `Active: @${name}`);

        if (args) {
          // Treat command arguments as a user message so the agent responds in character.
          // The persona switch above applies from the next turn either way.
          const sent = sendWhenIdle(
            pi,
            ctx,
            args,
            `Switched to @${name}, but a run is still in progress. ` +
              "Re-send your task when it finishes — sending it now would run under the previous agent's prompt."
          );
          if (sent) {
            ctx.ui.notify(`Switched to @${name} agent`, "info");
          }
        } else {
          ctx.ui.notify(`Switched to @${name} agent`, "info");
          ctx.ui.notify(`Type a prompt and @${name} will respond.`, "info");
        }
      },
    });
  }

  // Register one-shot agent commands.
  for (const name of agentNames) {
    if (STICKY_AGENTS.has(name)) continue;

    pi.registerCommand(name, {
      description: `Invoke the @${name} agent once`,
      handler: async (args, ctx) => {
        // Arming a one-shot during a run is a silent no-op: agent_end clears
        // oneShotAgent when the in-flight run finishes, before the next prompt.
        if (!ctx.isIdle()) {
          ctx.ui.notify(`A run is still in progress — re-run /${name} when it finishes.`, "warning");
          return;
        }
        oneShotAgent = name;
        if (args) {
          pi.sendUserMessage(args);
        } else {
          ctx.ui.notify(`@${name} is active for the next prompt.`, "info");
        }
      },
    });
  }

  // Register one-shot command prompts.
  for (const name of commandNames) {
    pi.registerCommand(name, {
      description: `Run the /${name} command prompt`,
      handler: async (args, ctx) => {
        const recipe = loadRecipe(name, "command", manifest);
        const prompt = args ? `${recipe.body}\n\nUser scope: ${args}` : recipe.body;
        const sent = sendWhenIdle(
          pi,
          ctx,
          prompt,
          `A run is still in progress — re-run /${name} when it finishes.`
        );
        if (sent) {
          ctx.ui.notify(`/${name} prompt sent`, "info");
        }
      },
    });
  }

  // Register utility commands.
  pi.registerCommand("buildcrew", {
    description: "Show active agent and available commands",
    handler: async (_args, ctx) => {
      const persona = getActivePersona(ctx);
      const lines = ["BuildCrew commands:"];
      lines.push("Sticky agents: /architect, /developer");
      lines.push("One-shot agents: /reviewer, /tester");
      lines.push("Commands: /review, /test, /refactor, /prepare-commit");
      if (persona?.activeAgent) {
        lines.push(`Currently active: @${persona.activeAgent}`);
      } else {
        lines.push("No agent currently active.");
      }
      ctx.ui.notify(lines.join("\n"), "info");
    },
  });

  pi.registerCommand("buildcrew-reset", {
    description: "Clear the active sticky agent",
    handler: async (_args, ctx) => {
      pi.appendEntry("buildcrew:persona", { activeAgent: null });
      ctx.ui.setStatus("buildcrew", undefined);
      ctx.ui.notify("Cleared active BuildCrew agent.", "info");
    },
  });
}
