# Dotfiles

A comprehensive, automated dotfiles management system for macOS development environments. Features a powerful CLI tool for setup, maintenance, and AI-powered development insights.

## Overview

This repository contains my personal development environment configuration, managed through a custom CLI tool called `dot`. It uses GNU Stow for symlink management, Homebrew for package installation, and includes configurations for Fish shell, Neovim, Herdr, Git, and other essential development tools.

### Key Features

- 🚀 **One-command setup** - Complete development environment in minutes
- 🤖 **AI Integration** - pi for AI assistance
- 📦 **Resilient Package Management** - Continues installation even if packages fail
- 🔍 **Health Monitoring** - Comprehensive environment diagnostics
- 🛠️ **Modular Design** - Separate work and personal configurations

## Quick Start

```bash
# Clone the repository
git clone https://github.com/dmmulroy/.dotfiles.git ~/.dotfiles
cd ~/.dotfiles

# Full setup (installs everything)
./dot init
```

After installation, the `dot` command will be available globally for ongoing management. Running `dot` without arguments shows help.

## Repository Structure

```
~/.dotfiles/
├── dot                 # Main CLI tool
├── home/              # Configuration files (stowed to ~)
│   ├── .config/
│   │   ├── fish/      # Fish shell configuration
│   │   ├── git/       # Git configuration
│   │   ├── nvim/      # Neovim configuration
│   │   ├── herdr/     # Herdr configuration
│   │   └── ...
│   └── .ideavimrc     # IntelliJ IDEA Vim config
├── packages/
│   ├── bundle         # Base Brewfile
│   └── bundle.work    # Work-specific packages
├── CLAUDE.md          # Instructions for AI assistants
└── README.md          # This file
```

## The `dot` CLI Tool

The `dot` command is a comprehensive management tool for your dotfiles. It handles everything from initial setup to ongoing maintenance and provides AI-powered insights.

### Installation Commands

#### `dot init` - Initial Setup
Complete environment setup with all tools and configurations.

```bash
# Full installation
dot init
```

**What it does:**
1. Installs Homebrew (if not present)
2. Installs packages from Brewfiles
3. Creates symlinks with GNU Stow
4. Installs pi via https://pi.dev/install.sh
5. Generates SSH key for GitHub (required)
6. Renames computer to RY<serial_number> format (required)

### Maintenance Commands

#### `dot update` - Update Everything
```bash
dot update
```
- Pulls the latest dotfiles changes with Git
- Updates Homebrew and automatically upgrades outdated packages
- Re-stows configuration files
- Runs `pi update` to update pi and its configured packages

#### `dot doctor` - Health Check
```bash
dot doctor
```
Comprehensive diagnostics including:
- ✅ Homebrew installation
- ✅ Essential tools (git, herdr, nvim, node, etc.)
- ✅ pi installation and core development tools
- ✅ PATH configuration
- ⚠️ Broken symlinks detection
- ⚠️ Missing dependencies

#### `dot check-packages` - Package Status
```bash
dot check-packages
```
Shows which packages are installed vs. missing from your Brewfiles.

#### `dot retry-failed` - Retry Failed Installations
```bash
dot retry-failed
```
Attempts to reinstall packages that failed during initial setup.

### Utility Commands

#### `dot edit` - Open in Editor
```bash
dot edit
```
Opens the dotfiles directory in your default editor (defined by `$EDITOR`).

#### `dot stow` - Update Dotfiles Symlinks
```bash
# Create/update symlinks for configuration files
dot stow
```
Re-creates symlinks from `home/` directory to your home directory (`~`). Use this after editing configuration files.

#### `dot link` / `dot unlink` - Global dot Command Installation
```bash
# Install dot command globally (add to PATH)
dot link

# Remove global installation
dot unlink
```
Makes the `dot` command available from any directory by creating a symlink in `/usr/local/bin` or `~/.local/bin`.

## Configuration

### Package Management

The system provides comprehensive package management through the `dot package` command and uses two Brewfiles for different contexts:

#### Package Commands

```bash
# List packages
dot package list              # List all packages
dot package list base         # List base packages only
dot package list work         # List work packages only

# Add packages
dot package add git           # Add git formula to base bundle
dot package add docker cask   # Add docker cask to base bundle  
dot package add kubectl brew work  # Add kubectl to work bundle

# Update packages
dot package update            # Update all installed packages
dot package update git        # Update specific package
dot package update all base   # Update only base bundle packages
dot package update all work   # Update only work bundle packages

# Remove packages
dot package remove git        # Remove git from any bundle
dot package remove docker base  # Remove docker from base bundle only
```

