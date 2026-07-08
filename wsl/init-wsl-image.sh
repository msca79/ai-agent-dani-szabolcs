#!/usr/bin/env bash
#
# create-ai-agent-wsl.sh
#
# Git Bash (MINGW/MSYS) script for Windows.
# Letölt egy TISZTA, hivatalos Ubuntu 24.04 (Noble) WSL rootfs image-et
# a Canonical szerveréről, és importálja "ai-agent" néven, KÜLÖN mappába,
# saját fájlrendszerrel. A meglévő Ubuntu WSL disztróidhoz nem nyúl.
#
# Használat:
#   ./create-ai-agent-wsl.sh
#
# Testreszabható változók lent (DISTRO_NAME, INSTALL_DIR, NEW_USER).

set -euo pipefail

# --- Beállítások --------------------------------------------------------
DISTRO_NAME="ai-agent"
INSTALL_DIR_WIN="${USERPROFILE}\\WSL\\${DISTRO_NAME}"
NEW_USER="${NEW_USER:-agent}"
ROOTFS_URL="https://cloud-images.ubuntu.com/wsl/releases/24.04/current/ubuntu-noble-wsl-amd64-wsl.rootfs.tar.gz"
SHA_URL="https://cloud-images.ubuntu.com/wsl/releases/24.04/current/SHA256SUMS"
# -------------------------------------------------------------------------

echo "==> Ellenorzes: fut-e mar 'wsl.exe'..."
command -v wsl.exe >/dev/null 2>&1 || { echo "HIBA: wsl.exe nem talalhato. WSL telepitve van?"; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "HIBA: curl nem talalhato a Git Bash-ben."; exit 1; }

echo "==> Ellenorzes: van-e mar '${DISTRO_NAME}' nevu WSL disztro..."
if wsl.exe -l -q | tr -d '\r' | grep -qx "${DISTRO_NAME}"; then
  echo "HIBA: mar letezik '${DISTRO_NAME}' nevu WSL disztro. Elozetes torles:"
  echo "      wsl --unregister ${DISTRO_NAME}"
  exit 1
fi

INSTALL_DIR_UNIX="$(cygpath -u "${INSTALL_DIR_WIN}")"
mkdir -p "${INSTALL_DIR_UNIX}"

ROOTFS_FILE="${INSTALL_DIR_UNIX}/ubuntu-24.04-rootfs.tar.gz"

echo "==> Ubuntu 24.04 (Noble) rootfs letoltese..."
echo "    Forras: ${ROOTFS_URL}"
curl -L --fail -o "${ROOTFS_FILE}" "${ROOTFS_URL}"

echo "==> Checksum ellenorzes..."
EXPECTED_SHA="$(curl -L --fail -s "${SHA_URL}" | grep 'wsl-amd64-wsl.rootfs.tar.gz' | awk '{print $1}' | head -n1)"
if [ -n "${EXPECTED_SHA:-}" ]; then
  ACTUAL_SHA="$(sha256sum "${ROOTFS_FILE}" | awk '{print $1}')"
  if [ "${EXPECTED_SHA}" != "${ACTUAL_SHA}" ]; then
    echo "HIBA: checksum eltérés! Letoltes serult vagy megvaltozott a fajl."
    exit 1
  fi
  echo "    OK, checksum egyezik."
else
  echo "    Figyelem: checksum sort nem talaltam, kihagyva."
fi

INSTALL_DIR_WIN_ESCAPED="$(cygpath -w "${INSTALL_DIR_UNIX}")"
ROOTFS_FILE_WIN="$(cygpath -w "${ROOTFS_FILE}")"

echo "==> Import: '${DISTRO_NAME}' -> ${INSTALL_DIR_WIN_ESCAPED}"
wsl.exe --import "${DISTRO_NAME}" "${INSTALL_DIR_WIN_ESCAPED}" "${ROOTFS_FILE_WIN}" --version 2

echo "==> Letoltott tar torlese (mar nincs ra szukseg)..."
rm -f "${ROOTFS_FILE}"

echo "==> Alapertelmezett felhasznalo letrehozasa: ${NEW_USER}"
wsl.exe -d "${DISTRO_NAME}" -u root -- bash -c "
  useradd -m -s /bin/bash -G sudo '${NEW_USER}' &&
  echo '${NEW_USER}:${NEW_USER}' | chpasswd &&
  echo '${NEW_USER} ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/90-${NEW_USER} &&
  printf '[user]\ndefault=%s\n' '${NEW_USER}' > /etc/wsl.conf
"

echo "==> Ujrainditas, hogy az alapertelmezett user ervenybe lepjen..."
wsl.exe --terminate "${DISTRO_NAME}"

echo ""
echo "KESZ. Inditas:  wsl -d ${DISTRO_NAME}"
echo "Alapertelmezett user: ${NEW_USER}  (jelszo: ${NEW_USER} - VALTOZTASD MEG!)"
echo "A meglevo Ubuntu disztroid erintetlen maradt."