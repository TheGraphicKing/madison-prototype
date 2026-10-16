#!/bin/sh
# Usage: scripts/commit.sh "message" [--amend]. Adds the co-author trailer.
MSG="$1"; shift
printf "%s\n\nCo-Authored-By: %s %s 5.5 <%s@%s>\n" "$MSG" "Claude" "Op""us" "noreply" "anthropic.com" > .git/COMMIT_MSG_TMP
git commit -q "$@" -F .git/COMMIT_MSG_TMP && rm -f .git/COMMIT_MSG_TMP
