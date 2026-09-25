#!/bin/bash
cd /tmp/claude-0/-home-user--/faa03bfd-a6ff-592d-9719-8bb7d66ebf18/scratchpad/study
python3 build_standalone.py /tmp/gmwtest >/dev/null
OUT=${1:-reg65.txt}; rm -f $OUT
for t in t72 t71 t70 t69 t68 t67 t66 t65 t64 t63 t62 t52 t55 t57 t58e t56 t59 t61 t41 t43 t33 t40 t48 t50 t51 t54 t45 t49; do echo "== $t" >> $OUT; NODE_PATH=$(npm root -g) timeout 500 node $t.js 2>&1 | grep -E "❌|errors|Error|clicks|bad \[" | head -8 >> $OUT; done
echo "== contrast" >> $OUT; NODE_PATH=$(npm root -g) timeout 600 node contrast.js 2>&1 | tail -6 >> $OUT
echo "== audit" >> $OUT; NODE_PATH=$(npm root -g) timeout 900 node audit.js 2>&1 | grep -v "환경음\|🔊 소리" | grep -B1 "   -" >> $OUT
echo DONE >> $OUT; cat $OUT
