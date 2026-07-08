#!/usr/bin/env bash
# Fejlesztői környezet telepítése egy üres Ubuntu WSL image-be.
# A docs/setup-instructions.md "2. A fejlesztői környezet telepítése" (Linux-ág)
# szekciójában leírt eszközöket telepíti: Claude Code, Node LTS, pnpm, GitHub CLI,
# Docker Engine + compose plugin.
#
# Futtatás (a WSL disztró belsejéből, sudo jogosultsággal rendelkező felhasználóval):
#   chmod +x init-wsl.sh
#   ./init-wsl.sh

set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

echo "==> 1. Alap csomaglista frissítése és előfeltételek"
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  git \
  build-essential \
  unzip

echo "==> 2. Claude Code telepítése"
if ! command -v claude >/dev/null 2>&1; then
  curl -fsSL https://claude.ai/install.sh | bash
  # A telepítő ~/.local/bin alá tesz; a jelenlegi shell PATH-ába is felvesszük.
  export PATH="$HOME/.local/bin:$PATH"
else
  echo "Claude Code már telepítve van, kihagyva."
fi

echo "==> 3. Node LTS telepítése nvm-mel"
export NVM_DIR="$HOME/.nvm"
if [ ! -d "$NVM_DIR" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
# shellcheck disable=SC1090
\. "$NVM_DIR/nvm.sh"
nvm install --lts
nvm alias default 'lts/*'
nvm use default

echo "==> 4. pnpm bekapcsolása corepackkel"
corepack enable pnpm
corepack prepare pnpm@latest --activate

echo "==> 5. GitHub CLI (gh) telepítése"
if ! command -v gh >/dev/null 2>&1; then
  sudo mkdir -p -m 755 /etc/apt/keyrings
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg >/dev/null
  sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    | sudo tee /etc/apt/sources.list.d/github-cli.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y gh
else
  echo "GitHub CLI már telepítve van, kihagyva."
fi

echo "==> 6. Docker Engine + compose plugin telepítése"
if ! command -v docker >/dev/null 2>&1; then
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  # A jelenlegi felhasználó felvétele a docker csoportba (sudo nélküli docker-hez).
  sudo usermod -aG docker "$USER"
else
  echo "Docker már telepítve van, kihagyva."
fi

echo "==> Kész. Új shellt vagy 'wsl --shutdown'-t követő újraindítást igényelhet:"
echo "    - a PATH-frissítés (nvm, pnpm, claude) érvényesüléséhez,"
echo "    - a docker csoporttagság érvényesüléséhez (sudo nélküli docker-parancsokhoz),"
echo "    - illetve ha ez az első Docker-telepítés, a Docker daemon elindításához (WSL2 + systemd)."
echo
echo "Első használat előtt jelentkezz be:"
echo "    claude          # vagy: claude, majd /login a session-ben"
echo "    gh auth login"
echo
echo "==> Ellenőrzés"
claude --version || true
node -v
pnpm -v
gh --version || true
docker --version || true
