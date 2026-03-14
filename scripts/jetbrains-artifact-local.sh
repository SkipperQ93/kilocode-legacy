#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NODE_VERSION="${NODE_VERSION:-20.20.0}"
PNPM_VERSION="${PNPM_VERSION:-10.8.1}"

echo "==> JetBrains local artifact build"
echo "root: $ROOT_DIR"
echo "node target: $NODE_VERSION"
echo "pnpm target: $PNPM_VERSION"

if [[ -f "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then
	# shellcheck disable=SC1090
	source "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
	if nvm ls "$NODE_VERSION" >/dev/null 2>&1; then
		nvm use "$NODE_VERSION" >/dev/null
	elif nvm ls 20 >/dev/null 2>&1; then
		nvm use 20 >/dev/null
	else
		echo "warning: nvm Node $NODE_VERSION not installed; using current Node $(node -v)"
	fi
fi

if [[ -x /usr/libexec/java_home ]]; then
	JAVA_21_HOME="$(/usr/libexec/java_home -v 21 2>/dev/null || true)"
	if [[ -n "$JAVA_21_HOME" ]]; then
		if ! java -version 2>&1 | grep -qE '"21(\.|")'; then
			export JAVA_HOME="$JAVA_21_HOME"
		fi
		export PATH="$JAVA_HOME/bin:$PATH"
	fi
fi

mkdir -p .corepack .turbo
export COREPACK_HOME="$ROOT_DIR/.corepack"

if ! node -v | grep -qE '^v20\.'; then
	echo "error: Node 20.x is required; current: $(node -v)"
	exit 1
fi

if ! java -version 2>&1 | grep -qE '"21(\.|")'; then
	echo "error: Java 21 is required for JetBrains build"
	java -version
	exit 1
fi

echo "==> Ensuring pnpm@$PNPM_VERSION via corepack"
corepack prepare "pnpm@$PNPM_VERSION" --activate

echo "==> Installing dependencies"
corepack pnpm install

if [[ -n "${KILOCODE_POSTHOG_API_KEY:-}" ]]; then
	echo "==> Writing KILOCODE_POSTHOG_API_KEY to .env"
	echo "KILOCODE_POSTHOG_API_KEY=${KILOCODE_POSTHOG_API_KEY}" >> .env
fi

echo "==> Building JetBrains plugin bundle"
corepack pnpm run jetbrains:bundle

echo "==> Resolving bundle name"
BUNDLE_NAME="$(node jetbrains/plugin/scripts/get_bundle_name.js)"
BUNDLE_PATH="jetbrains/plugin/build/distributions/${BUNDLE_NAME}"

if [[ ! -f "$BUNDLE_PATH" ]]; then
	echo "error: bundle missing at $BUNDLE_PATH"
	exit 1
fi

echo "success: built $BUNDLE_PATH"
