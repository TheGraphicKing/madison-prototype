#!/bin/sh
# Searches the source for anything the brief forbids. Prints hits; exits 1 if any.
hits=0
check() { r=$(grep -rnE "$1" src --include=*.ts --include=*.tsx --include=*.css 2>/dev/null | grep -v "check-forbidden-ok"); if [ -n "$r" ]; then echo "== $2"; echo "$r"; hits=1; fi; }
check "lucide|react-icons|heroicons|@tabler/icons|phosphor" "icon library"
check "gradient" "gradient"
check "backdrop-filter|backdrop-blur|blur\\(" "blur"
check "shadow-2xl|animate-pulse" "slop classes"
check "[0-9]+ ?%[^a-zA-Z0-9_)]*(covered|coverage)|coverage[^\\n]{0,40}[0-9]+ ?%" "coverage percentage"
r=$(find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.css" \) -exec perl -CSD -ne 'print "$ARGV:$.: $_" if /[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}\x{2B50}\x{2705}\x{FE0F}]/; close ARGV if eof' {} +); if [ -n "$r" ]; then echo "== emoji"; echo "$r"; hits=1; fi
grep -E '"(lucide-react|react-icons)"' package.json && hits=1
[ $hits = 0 ] && echo "No forbidden patterns."
exit $hits
