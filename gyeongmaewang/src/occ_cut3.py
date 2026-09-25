# 사용: python3 occ_cut3.py 입력.png 출력폴더  — 가로 3컷(보통·화남·곤란)을 넓은 흰 틈으로 나눠 배경 제거
import sys, os, numpy as np
from PIL import Image
sys.path.insert(0,'.')
from cutlib import cut_bg, edge_seeds
src,od=sys.argv[1],sys.argv[2]; os.makedirs(od,exist_ok=True)
im=Image.open(src).convert('RGB'); a=np.array(im).astype(int)
white=(a.min(axis=2)>240).mean(axis=0)>0.995; W=len(white)
runs=[];x=0
while x<W:
    if white[x]:
        s=x
        while x<W and white[x]: x+=1
        runs.append((s,x))
    else: x+=1
cuts=[(s+e)//2 for s,e in runs if e-s>=60 and s>0 and e<W]
if len(cuts)!=2:   # 팔·빗자루가 옆 칸까지 뻗어 넓은 틈이 하나뿐 — 가장 넓은 틈 두 개로 나눈다
    inner=sorted([r for r in runs if r[0]>0 and r[1]<W and r[1]-r[0]>=6], key=lambda r:r[0]-r[1])[:2]
    cuts=sorted((s+e)//2 for s,e in inner)
bounds=[0]+cuts+[W]; assert len(bounds)==4, ('cuts',cuts)
for i,n in enumerate(['normal','angry','worried']):
    part=im.crop((bounds[i],0,bounds[i+1],im.height)); w,h=part.size
    rg=cut_bg(part, edge_seeds(w,h,True), 30); rg=rg.crop(rg.getchannel('A').getbbox())
    w,h=rg.size; cw=max(w, round(h*0.75)); can=Image.new('RGBA',(cw,h),(0,0,0,0)); can.alpha_composite(rg,((cw-w)//2,0))
    if can.height>1100: can=can.resize((round(can.width*1100/can.height),1100),Image.LANCZOS)
    can.save(f'{od}/{n}.webp','WEBP',quality=90); print(n,can.size)
ims=[Image.open(f'{od}/{n}.webp').convert('RGBA') for n in ['normal','angry','worried']]
H=500; ims=[i.resize((round(i.width*H/i.height),H)) for i in ims]
c=Image.new('RGBA',(sum(i.width for i in ims)+80,H+40),(40,44,60,255)); x=20
for i in ims: c.alpha_composite(i,(x,20)); x+=i.width+20
c.convert('RGB').save(f'{od}/_check.png')