#### Package Files

**`packages/bundle`** - Base packages for all machines:
- Development tools: neovim, herdr, fish, git
- CLI utilities: ripgrep, fd, fzf, starship
- Applications: Arc browser, Raycast, OrbStack
- AI tools: aider

**`packages/bundle.work`** - Work-specific formula additions:
- AWS/Kubernetes tools
- Enterprise development tools
- Formulae only; casks must be added to the base bundle

#### Package Features

- **Auto-detection**: Package type (brew vs cask) automatically detected
- **Sorted maintenance**: Packages kept alphabetically sorted within each type
- **Installation integration**: Adding packages installs them immediately
- **Update flexibility**: Can update all packages, specific packages, or by bundle
- **Cleanup included**: Update command includes Homebrew refresh and optional cleanup

### Key Configurations

- **Git**: Conditional work configuration and custom aliases

### Architecture Highlights

- **GNU Stow**: Manages symlinks from `home/` to `~`
- **Modular Design**: Separate configs for different tools
- **Conditional Loading**: Work-specific Git config for `~/Code/work/`
- **Plugin Managers**: Each tool uses its own where applicable (lazy.nvim, Fisher)
- **Error Resilience**: Package installation continues despite individual failures

## Environment Setup

### Prerequisites

- macOS (Intel or Apple Silicon)
- Internet connection
- Terminal access

### First-Time Setup

1. **Clone repository:**
   ```bash
   git clone https://github.com/dmmulroy/.dotfiles.git ~/.dotfiles
   cd ~/.dotfiles
   ```

2. **Run installation:**
   ```bash
   ./dot init
   ```

3. **Restart shell or source Fish config:**
   ```bash
   # In Fish shell
   source ~/.config/fish/config.fish
   
   # Or restart terminal
   ```

4. **Verify installation:**
   ```bash
   dot doctor
   ```

### Customization

#### Adding Packages

**Method 1: Using package commands (recommended):**
```bash
# Add package using the package command
dot package add new-tool             # Adds to base bundle
dot package add new-app cask         # Adds cask to base bundle
dot package add work-tool brew work  # Adds to work bundle
```

**Method 2: Manual editing:**
Edit `packages/bundle` or `packages/bundle.work`:
```ruby
# Add to packages/bundle
brew "new-tool"
cask "new-app"
```

Then run:
```bash
dot init  # or brew bundle --file=./packages/bundle
```

#### Modifying Configurations
1. Edit files in `home/` directory (not your actual home directory)
2. Re-stow changes: `dot stow` (or `dot init` for full setup)
3. Test configuration changes

#### Work-Specific Setup
The system automatically applies work-specific Git configuration for repositories under `~/Code/work/`.

## Troubleshooting

### Common Issues

**Command not found: `dot`**
```bash
# Source Fish configuration
source ~/.config/fish/config.fish

# Or add to PATH manually
export PATH="$HOME/.dotfiles:$PATH"
```

**Package installation failures:**
```bash
# Check what failed
dot check-packages

# Retry failed packages
dot retry-failed
```

**Broken symlinks:**
```bash
# Diagnose issues
dot doctor

# Re-create symlinks
dot stow
```

**pi installation issues:**
```bash
# Install pi manually using the official installer
curl -fsSL https://pi.dev/install.sh | sh
```

### Getting Help

- Run `dot help` for command overview
- Run `dot <command> --help` for specific command help
- Check `dot doctor` for environment issues
- Review logs in failed package files: `packages/failed_packages_*.txt`

## Development

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes in the `home/` directory structure
4. Test with `dot doctor` and `dot check-packages`
5. Submit a pull request

### Testing Changes

```bash
# Make modifications to dotfiles
# ...

# Test changes
dot doctor

# Re-stow if needed
dot stow
```

## Advanced Usage

### Selective Installation

```bash
# Install only base packages (all init steps are required)
dot init

# Check what's missing
dot check-packages

# Install work packages later
brew bundle --file=./packages/bundle.work
```

## License

This repository is for personal use. Feel free to fork and adapt for your own needs.

## Acknowledgments

- [GNU Stow](https://www.gnu.org/software/stow/) for symlink management
- [Homebrew](https://brew.sh/) for package management
- pi for AI assistance
- The dotfiles community for inspiration and best practices