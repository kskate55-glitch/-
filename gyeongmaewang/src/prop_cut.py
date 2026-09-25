import sys, numpy as np
from PIL import Image
from scipy import ndimage
from cutlib import cut_bg, edge_seeds
# 사용: python3 prop_cut.py 시트.png 행수 열수 이름1 이름2 ...  → props/이름.png (512×512, 투명, 가운데)
src,R,C=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]); names=sys.argv[4:]
im=Image.open(src).convert('RGB'); a=np.array(im).astype(int)
ink=a.min(axis=2)<235
lab,n=ndimage.label(ndimage.binary_dilation(ink,iterations=14))
objs=ndimage.find_objects(lab)
areas=[(ink[o].sum(),i,o) for i,o in enumerate(objs)]
areas=sorted(areas,reverse=True)[:R*C]
boxes=[o for _,_,o in areas]
cy=lambda o:(o[0].start+o[0].stop)/2; cx=lambda o:(o[1].start+o[1].stop)/2
boxes.sort(key=cy); rows=[sorted(boxes[r*C:(r+1)*C],key=cx) for r in range(R)]
import os; os.makedirs('props',exist_ok=True)
for o,nm in zip([b for r in rows for b in r],names):
    y0,y1,x0,x1=o[0].start,o[0].stop,o[1].start,o[1].stop
    part=im.crop((max(0,x0-6),max(0,y0-6),min(im.width,x1+6),min(im.height,y1+6)))
    w,h=part.size; rg=cut_bg(part,edge_seeds(w,h,True,3),28); ra=np.array(rg); hole=(ra[...,:3].min(axis=2)>248)&(ra[...,3]>0)
    hl,hn=ndimage.label(hole)
    for k in range(1,hn+1):
        m=hl==k
        if m.sum()>150: ra[m,3]=0
    rg=Image.fromarray(ra,'RGBA'); rg=rg.crop(rg.getchannel('A').getbbox())
    s=440/max(rg.size); rg=rg.resize((max(1,round(rg.width*s)),max(1,round(rg.height*s))),Image.NEAREST if s>=1 else Image.LANCZOS)
    can=Image.new('RGBA',(512,512),(0,0,0,0)); can.alpha_composite(rg,((512-rg.width)//2,(512-rg.height)//2)); can.save(f'props/{nm}.png'); print(nm,(x0,y0,x1,y1))
