
/* ============================== 벡터 일러스트 얼굴 (가상 인물) ============================== */
let AV_UID = 0;
function avPortrait(a){
  const id = "av" + (++AV_UID);
  const sk = a.skin || "#e8b98f", skD = avShade(sk,.82), skL = avShade(sk,1.08), hc = a.hc || "#2a2320", hcD = avShade(hc,.7), hcL = avShade(hc,1.35);
  const fat = a.fat ? 1 : 0, old = a.age==="old" || a.wrinkle, fem = a.g==="f";
  const fw = fat ? 25 : (fem ? 21 : 22.5), fh = fem ? 25.5 : 26.5, cx = 50, cy = 47;
  const top = a.top || "#39424e", topD = avShade(top,.72), topL = avShade(top,1.18);
  const P = [];
  P.push(`<defs>
    <radialGradient id="${id}bg" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="${avShade(a.bg||"#e3e8f2",1.06)}"/><stop offset="1" stop-color="${avShade(a.bg||"#e3e8f2",.9)}"/></radialGradient>
    <radialGradient id="${id}sk" cx="45%" cy="38%" r="70%"><stop offset="0" stop-color="${skL}"/><stop offset=".72" stop-color="${sk}"/><stop offset="1" stop-color="${skD}"/></radialGradient>
    <linearGradient id="${id}hr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hcL}"/><stop offset="1" stop-color="${hcD}"/></linearGradient>
    <linearGradient id="${id}tp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${topL}"/><stop offset="1" stop-color="${topD}"/></linearGradient>
  </defs>`);
  P.push(`<rect width="100" height="100" fill="url(#${id}bg)"/>`);
  /* 긴 머리(뒤) */
  if(a.hair==="long") P.push(`<path d="M${cx-fw-3} 40 C${cx-fw-6} 70 ${cx-fw-2} 84 ${cx-fw+4} 88 L${cx+fw-4} 88 C${cx+fw+2} 84 ${cx+fw+6} 70 ${cx+fw+3} 40 C${cx+fw} 20 ${cx-fw} 20 ${cx-fw-3} 40Z" fill="url(#${id}hr)"/>`);
  /* 몸 */
  const sw = fat ? 46 : 40;
  const body = `M${50-sw} 100 C${50-sw+2} 80 ${50-16} 72 50 71 C${50+16} 72 ${50+sw-2} 80 ${50+sw} 100Z`;
  if(a.tank){
    P.push(`<path d="${body}" fill="url(#${id}sk)"/>`);
    P.push(`<path d="M${50-15} 100 L${50-13} 76 C${50-6} 79 ${50+6} 79 ${50+13} 76 L${50+15} 100Z" fill="${top}"/>`);
    if(a.tattoo){ P.push(`<g fill="none" stroke="#2f5d62" stroke-width="1.6" opacity=".85"><path d="M${50-sw+6} 92 c4 -6 9 -6 12 -1 c-4 3 -8 5 -12 1Z"/><path d="M${50-sw+9} 84 q5 -4 9 1"/><path d="M${50+sw-6} 92 c-4 -6 -9 -6 -12 -1 c4 3 8 5 12 1Z"/><path d="M${50+sw-9} 84 q-5 -4 -9 1"/><circle cx="${50-sw+14}" cy="96" r="2"/><circle cx="${50+sw-14}" cy="96" r="2"/></g>`); }
  } else {
    P.push(`<path d="${body}" fill="url(#${id}tp)"/>`);
    P.push(`<path d="M${50-8} 72 L50 82 L${50+8} 72" fill="none" stroke="${topD}" stroke-width="1.5"/>`);
    if(a.tattoo) P.push(`<path d="M${50-sw+8} 95 q4 -5 8 0" fill="none" stroke="#2f5d62" stroke-width="1.4"/>`);
  }
  if(a.vest){ P.push(`<path d="M${50-sw+3} 100 C${50-sw+5} 82 ${50-18} 74 ${50-11} 73 L${50-8} 100Z M${50+sw-3} 100 C${50+sw-5} 82 ${50+18} 74 ${50+11} 73 L${50+8} 100Z" fill="${a.vest}"/><path d="M${50-sw+6} 90 L${50-9} 90 M${50+sw-6} 90 L${50+9} 90" stroke="#f4f0c0" stroke-width="2.4"/>`); }
  /* 목 */
  P.push(`<path d="M${50-7} 62 L${50-7.5} 74 C${50-3} 77 ${50+3} 77 ${50+7.5} 74 L${50+7} 62Z" fill="${skD}"/>`);
  /* 귀 */
  P.push(`<ellipse cx="${cx-fw}" cy="50" rx="3.4" ry="5" fill="${sk}"/><ellipse cx="${cx+fw}" cy="50" rx="3.4" ry="5" fill="${sk}"/><path d="M${cx-fw-.8} 47.5 q-1.2 2.5 0 5" stroke="${skD}" fill="none" stroke-width=".9"/><path d="M${cx+fw+.8} 47.5 q1.2 2.5 0 5" stroke="${skD}" fill="none" stroke-width=".9"/>`);
  /* 얼굴 */
  const jaw = fat ? 7 : (fem ? 3 : 5);
  P.push(`<path d="M${cx-fw} ${cy-4} C${cx-fw} ${cy-fh-2} ${cx+fw} ${cy-fh-2} ${cx+fw} ${cy-4} C${cx+fw} ${cy+10} ${cx+fw-jaw} ${cy+fh-6} ${cx} ${cy+fh-1} C${cx-fw+jaw} ${cy+fh-6} ${cx-fw} ${cy+10} ${cx-fw} ${cy-4}Z" fill="url(#${id}sk)"/>`);
  if(fat) P.push(`<path d="M${cx-fw+4} ${cy+14} C${cx-10} ${cy+22} ${cx+10} ${cy+22} ${cx+fw-4} ${cy+14}" stroke="${skD}" fill="none" stroke-width="1" opacity=".6"/>`);
  /* 수염 */
  if(a.beard) P.push(`<path d="M${cx-fw+1} ${cy+2} C${cx-fw+2} ${cy+14} ${cx-8} ${cy+fh-2} ${cx} ${cy+fh-1} C${cx+8} ${cy+fh-2} ${cx+fw-2} ${cy+14} ${cx+fw-1} ${cy+2} C${cx+fw-5} ${cy+10} ${cx+6} ${cy+9} ${cx} ${cy+9} C${cx-6} ${cy+9} ${cx-fw+5} ${cy+10} ${cx-fw+1} ${cy+2}Z" fill="${hc}" opacity=".5"/><path d="M${cx-7} ${cy+8.5} C${cx-3} ${cy+6.5} ${cx+3} ${cy+6.5} ${cx+7} ${cy+8.5}" stroke="${hc}" stroke-width="2.2" fill="none" opacity=".75"/>`);
  /* 주름·볼 */
  if(old){ P.push(`<g stroke="${skD}" fill="none" stroke-width=".9" opacity=".8"><path d="M${cx-9} ${cy-15} q9 -2.5 18 0"/><path d="M${cx-7} ${cy-12} q7 -2 14 0"/><path d="M${cx-9} ${cy+5} q-2 5 1 9"/><path d="M${cx+9} ${cy+5} q2 5 -1 9"/><path d="M${cx-15} ${cy+2} l-2 1.5 M${cx+15} ${cy+2} l2 1.5"/></g>`); }
  if(fem || a.mouth==="smile") P.push(`<ellipse cx="${cx-11}" cy="${cy+6}" rx="4" ry="2.3" fill="#e0707a" opacity=".22"/><ellipse cx="${cx+11}" cy="${cy+6}" rx="4" ry="2.3" fill="#e0707a" opacity=".22"/>`);
  /* 눈 */
  const ey = cy + 1, ex = 8.5;
  [-1,1].forEach(s => {
    const x = cx + s*ex;
    P.push(`<ellipse cx="${x}" cy="${ey}" rx="3.8" ry="${a.brow==="sad"?2.1:2.5}" fill="#fbfaf7"/><circle cx="${x+.2}" cy="${ey+.2}" r="1.95" fill="#3b2618"/><circle cx="${x+.2}" cy="${ey+.2}" r="1" fill="#0d0907"/><circle cx="${x+.9}" cy="${ey-.6}" r=".55" fill="#fff"/>`);
    P.push(`<path d="M${x-4} ${ey-.4} Q${x} ${ey-3.6} ${x+4} ${ey-.4}" stroke="${avShade(sk,.55)}" stroke-width="1.1" fill="none"/>`);
    if(fem) P.push(`<path d="M${x+s*3.6} ${ey-1.2} l${s*1.4} -1" stroke="#2a1d17" stroke-width=".9"/>`);
    if(old) P.push(`<path d="M${x-3} ${ey+3.2} q3 1.6 6 0" stroke="${skD}" stroke-width=".8" fill="none"/>`);
  });
  /* 눈썹 */
  const bc = a.hc && avShade(a.hc,.85) || "#2a2320", bw = fem ? 1.3 : 2.1;
  [-1,1].forEach(s => { const x = cx + s*ex; let d;
    if(a.brow==="angry") d = `M${x - s*4.5} ${ey-6.5} Q${x} ${ey-6.8} ${x + s*3.8} ${ey-3.8}`;
    else if(a.brow==="sad") d = `M${x - s*4.5} ${ey-4.2} Q${x} ${ey-6.6} ${x + s*3.8} ${ey-6.8}`;
    else d = `M${x - s*4.5} ${ey-5.4} Q${x} ${ey-7.4} ${x + s*4} ${ey-5.8}`;
    P.push(`<path d="${d}" stroke="${a.hair==="bald"&&!fem?avShade(bc,1.2):bc}" stroke-width="${bw}" stroke-linecap="round" fill="none"/>`); });
  /* 코 */
  P.push(`<path d="M${cx-.5} ${ey+2} C${cx-1.5} ${ey+7} ${cx-3.6} ${ey+8.6} ${cx-2.2} ${ey+9.6} C${cx-1} ${ey+10.4} ${cx+1} ${ey+10.4} ${cx+2.4} ${ey+9.6}" stroke="${avShade(sk,.66)}" stroke-width="1.1" fill="none" stroke-linecap="round"/><ellipse cx="${cx}" cy="${ey+9}" rx="3.2" ry="1.4" fill="${skD}" opacity=".35"/>`);
  /* 입 */
  const my = cy + 16, lip = fem ? "#c4586a" : avShade(sk,.55);
  if(a.mouth==="smile") P.push(`<path d="M${cx-6} ${my-1} Q${cx} ${my+4.6} ${cx+6} ${my-1} Q${cx} ${my+1.4} ${cx-6} ${my-1}Z" fill="#7a2f2a"/><path d="M${cx-4.6} ${my-.2} Q${cx} ${my+1.8} ${cx+4.6} ${my-.2}" fill="#fff" opacity=".9"/><path d="M${cx-6.5} ${my-1.4} Q${cx} ${my+5} ${cx+6.5} ${my-1.4}" stroke="${lip}" stroke-width="1" fill="none"/>`);
  else if(a.mouth==="frown") P.push(`<path d="M${cx-5.5} ${my+1.8} Q${cx} ${my-2.4} ${cx+5.5} ${my+1.8}" stroke="${lip}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`);
  else if(a.mouth==="shout") P.push(`<ellipse cx="${cx}" cy="${my+.8}" rx="5" ry="3.8" fill="#4a1714"/><ellipse cx="${cx}" cy="${my+2.8}" rx="3.2" ry="1.6" fill="#c0505a"/><path d="M${cx-4} ${my-2.2} Q${cx} ${my-3} ${cx+4} ${my-2.2}" stroke="#fff" stroke-width="1.4" fill="none"/>`);
  else P.push(`<path d="M${cx-5} ${my} Q${cx} ${my+1} ${cx+5} ${my}" stroke="${lip}" stroke-width="1.7" fill="none" stroke-linecap="round"/>`);
  if(fem && a.mouth!=="shout") P.push(`<path d="M${cx-4} ${my+1.8} Q${cx} ${my+3.4} ${cx+4} ${my+1.8}" stroke="${lip}" stroke-width="1.2" fill="none" opacity=".6"/>`);
  /* 머리카락(앞) */
  const hf = `url(#${id}hr)`;
  const capTop = `M${cx-fw-1} ${cy-2} C${cx-fw-3} ${cy-fh-8} ${cx+fw+3} ${cy-fh-8} ${cx+fw+1} ${cy-2}`;
  if(a.hair==="short") P.push(`<path d="${capTop} C${cx+fw-2} ${cy-12} ${cx+12} ${cy-17} ${cx+2} ${cy-16} C${cx-8} ${cy-18} ${cx-fw+3} ${cy-12} ${cx-fw-1} ${cy-2}Z" fill="${hf}"/><path d="M${cx-8} ${cy-22} q8 -3 16 1" stroke="${hcL}" stroke-width="1" fill="none" opacity=".6"/>`);
  if(a.hair==="buzz") P.push(`<path d="${capTop} C${cx+fw-3} ${cy-15} ${cx+10} ${cy-19} ${cx} ${cy-19} C${cx-10} ${cy-19} ${cx-fw+3} ${cy-15} ${cx-fw-1} ${cy-2}Z" fill="${hc}" opacity=".78"/>`);
  if(a.hair==="bald") P.push(`<path d="M${cx-fw-1} ${cy+1} C${cx-fw-2} ${cy-8} ${cx-fw+1} ${cy-15} ${cx-fw+5} ${cy-17} C${cx-fw+2} ${cy-10} ${cx-fw+2} ${cy-5} ${cx-fw+1} ${cy+1}Z M${cx+fw+1} ${cy+1} C${cx+fw+2} ${cy-8} ${cx+fw-1} ${cy-15} ${cx+fw-5} ${cy-17} C${cx+fw-2} ${cy-10} ${cx+fw-2} ${cy-5} ${cx+fw-1} ${cy+1}Z" fill="${hf}"/><ellipse cx="${cx-5}" cy="${cy-18}" rx="6" ry="3" fill="#fff" opacity=".22"/>`);
  if(a.hair==="long"||a.hair==="bun") P.push(`<path d="${capTop} C${cx+fw} ${cy-14} ${cx+8} ${cy-20} ${cx-3} ${cy-17} C${cx-10} ${cy-15} ${cx-fw+2} ${cy-8} ${cx-fw-1} ${cy-2}Z" fill="${hf}"/>`);
  if(a.hair==="bun") P.push(`<circle cx="${cx}" cy="${cy-fh-6}" r="7" fill="${hf}"/><path d="M${cx-5} ${cy-fh-4} q5 3 10 0" stroke="${hcD}" fill="none"/>`);
  if(a.hair==="perm"){ const cs=[]; for(let i=0;i<15;i++){ const t = Math.PI*(0.92+ i/14*1.16); const r = fw+3; cs.push(`<circle cx="${(cx+Math.cos(t)*r).toFixed(1)}" cy="${(cy-3+Math.sin(t)*(fh+2)).toFixed(1)}" r="${4.6 - (i%3)*.5}" fill="${i%2?hc:hcL}"/>`); } P.push(`<path d="${capTop} C${cx+fw-2} ${cy-13} ${cx-fw+2} ${cy-13} ${cx-fw-1} ${cy-2}Z" fill="${hf}"/>` + cs.join("")); }
  if(a.hair==="cap"||a.hair==="helmet"||a.hat==="bucket"){
    if(a.hair==="cap"){ const c = a.cap||"#3c4452"; P.push(`<path d="M${cx-fw-2} ${cy-8} C${cx-fw-2} ${cy-fh-9} ${cx+fw+2} ${cy-fh-9} ${cx+fw+2} ${cy-8}Z" fill="${c}"/><path d="M${cx-fw-2} ${cy-8} C${cx-10} ${cy-4} ${cx+6} ${cy-5} ${cx+fw+8} ${cy-8} L${cx+fw+2} ${cy-9} C${cx+8} ${cy-10} ${cx-10} ${cy-10} ${cx-fw-2} ${cy-8}Z" fill="${avShade(c,.7)}"/><circle cx="${cx}" cy="${cy-fh-4}" r="1.4" fill="${avShade(c,.6)}"/>`); }
    if(a.hair==="helmet"){ P.push(`<path d="M${cx-fw-3} ${cy-7} C${cx-fw-3} ${cy-fh-12} ${cx+fw+3} ${cy-fh-12} ${cx+fw+3} ${cy-7}Z" fill="#f2c230"/><path d="M${cx-4} ${cy-fh-6} L${cx-4} ${cy-8} M${cx+4} ${cy-fh-6} L${cx+4} ${cy-8}" stroke="#d9a51a" stroke-width="2"/><path d="M${cx-fw-6} ${cy-7} L${cx+fw+6} ${cy-7}" stroke="#c9961a" stroke-width="3.2" stroke-linecap="round"/><ellipse cx="${cx-8}" cy="${cy-fh-3}" rx="5" ry="2.4" fill="#fff" opacity=".35"/>`); }
    if(a.hat==="bucket"){ const c = a.hatc||"#c9b48a"; P.push(`<path d="M${cx-fw+1} ${cy-10} C${cx-fw} ${cy-fh-8} ${cx+fw} ${cy-fh-8} ${cx+fw-1} ${cy-10}Z" fill="${c}"/><path d="M${cx-fw-7} ${cy-5} C${cx-fw-2} ${cy-11} ${cx+fw+2} ${cy-11} ${cx+fw+7} ${cy-5} C${cx+10} ${cy-8} ${cx-10} ${cy-8} ${cx-fw-7} ${cy-5}Z" fill="${avShade(c,.8)}"/><path d="M${cx-fw+1} ${cy-13} L${cx+fw-1} ${cy-13}" stroke="${avShade(c,.65)}" stroke-width="1.6"/>`); }
  }
  if(a.headband) P.push(`<path d="M${cx-fw-1} ${cy-12} C${cx-8} ${cy-16} ${cx+8} ${cy-16} ${cx+fw+1} ${cy-12}" stroke="#d23b3b" stroke-width="3.6" fill="none"/><path d="M${cx+fw} ${cy-12} l5 3 M${cx+fw} ${cy-12} l6 -1" stroke="#d23b3b" stroke-width="2.4"/>`);
  /* 안경 */
  if(a.glasses) P.push(`<g fill="none" stroke="#2d2d2d" stroke-width="1.2"><rect x="${cx-ex-5}" y="${ey-4}" width="10" height="7.4" rx="2.6"/><rect x="${cx+ex-5}" y="${ey-4}" width="10" height="7.4" rx="2.6"/><path d="M${cx-3.5} ${ey-1} q3.5 -2 7 0 M${cx-ex-5} ${ey-1} L${cx-fw} ${ey-2} M${cx+ex+5} ${ey-1} L${cx+fw} ${ey-2}"/></g><path d="M${cx-ex-3} ${ey-2.6} l3 -.6" stroke="#fff" opacity=".6"/>`);
  if(a.shades) P.push(`<g><path d="M${cx-ex-5.5} ${ey-3.8} L${cx-2} ${ey-3.8} L${cx-2.6} ${ey+1.6} C${cx-4} ${ey+4.4} ${cx-ex-4} ${ey+4.4} ${cx-ex-5.5} ${ey+1}Z M${cx+ex+5.5} ${ey-3.8} L${cx+2} ${ey-3.8} L${cx+2.6} ${ey+1.6} C${cx+4} ${ey+4.4} ${cx+ex+4} ${ey+4.4} ${cx+ex+5.5} ${ey+1}Z" fill="#131313"/><path d="M${cx-2} ${ey-3} L${cx+2} ${ey-3} M${cx-ex-5.5} ${ey-3} L${cx-fw} ${ey-3.5} M${cx+ex+5.5} ${ey-3} L${cx+fw} ${ey-3.5}" stroke="#131313" stroke-width="1.4"/><path d="M${cx-ex-3.4} ${ey-2.4} l3 2.6 M${cx+ex-1} ${ey-2.4} l3 2.6" stroke="#fff" stroke-width=".9" opacity=".5"/></g>`);
  /* 소품 */
  if(a.acc==="paper") P.push(`<g transform="rotate(-8 80 88)"><rect x="70" y="78" width="18" height="22" rx="1.5" fill="#fbfbfb" stroke="#c9cfd6"/><path d="M73 83 h12 M73 87 h12 M73 91 h8" stroke="#9aa4b0" stroke-width="1.2"/></g>`);
  if(a.acc==="phone") P.push(`<g transform="rotate(10 80 86)"><rect x="75" y="74" width="10" height="18" rx="2.2" fill="#1d1d1f"/><rect x="76.4" y="76" width="7.2" height="13" rx="1" fill="#5b8fb9"/></g>`);
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${P.join("")}</svg>`;
}
