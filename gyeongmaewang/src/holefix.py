# 사용: python3 holefix.py 폴더 — 사방이 막힌 큰 순백 구멍(인물 사이 틈)을 투명하게
import sys, numpy as np
from PIL import Image
from collections import deque
od=sys.argv[1]; MIN=int(sys.argv[2]) if len(sys.argv)>2 else 600
for n in ['normal','angry','worried']:
    im=Image.open(f'{od}/{n}.webp').convert('RGBA'); a=np.array(im)
    rgb=a[:,:,:3].astype(int); m=(rgb.min(axis=2)>243)&(a[:,:,3]>0)
    H,W=m.shape; seen=np.zeros_like(m); fixed=0
    for y in range(H):
        for x in range(W):
            if m[y,x] and not seen[y,x]:
                q=deque([(y,x)]); seen[y,x]=1; comp=[]
                while q:
                    cy,cx=q.popleft(); comp.append((cy,cx))
                    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                        ny,nx=cy+dy,cx+dx
                        if 0<=ny<H and 0<=nx<W and m[ny,nx] and not seen[ny,nx]: seen[ny,nx]=1; q.append((ny,nx))
                if len(comp)>=MIN:
                    ys,xs=zip(*comp); a[list(ys),list(xs),3]=0; fixed+=len(comp)
    Image.fromarray(a).save(f'{od}/{n}.webp','WEBP',quality=90); print(n,'구멍 제거 픽셀',fixed)
ims=[Image.open(f'{od}/{n}.webp').convert('RGBA') for n in ['normal','angry','worried']]
Hh=500; ims=[i.resize((round(i.width*Hh/i.height),Hh)) for i in ims]
c=Image.new('RGBA',(sum(i.width for i in ims)+80,Hh+40),(40,44,60,255)); x=20
for i in ims: c.alpha_composite(i,(x,20)); x+=i.width+20
c.convert('RGB').save(f'{od}/_check.png')
