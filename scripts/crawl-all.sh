#!/bin/sh
# Every route, every persona, at 1470x704 and 1440x900: two passes at a time.
run() { node scripts/click-crawl.mjs http://localhost:4321 $1 $2 > docs/iteration-3/f42/crawl/$1-$2.txt 2>&1; tail -1 docs/iteration-3/f42/crawl/$1-$2.txt | head -1; grep "clicks ·" docs/iteration-3/f42/crawl/$1-$2.txt; }
for size in 1470x704 1440x900; do
  for group in "u-elena u-anthony" "u-priya u-grace" "u-margaret u-hannah" "u-nadia u-ravi"; do
    for p in $group; do run $size $p & done
    wait
  done
done
