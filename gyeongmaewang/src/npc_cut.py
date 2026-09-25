import sys, numpy as np
from PIL import Image
sys.path.insert(0,'.')
from cutlib import cut_bg, edge_seeds
# 사용: python3 npc_cut.py 입력.png 출력1.png [출력2.png ...]  (흰 여백으로 좌우 분리 → 배경 제거 → 3:4 캔버스)
src=sys.argv[1]; outs=sys.argv[2:]
im=Image.open(src).convert('RGB'); a=np.array(im).astype(int)
white=(a.min(axis=2)>240).mean(axis=0)>0.995
segs=[];x=0;W=len(white)
while x<W:
    if not white[x]:
        s=x
        while x<W and not white[x]: x+=1
        if x-s>40: segs.append((s,x))
    x+=1
assert len(segs)==len(outs), (segs, outs)
for (s,e),o in zip(segs,outs):
    part=im.crop((max(0,s-8),0,min(W,e+8),im.height))
    w,h=part.size
    rg=cut_bg(part, edge_seeds(w,h,True), 30)
    bb=rg.getchannel('A').getbbox(); rg=rg.crop(bb)
    w,h=rg.size; cw=max(w, round(h*0.75)); can=Image.new('RGBA',(cw,h),(0,0,0,0))
    can.alpha_composite(rg,((cw-w)//2,0)); can.save(o); print(o,can.size)
