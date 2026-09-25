# 박재훈 시트 자르기 — 표정 6칸 · 전신 앞/뒤 · 배경은 모서리에서 흘려 지우기(안쪽 밝은 색은 안 건드림)
from PIL import Image
import numpy as np
from collections import deque
def cut_bg(im, seeds, tol=26):
    a = np.array(im.convert('RGB')).astype(int); h, w, _ = a.shape
    mask = np.zeros((h, w), bool); q = deque()
    for (x, y) in seeds:
        if not mask[y, x]: mask[y, x] = True; q.append((x, y))
    ref = np.median(np.array([a[y, x] for x, y in seeds]), axis=0)
    while q:
        x, y = q.popleft()
        for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
            if 0 <= nx < w and 0 <= ny < h and not mask[ny, nx]:
                c = a[ny, nx]
                if np.abs(c - ref).max() <= tol: mask[ny, nx] = True; q.append((nx, ny))
    rgba = np.dstack([a.astype(np.uint8), np.where(mask, 0, 255).astype(np.uint8)])
    return Image.fromarray(rgba, 'RGBA')
def edge_seeds(w, h, bottom=True, step=6):
    s = [(x, 0) for x in range(0, w, step)] + [(0, y) for y in range(0, h, step)] + [(w-1, y) for y in range(0, h, step)]
    if bottom: s += [(x, h-1) for x in range(0, w, step)]
    return s
