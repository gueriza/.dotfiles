# DOTFILES

Minimal, opinionated macOS development environment managed through a custom `dot` CLI, GNU Stow, and Homebrew.

## Project overview

This repository configures a new Mac with a small set of CLI tools and applications, Git configuration, and curated macOS system defaults. It is intentionally minimal: no Fish shell, no Neovim/Vim/Vi, no Bun/Vite+, no MonoLisa font.

## Structure

```
.dotfiles/
├── dot                 # Main CLI tool (~2200 lines bash)
├── scripts/
│   └── macos.sh        # Curated macOS defaults script
├── home/               # Stowed to ~
│   ├── .config/
│   │   ├── git/        # Git configuration and aliases
│   │   └── ...
│   ├── .agents/        # Shared agent skills (stowed to ~/.agents/)
│   │   └── skills/
│   ├── .pi/            # Global pi config and extensions (stowed to ~/.pi/)
│   │   ├── agent/extensions/  # TypeScript pi extensions
│   │   └── agent/settings.json
│   └── .local/bin/     # Optional helper scripts
├── packages/
│   ├── bundle          # Base Brewfile
│   └── bundle.work     # Optional work-specific packages
├── AGENTS.md           # This file
└── README.md
```

## Current bundle

`packages/bundle` contains only requested apps plus essentials:

```ruby
tap "homebrew/cask-fonts"
brew "gh"
brew "micro"
brew "stow"
cask "font-sf-mono"
cask "betterdisplay"
cask "hiddenbar"
cask "ollama"
cask "orbstack"
cask "raycast"
cask "supacode"
```

`micro` is the default terminal editor and Git's `core.editor`.

## Pi extensions

`home/.pi/` is stowed to `~/.pi/`. Pi auto-discovers TypeScript extensions from:

- `~/.pi/agent/extensions/*.ts`
- `~/.pi/agent/extensions/*/index.ts`

Workspace-managed extensions (with their own `package.json`) live in `home/.pi/agent/extensions/`:

- `opencode-cloudflare`
- `pi-skill-toggle`
- `save-md`

After changing extension code or `package.json`, run `npm install` in `home/.pi/` and reload pi with `/reload`.

## `dot` commands

| Command | Purpose |
|---------|---------|
| `dot init` | Full setup: Homebrew → Brewfile → Stow → pi → SSH key → computer rename |
| `dot update` | Pull dotfiles, update Homebrew, re-stow, update pi |
| `dot doctor` | Environment diagnostics |
| `dot macos` | Apply curated macOS defaults (requires sudo, asks confirmation) |
| `dot stow` | Re-create symlinks from `home/` to `~` |
| `dot link` / `dot unlink` | Add/remove global `dot` symlink in PATH |
| `dot package list|add|remove|update` | Manage Brewfile packages |
| `dot check-packages` | Show installed vs missing packages |
| `dot retry-failed` | Retry packages that failed during init |
| `dot gen-ssh-key [email]` | Generate `~/.ssh/ghssh` Ed25519 key |
| `dot rename-computer` | Rename Mac to `RY<serial_number>` automatically |
| `dot edit` | Open dotfiles in `$EDITOR` |

## Init flow

All steps are required; there are no skip flags.

1. Check for Administrator privileges
2. Install Xcode Command Line Tools if missing
3. Install Homebrew
4. Install packages from `packages/bundle`
5. Stow dotfiles from `home/` to `~`
6. Install pi via `https://pi.dev/install.sh`
7. Generate SSH key for GitHub at `~/.ssh/ghssh`
8. Rename computer to `RY<serial_number>`

## Conventions

- Edit files in `home/`, not directly in `~/.config/`
- Add packages with `dot package add <name>` so sorting and type detection are handled
- `packages/bundle` holds all casks and shared formulae
- `packages/bundle.work` is optional and formulas only
- Use the noreply GitHub email for commits: `4548351+gueriza@users.noreply.github.com`
- Git identity: `Riza Yahya <4548351+gueriza@users.noreply.github.com>`

## Anti-patterns

- Editing `~/.config/*` directly (changes are lost on re-stow)
- Putting casks in `packages/bundle.work`
- Adding skip flags to `dot init`
- Installing Fish, Neovim/Vim/Vi, Herdr, Bun, Vite+, or MonoLisa via this setup
- Using the private `gueriza@me.com` email for GitHub commits

## Notes

- `dot macos` keeps press-and-hold enabled for umlauts and skips Mail, Notification Center, Spotlight re-indexing, hibernation, Terminal/iTerm, and Activity Monitor tweaks.
- `dot init` requires an admin user on macOS because Homebrew requires it.
- This setup uses **zsh** or the default login shell, not Fish.
- The default editor is `micro`, not vim/nano.
