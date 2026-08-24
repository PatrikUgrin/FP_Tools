#!/bin/bash
cd "$(dirname "$0")"
chmod +x "$0" 2>/dev/null || true

# Finder-launched scripts get a tiny PATH. Pick up Homebrew, official Node, nvm, volta, fnm.
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.volta/bin:$PATH"

export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
	# shellcheck disable=SC1090
	. "$NVM_DIR/nvm.sh"
fi

if command -v fnm >/dev/null 2>&1; then
	eval "$(fnm env)"
fi

if ! command -v node >/dev/null 2>&1; then
	echo "Node.js is required for the baker."
	echo "Install the LTS build from https://nodejs.org then double-click Bake.command again."
	echo
	read -r -p "Press Return to close this window..."
	exit 1
fi

node "scripts/start-baker.js"
status=$?

echo
echo "Baker stopped."
read -r -p "Press Return to close this window..."
exit "$status"
