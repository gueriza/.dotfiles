# Dotfiles

A minimal, automated dotfiles management system for macOS, built around a custom `dot` CLI tool, GNU Stow, and Homebrew.

## Overview

This repository contains a personal macOS development environment configuration. It installs a small set of apps and tools, sets the computer name, configures Git, and applies a curated set of macOS system defaults.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/gueriza/.dotfiles.git ~/.dotfiles
cd ~/.dotfiles

# Full setup
./dot init
```

After installation, the `dot` command is available globally once `~/.dotfiles` is in your PATH.

## Repository Structure

```
~/.dotfiles/
├── dot                 # Main CLI tool
├── scripts/            # macOS setup scripts
│   └── macos.sh        # Curated macOS defaults
├── home/              # Configuration files (stowed to ~)
│   └── .config/
│       ├── git/       # Git configuration
│       └── ...
├── packages/
│   ├── bundle         # Base Brewfile
│   └── bundle.work    # Optional work-specific packages
└── README.md          # This file
```

## The `dot` CLI Tool

### Installation Commands

#### `dot init` — Initial Setup

```bash
dot init
```

**What it does:**
1. Installs Homebrew (if not present)
2. Installs packages from `packages/bundle`
3. Creates symlinks with GNU Stow
4. Installs pi via https://pi.dev/install.sh
5. Installs pi packages from `settings.json`
6. Installs pi extension dependencies (`npm ci` in `~/.pi/`)
7. Generates SSH key for GitHub (`~/.ssh/ghssh`)
8. Renames computer to `RY<serial_number>`

All steps are required and run automatically.

### Maintenance Commands

#### `dot update`

```bash
dot update
```

- Pulls the latest dotfiles changes
- Updates Homebrew and upgrades outdated packages
- Re-stows configuration files
- Runs `pi update`

#### `dot doctor`

```bash
dot doctor
```

Checks:
- Homebrew installation
- GNU Stow installation
- Broken symlinks
- SSH key presence
- Required tools: `brew`, `pi`, `git`, `gh`
- PATH configuration

#### `dot macos`

```bash
dot macos
```

Applies curated macOS system defaults (Dock, Finder, trackpad, Safari, Messages, screenshots, energy, etc.). Requires `sudo` and asks for confirmation before running.

### Utility Commands

```bash
dot stow                # Re-create symlinks
dot link                # Add dot to PATH
dot unlink              # Remove dot from PATH
dot edit                # Open dotfiles in $EDITOR
dot rename-computer     # Rename Mac to RY<serial_number>
dot gen-ssh-key         # Generate GitHub SSH key
dot package list        # List packages
dot package add <name>  # Add and install a package
dot package remove      # Remove a package from bundle
dot package update      # Update packages
dot check-packages      # Show installed vs missing
dot retry-failed        # Retry failed installs
```

## Configuration

### Package Management

The `packages/bundle` file contains the base set of packages:

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

`micro` is installed as the default terminal editor and is used by Git when it needs an editor.

### Git

Git configuration lives in `home/.config/git/` and is stowed to `~/.config/git/`.

### macOS Defaults

The `scripts/macos.sh` script applies macOS system defaults. It covers:

- General UI/UX
- Energy and sleep settings
- Trackpad and keyboard
- Screen and screenshots
- Finder
- Dock and Dashboard
- Safari
- Messages
- Photos

It skips Mail, Notification Center, Spotlight re-indexing, hibernation, Terminal/iTerm, and Activity Monitor tweaks.

## First-Time Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/gueriza/.dotfiles.git ~/.dotfiles
   cd ~/.dotfiles
   ```

2. **Run installation:**
   ```bash
   ./dot init
   ```

3. **Apply macOS defaults:**
   ```bash
   dot macos
   ```

4. **Verify:**
   ```bash
   dot doctor
   ```

## Troubleshooting

**Command not found: `dot`**
```bash
export PATH="$HOME/.dotfiles:$PATH"
```

**Package installation failures:**
```bash
dot check-packages
dot retry-failed
```

**Broken symlinks:**
```bash
dot doctor
dot stow
```

**pi installation issues:**
```bash
curl -fsSL https://pi.dev/install.sh | sh
```

## License

This repository is for personal use. Feel free to fork and adapt for your own needs.
