/* scenes.js — flat-vector scene illustrations (pure inline SVG).
   SCENES[key](id) -> '<svg viewBox="0 0 320 170">…'  (all ids prefixed with `id`)
   caseSceneKey(c) -> key      sceneHTML(key, uid?) -> '<div class="scene">…</div>' */
(function (root) {
'use strict';
const SKIN = ['#f3cfae', '#e3aa7c', '#c07f55', '#8d5a3b', '#f7dcc4'];
const HAIR = ['#2b2320', '#4a3226', '#1d1d24', '#7a4a2a', '#b8b2aa'];

function lg(id, n, a, b, x2, y2) {
  return `<linearGradient id="${id}${n}" x1="0" y1="0" x2="${x2 == null ? 0 : x2}" y2="${y2 == null ? 1 : y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
}
function rg(id, n, a, op) {
  return `<radialGradient id="${id}${n}"><stop offset="0" stop-color="${a}" stop-opacity="${op == null ? 1 : op}"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient>`;
}
function svg(id, top, bot, defs, body) {
  return `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg" width="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs>${lg(id, 'bg', top, bot)}<filter id="${id}sh" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#1c2740" flood-opacity=".2"/></filter>${defs}</defs><rect width="320" height="170" fill="url(#${id}bg)"/>${body}</svg>`;
}
const U = (id, n) => `url(#${id}${n})`;
const SH = id => `filter="url(#${id}sh)"`;
function cloud(x, y, s, op) {
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="#fff" opacity="${op || .85}"><ellipse cx="0" cy="6" rx="22" ry="7"/><circle cx="-8" cy="1" r="8"/><circle cx="5" cy="-2" r="10"/><circle cx="15" cy="3" r="6"/></g>`;
}
function tree(x, y, s, c1, c2) {
  return `<g transform="translate(${x} ${y}) scale(${s || 1})"><ellipse cx="0" cy="0" rx="13" ry="3" fill="#000" opacity=".12"/><rect x="-2.5" y="-18" width="5" height="18" rx="2" fill="#8a5a3a"/><circle cx="0" cy="-30" r="15" fill="${c1 || '#5fae6b'}"/><circle cx="-8" cy="-24" r="9" fill="${c2 || '#4c9a5b'}"/><circle cx="6" cy="-37" r="7" fill="#7cc585" opacity=".8"/></g>`;
}
function plant(x, y, s) {
  return `<g transform="translate(${x} ${y}) scale(${s || 1})"><path d="M-7 0h14l-2-12h-10z" fill="#c9764a"/><rect x="-8" y="-13" width="16" height="3" rx="1.5" fill="#b0643c"/><path d="M0-13c-2-10-10-12-12-18 7 1 11 7 12 12 1-9 5-16 11-19-1 8-6 14-9 22M0-13c3-6 9-8 13-7-3 4-8 6-11 8" fill="#58a96a"/></g>`;
}
/* person: x,y feet centre; s scale (1 ≈ 72px tall). o: skin,shirt,pants,hair,style(short|long|bun|bald|cap),la,ra (arm rotation deg),face,cap */
function person(x, y, s, o) {
  o = o || {};
  const sk = o.skin || SKIN[0], sh = o.shirt || '#4f7bd6', pa = o.pants || '#2f3a55', ha = o.hair || HAIR[0];
  const la = o.la || 8, ra = o.ra == null ? -8 : o.ra;
  const st = o.style || 'short';
  let hair = '';
  if (st === 'short') hair = `<path d="M-10.5-68c0-9 5-13 10.5-13s10.5 4 10.5 13c-3-5-7-6-10-6-4 0-8 2-11 6z" fill="${ha}"/>`;
  else if (st === 'long') hair = `<path d="M-11-66c0-10 5-15 11-15s11 5 11 15v14c-3 2-5 2-6 0v-12c-3-4-7-5-10-5s-6 1-9 5v12c-1 2-4 2-7 0z" fill="${ha}"/>`;
  else if (st === 'bun') hair = `<circle cx="0" cy="-82" r="5" fill="${ha}"/><path d="M-10.5-68c0-9 5-13 10.5-13s10.5 4 10.5 13c-4-4-7-5-10.5-5s-7 1-10.5 5z" fill="${ha}"/>`;
  else if (st === 'cap') hair = `<path d="M-11-70c0-8 5-12 11-12s11 4 11 12z" fill="${o.cap || '#e2574c'}"/><rect x="-2" y="-72" width="18" height="3.5" rx="1.7" fill="${o.cap || '#e2574c'}"/>`;
  else if (st === 'bald') hair = `<path d="M-10-66c0-3 1-5 2-6M10-66c0-3-1-5-2-6" stroke="${ha}" stroke-width="3" stroke-linecap="round"/>`;
  const face = o.face === false ? '' : `<circle cx="-3.6" cy="-67" r="1.15" fill="#2a2320"/><circle cx="3.6" cy="-67" r="1.15" fill="#2a2320"/><path d="M-3-62.5q3 2.4 6 0" stroke="#8a4a3a" stroke-width="1.1" fill="none" stroke-linecap="round"/><circle cx="-6.5" cy="-63.5" r="1.8" fill="#f08a7a" opacity=".35"/><circle cx="6.5" cy="-63.5" r="1.8" fill="#f08a7a" opacity=".35"/>`;
  const arm = (side, a) => {
    const sx = side * 13;
    return `<g transform="rotate(${a} ${sx} -53)"><rect x="${sx - 2.8}" y="-55" width="5.6" height="24" rx="2.8" fill="${sh}"/><rect x="${sx - 2.8}" y="-55" width="2" height="22" rx="1" fill="#fff" opacity=".12"/><circle cx="${sx}" cy="-30" r="3.2" fill="${sk}"/></g>`;
  };
  return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="0" rx="15" ry="3.2" fill="#1c2740" opacity=".16"/>` +
    `<rect x="-8" y="-31" width="7" height="30" rx="3" fill="${pa}"/><rect x="1" y="-31" width="7" height="30" rx="3" fill="${pa}"/>` +
    `<ellipse cx="-4.5" cy="-1" rx="5" ry="2.4" fill="#2b2b33"/><ellipse cx="4.5" cy="-1" rx="5" ry="2.4" fill="#2b2b33"/>` +
    arm(-1, la) + arm(1, ra) +
    `<path d="M-12-49q0-8 8-8h8q8 0 8 8v21h-24z" fill="${sh}"/><path d="M-12-49q0-8 8-8h2v29h-10z" fill="#fff" opacity=".1"/>` +
    (o.vest ? `<path d="M-11-50v22h7v-27zM11-50v22h-7v-27z" fill="${o.vest}"/><rect x="-11" y="-40" width="22" height="2.4" fill="#fff" opacity=".8"/>` : '') +
    `<rect x="-3" y="-61" width="6" height="6" fill="${sk}"/><rect x="-3" y="-58" width="6" height="2" fill="#000" opacity=".08"/>` +
    `<circle cx="0" cy="-68" r="10.5" fill="${sk}"/>${hair}${face}${o.extra || ''}</g>`;
}
function box(x, y, w, h, c) {
  c = c || '#d9a066';
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="${c}"/><rect x="${x}" y="${y}" width="${w}" height="${h * .22}" fill="#fff" opacity=".18"/><rect x="${x + w / 2 - 3}" y="${y}" width="6" height="${h}" fill="#f4dcae" opacity=".7"/><rect x="${x}" y="${y + h - 3}" width="${w}" height="3" fill="#000" opacity=".1"/></g>`;
}
function ground(id, y, a, b) {
  return `<rect x="0" y="${y}" width="320" height="${170 - y}" fill="${U(id, 'gr')}"/>`;
}

const SCENES = {
villa(id) {
  let win = '';
  for (let f = 0; f < 3; f++) for (let c = 0; c < 3; c++) {
    const x = 104 + c * 38, y = 38 + f * 27;
    win += `<rect x="${x}" y="${y}" width="24" height="17" rx="1.5" fill="${U(id, 'gl')}"/><path d="M${x + 12} ${y}v17" stroke="#fff" stroke-opacity=".7" stroke-width="1.2"/><path d="M${x + 2} ${y + 14}l8-12" stroke="#fff" stroke-opacity=".45" stroke-width="2"/><rect x="${x - 2}" y="${y + 15}" width="28" height="4" rx="1" fill="#6f7c8f"/>`;
  }
  return svg(id, '#bfe3f7', '#fdf1dd', lg(id, 'gr', '#a8d58f', '#7fbf73') + lg(id, 'wl', '#f1c59d', '#dc9c6f') + lg(id, 'gl', '#7fc0ec', '#3f86c9') + lg(id, 'sd', '#e2b489', '#c98659', 1, 0) + rg(id, 'sun', '#fff7c2', .95),
    `<circle cx="276" cy="30" r="34" fill="${U(id, 'sun')}"/><circle cx="276" cy="30" r="12" fill="#ffe69a"/>${cloud(50, 30, 1.1)}${cloud(250, 60, .7, .7)}` +
    `<path d="M0 132q80-14 160-6t160-4v48H0z" fill="${U(id, 'gr')}"/>` +
    `<g ${SH(id)}><rect x="92" y="26" width="136" height="110" rx="2" fill="${U(id, 'wl')}"/><rect x="228" y="30" width="16" height="106" fill="${U(id, 'sd')}"/><path d="M86 26h164l-8-9H94z" fill="#8b5a44"/><rect x="86" y="24" width="164" height="4" rx="1" fill="#a86e53"/></g>` +
    `<g opacity=".18">${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<path d="M92 ${34 + i * 13}h136" stroke="#8a4b2c" stroke-width=".7"/>`).join('')}</g>` + win +
    `<rect x="92" y="116" width="136" height="20" fill="#4d4f5c"/><rect x="92" y="114" width="136" height="3" fill="#b88763"/>${[98, 140, 182, 222].map(x => `<rect x="${x}" y="117" width="4" height="19" fill="#b9bcc6"/>`).join('')}` +
    `<g transform="translate(104 121)"><rect width="30" height="12" rx="4" fill="#e45b4e"/><path d="M5 0l4-5h12l4 5z" fill="#e45b4e"/><path d="M10-4h10l3 4H8z" fill="#bfe3f7"/><circle cx="7" cy="12" r="3" fill="#222"/><circle cx="23" cy="12" r="3" fill="#222"/></g>` +
    `<rect x="190" y="118" width="22" height="18" rx="1" fill="#8a5a3a"/><rect x="192" y="120" width="18" height="16" fill="${U(id, 'gl')}" opacity=".7"/><text x="201" y="112" font-family="sans-serif" font-size="6" text-anchor="middle" fill="#fff" font-weight="700">VILLA</text>` +
    tree(62, 138, 1.1) + tree(270, 140, .9, '#6bb974', '#529e5f') + `<path d="M0 150h320v20H0z" fill="#d8cdb8"/><path d="M0 150h320" stroke="#fff" stroke-width="1" opacity=".6"/>`);
},
door_notice(id) {
  return svg(id, '#f4ead9', '#e8d8bf', lg(id, 'dr', '#8c5a3c', '#6b3f28', 1, 0) + lg(id, 'pp', '#ffffff', '#f3efe6') + lg(id, 'fl', '#cdb898', '#b59e7d') + rg(id, 'lt', '#fff6d6', .8),
    `<ellipse cx="160" cy="0" rx="150" ry="70" fill="${U(id, 'lt')}"/><rect x="0" y="146" width="320" height="24" fill="${U(id, 'fl')}"/>` +
    `<rect x="96" y="14" width="128" height="134" rx="3" fill="#d9c7aa"/><g ${SH(id)}><rect x="104" y="20" width="112" height="128" rx="2" fill="${U(id, 'dr')}"/></g>` +
    `<rect x="114" y="30" width="92" height="46" rx="2" fill="none" stroke="#5a331f" stroke-width="1.5" opacity=".6"/><rect x="114" y="86" width="92" height="52" rx="2" fill="none" stroke="#5a331f" stroke-width="1.5" opacity=".6"/><rect x="104" y="20" width="8" height="128" fill="#fff" opacity=".08"/>` +
    `<g ${SH(id)}><rect x="190" y="84" width="16" height="30" rx="3" fill="#2d3038"/><rect x="193" y="88" width="10" height="14" rx="1.5" fill="#1a1c22"/>${[0, 1, 2].map(r => [0, 1].map(c => `<circle cx="${196 + c * 4}" cy="${91 + r * 4}" r=".9" fill="#7ad0ff"/>`).join('')).join('')}<rect x="186" y="104" width="22" height="5" rx="2.5" fill="#b9bcc6"/></g>` +
    `<rect x="148" y="6" width="24" height="10" rx="2" fill="#3c4150"/><text x="160" y="14" font-family="sans-serif" font-size="7" fill="#fff" text-anchor="middle" font-weight="700">302</text>` +
    `<g transform="rotate(-4 146 60)" ${SH(id)}><rect x="124" y="40" width="46" height="58" rx="1" fill="${U(id, 'pp')}"/><rect x="124" y="40" width="46" height="9" fill="#e75a4f"/><text x="147" y="47.5" font-family="sans-serif" font-size="6.5" fill="#fff" text-anchor="middle" font-weight="700">안내</text>${[56, 62, 68, 74, 80].map((y, i) => `<rect x="129" y="${y}" width="${[34, 30, 36, 26, 20][i]}" height="2" rx="1" fill="#b8b3a8"/>`).join('')}<circle cx="162" cy="89" r="5" fill="none" stroke="#e75a4f" stroke-width="1.2"/><rect x="120" y="37" width="14" height="6" fill="#f3e3a6" opacity=".85" transform="rotate(-30 127 40)"/><rect x="160" y="37" width="14" height="6" fill="#f3e3a6" opacity=".85" transform="rotate(30 167 40)"/></g>` +
    `<rect x="110" y="147" width="100" height="10" rx="3" fill="#7a6a58"/><rect x="112" y="148" width="96" height="2" fill="#fff" opacity=".15"/>` +
    `<g transform="translate(236 150)"><path d="M0 0q0-8 8-8h6q4 0 6 3l8 3q4 2 0 4H0z" fill="#e45b4e"/><path d="M34 0q0-8 8-8h6q4 0 6 3l8 3q4 2 0 4H34z" fill="#3f6fc7"/></g>` + plant(62, 148, 1.3) +
    `<g transform="translate(40 36)"><rect width="30" height="22" rx="2" fill="#fff" ${SH(id)}/><rect x="3" y="3" width="24" height="16" fill="#a7d3ef"/><path d="M3 19l9-9 6 6 4-4 5 7z" fill="#6aa96a"/></g>`);
},
phone_chat(id) {
  return svg(id, '#efe6ff', '#fde8ef', lg(id, 'ph', '#3a3f52', '#1f2230') + lg(id, 'sc', '#dfe9f5', '#cbd9ea') + rg(id, 'gl', '#b9a7ff', .6),
    `<circle cx="160" cy="85" r="80" fill="${U(id, 'gl')}"/>` +
    `<g opacity=".7"><circle cx="40" cy="40" r="4" fill="#ffb3c7"/><circle cx="286" cy="130" r="6" fill="#a8c6ff"/><circle cx="270" cy="30" r="3" fill="#ffd27a"/></g>` +
    `<g transform="rotate(-6 160 85)"><g ${SH(id)}><rect x="118" y="10" width="84" height="152" rx="14" fill="${U(id, 'ph')}"/></g><rect x="123" y="18" width="74" height="136" rx="9" fill="${U(id, 'sc')}"/><rect x="146" y="13" width="28" height="4" rx="2" fill="#111"/>` +
    `<rect x="123" y="18" width="74" height="16" rx="9" fill="#fff"/><rect x="123" y="26" width="74" height="8" fill="#fff"/><circle cx="133" cy="26" r="4" fill="#ffb07a"/><rect x="140" y="23" width="26" height="3" rx="1.5" fill="#3a3f52"/><rect x="140" y="28" width="16" height="2" rx="1" fill="#9aa3b5"/>` +
    `<rect x="128" y="40" width="44" height="14" rx="6" fill="#fff"/><rect x="132" y="44" width="34" height="2" rx="1" fill="#9aa3b5"/><rect x="132" y="48" width="24" height="2" rx="1" fill="#9aa3b5"/>` +
    `<rect x="146" y="60" width="46" height="18" rx="6" fill="#ffe14f"/><rect x="150" y="64" width="36" height="2" rx="1" fill="#6a5a10"/><rect x="150" y="68" width="30" height="2" rx="1" fill="#6a5a10"/><rect x="150" y="72" width="20" height="2" rx="1" fill="#6a5a10"/>` +
    `<rect x="128" y="84" width="38" height="14" rx="6" fill="#fff"/><rect x="132" y="88" width="28" height="2" rx="1" fill="#9aa3b5"/><rect x="132" y="92" width="18" height="2" rx="1" fill="#9aa3b5"/>` +
    `<rect x="156" y="104" width="36" height="12" rx="6" fill="#ffe14f"/><rect x="160" y="109" width="26" height="2" rx="1" fill="#6a5a10"/>` +
    `<rect x="128" y="122" width="24" height="11" rx="5.5" fill="#fff"/><circle cx="134" cy="127.5" r="1.6" fill="#9aa3b5"/><circle cx="140" cy="127.5" r="1.6" fill="#b8c0cf"/><circle cx="146" cy="127.5" r="1.6" fill="#d0d6e0"/>` +
    `<rect x="126" y="140" width="68" height="10" rx="5" fill="#fff"/><circle cx="187" cy="145" r="3.5" fill="#ffe14f"/></g>` +
    `<g ${SH(id)} transform="translate(214 36)"><rect width="62" height="22" rx="10" fill="#fff"/><path d="M8 22l-2 7 9-7z" fill="#fff"/><circle cx="12" cy="11" r="5" fill="#8fd18f"/><rect x="21" y="7" width="32" height="3" rx="1.5" fill="#6d7486"/><rect x="21" y="12" width="22" height="2.4" rx="1.2" fill="#b0b7c6"/></g>` +
    `<g ${SH(id)} transform="translate(40 96)"><rect width="58" height="22" rx="10" fill="#fff"/><path d="M50 22l3 7-10-7z" fill="#fff"/><path d="M10 11l4 4 8-8" stroke="#3aa76d" stroke-width="2.2" fill="none" stroke-linecap="round"/><rect x="26" y="8" width="24" height="3" rx="1.5" fill="#6d7486"/><rect x="26" y="13" width="16" height="2.4" rx="1.2" fill="#b0b7c6"/></g>` +
    `<g transform="translate(62 44)"><circle r="12" fill="#ff6b81"/><text y="4" font-family="sans-serif" font-size="11" fill="#fff" text-anchor="middle" font-weight="700">3</text></g>`);
},
court(id) {
  return svg(id, '#cfe4f5', '#f6efe2', lg(id, 'st', '#f5f1ea', '#d9d1c3') + lg(id, 'cl', '#ffffff', '#d7d0c4', 1, 0) + lg(id, 'gv', '#a8683f', '#6b3d22') + lg(id, 'gr', '#cfe0b9', '#b3cc99'),
    `${cloud(60, 28, 1)}${cloud(250, 22, .8, .7)}<rect x="0" y="136" width="320" height="34" fill="${U(id, 'gr')}"/>` +
    `<g ${SH(id)}><path d="M62 48L150 18l88 30z" fill="${U(id, 'st')}"/><rect x="66" y="48" width="168" height="8" fill="#e3dbcd"/><rect x="70" y="56" width="160" height="66" fill="#efe9de"/>` +
    [0, 1, 2, 3, 4, 5].map(i => `<rect x="${80 + i * 26}" y="58" width="12" height="62" fill="${U(id, 'cl')}"/><rect x="${78 + i * 26}" y="56" width="16" height="4" fill="#d8cfbf"/><rect x="${78 + i * 26}" y="118" width="16" height="4" fill="#d8cfbf"/>`).join('') +
    `<rect x="60" y="122" width="180" height="6" fill="#ddd4c4"/><rect x="54" y="128" width="192" height="6" fill="#cfc5b3"/><rect x="48" y="134" width="204" height="6" fill="#c2b7a3"/></g>` +
    `<circle cx="150" cy="38" r="7" fill="#e9c46a"/><path d="M145 38h10M150 33v10" stroke="#8a6a20" stroke-width="1.2"/><path d="M143 40q7 5 14 0" stroke="#8a6a20" fill="none" stroke-width="1"/>` +
    `<rect x="143" y="96" width="14" height="26" rx="7" fill="#5a4636"/>` +
    `<g transform="translate(256 132)" ${SH(id)}><rect x="-26" y="0" width="52" height="10" rx="3" fill="${U(id, 'gv')}"/><rect x="-26" y="0" width="52" height="3" rx="1.5" fill="#fff" opacity=".2"/><g transform="rotate(-32)"><rect x="-4" y="-44" width="8" height="40" rx="3" fill="#8a5330"/><rect x="-16" y="-58" width="32" height="16" rx="5" fill="${U(id, 'gv')}"/><rect x="-16" y="-54" width="32" height="3" fill="#e9c46a"/><rect x="-16" y="-49" width="32" height="3" fill="#e9c46a"/></g></g>` +
    `<g transform="translate(30 138)"><rect x="-2" y="-58" width="3" height="58" fill="#9aa3b5"/><path d="M1-58h26l-4 7 4 7H1z" fill="#3f6fc7"/></g>`);
},
bailiff(id) {
  return svg(id, '#e7ecf3', '#d7dde6', lg(id, 'wl', '#eef1f6', '#d5dbe5') + lg(id, 'fl', '#bfc6d2', '#a3acba') + lg(id, 'dr', '#5d6b82', '#3f4a5e', 1, 0),
    `<rect width="320" height="120" fill="${U(id, 'wl')}"/><rect y="120" width="320" height="50" fill="${U(id, 'fl')}"/><path d="M0 120h320" stroke="#fff" opacity=".6"/>` +
    `<rect x="38" y="24" width="64" height="96" fill="#2e3544"/><g ${SH(id)}><path d="M38 24l30 6v96l-30-6z" fill="${U(id, 'dr')}"/></g><circle cx="63" cy="76" r="2.5" fill="#c9ccd4"/><rect x="42" y="30" width="56" height="88" fill="#ffe7b0" opacity=".25"/>` +
    `<rect x="60" y="10" width="24" height="9" rx="2" fill="#3c4150"/><text x="72" y="17" font-family="sans-serif" font-size="6.5" fill="#fff" text-anchor="middle">201</text>` +
    box(250, 94, 30, 26, '#d49a5e') + box(262, 72, 24, 22, '#e2ad72') + box(284, 100, 26, 20) +
    person(128, 150, 1.05, { skin: SKIN[1], shirt: '#2f3a55', pants: '#232a3d', hair: HAIR[0], la: -30, extra: `<g transform="translate(-19 -44) rotate(-8)"><rect width="14" height="18" rx="1.5" fill="#f4efe6"/><rect x="4" y="-2" width="6" height="3" rx="1" fill="#9aa3b5"/><path d="M3 5h8M3 9h8M3 13h5" stroke="#9aa3b5" stroke-width="1.2"/></g>` }) +
    person(178, 152, 1.1, { skin: SKIN[3], shirt: '#46536e', pants: '#2a3142', hair: HAIR[2], vest: '#f0a53a', la: 6, ra: -6 }) +
    person(224, 150, 1.0, { skin: SKIN[0], shirt: '#6c8f5e', pants: '#3a3a3a', style: 'cap', cap: '#3f6fc7', ra: -20, extra: `<g transform="translate(14 -34)"><rect width="18" height="11" rx="2" fill="#d6453a"/><rect x="5" y="-4" width="8" height="5" rx="2" fill="none" stroke="#8a2a22" stroke-width="1.5"/><rect y="4" width="18" height="2" fill="#000" opacity=".15"/></g>` }));
},
moving_truck(id) {
  return svg(id, '#cfeaff', '#fff4e0', lg(id, 'gr', '#c9c9c9', '#a9a9ad') + lg(id, 'cg', '#ffffff', '#e4e8ef') + lg(id, 'cb', '#4f86e0', '#2f5fb8'),
    `${cloud(70, 26, 1)}${cloud(230, 34, .8, .75)}<path d="M0 120h320v50H0z" fill="${U(id, 'gr')}"/><path d="M0 150h320" stroke="#fff" stroke-width="2" stroke-dasharray="14 10" opacity=".7"/>` +
    `<g ${SH(id)}><rect x="96" y="54" width="124" height="68" rx="4" fill="${U(id, 'cg')}"/><rect x="96" y="54" width="124" height="6" rx="3" fill="#f6b243"/><path d="M220 72h30q8 0 12 8l10 18v24h-52z" fill="${U(id, 'cb')}"/></g>` +
    `<path d="M226 78h22l10 18h-32z" fill="#bfe3f7"/><path d="M230 80l6 14" stroke="#fff" stroke-width="2" opacity=".6"/><rect x="266" y="108" width="8" height="5" rx="1.5" fill="#ffe8a0"/><rect x="92" y="118" width="186" height="6" rx="3" fill="#3a3f52"/>` +
    [124, 190, 246].map(x => `<circle cx="${x}" cy="126" r="11" fill="#2b2e38"/><circle cx="${x}" cy="126" r="5" fill="#c9ccd4"/>`).join('') +
    `<path d="M114 72h60M114 82h40" stroke="#c9d3e1" stroke-width="3" stroke-linecap="round"/><path d="M186 74l10 8 16-16" stroke="#3aa76d" stroke-width="4" fill="none" stroke-linecap="round"/>` +
    box(26, 104, 34, 30) + box(32, 82, 26, 22, '#e5b47a') + box(62, 112, 26, 22, '#caa06c') +
    person(76, 150, 1, { skin: SKIN[2], shirt: '#e2574c', style: 'cap', cap: '#2f3a55', la: -60, ra: 60, extra: box(-12, -52, 24, 18, '#dcae76') }));
},
keys_handover(id) {
  return svg(id, '#fff1dc', '#ffe0cc', lg(id, 'sl', '#4f7bd6', '#3a5fb0', 1, 0) + lg(id, 'sr', '#f08a5d', '#d8683f', 1, 0) + lg(id, 'ky', '#ffd97a', '#d9a634') + rg(id, 'gl', '#ffffff', .9),
    `<circle cx="160" cy="80" r="74" fill="${U(id, 'gl')}"/>` +
    `<g opacity=".25" transform="translate(160 64)"><path d="M-40 10l40-34 40 34v42h-80z" fill="#f0a870"/><rect x="-10" y="26" width="20" height="26" fill="#fff"/></g>` +
    `<g ${SH(id)}><path d="M-10 118l92-18q8-1 12 6l4 10-96 22z" fill="${U(id, 'sl')}"/><path d="M82 100q14-6 26-2l16 6q5 3 2 7l-8 2 8 4q4 3 0 7l-24 2q-10 0-16-6z" fill="${SKIN[0]}"/><path d="M104 106l14 4" stroke="#c9906a" stroke-width="1.4" stroke-linecap="round"/></g>` +
    `<g ${SH(id)}><path d="M330 70l-92 14q-8 2-11 9l-3 9 96-6z" fill="${U(id, 'sr')}"/><path d="M228 86q-14-4-26 1l-14 8q-4 3-1 7l8 1-6 5q-3 4 2 6l22-2q10-2 15-8z" fill="${SKIN[3]}"/><path d="M204 92l-12 5" stroke="#6b4228" stroke-width="1.4" stroke-linecap="round"/></g>` +
    `<g transform="translate(160 84)"><circle r="11" fill="none" stroke="#c7ccd6" stroke-width="3"/><g ${SH(id)} transform="rotate(35)"><circle cx="0" cy="18" r="8" fill="${U(id, 'ky')}"/><circle cx="0" cy="18" r="3" fill="#fff1dc"/><rect x="-2.5" y="26" width="5" height="26" rx="1" fill="${U(id, 'ky')}"/><path d="M2.5 38h5v3h-5zM2.5 44h7v3h-7z" fill="#d9a634"/></g><g transform="rotate(-25)"><rect x="-8" y="10" width="16" height="22" rx="3" fill="#e75a4f"/><circle cy="14" r="2" fill="#fff"/><path d="M-4 20h8M-4 24h6" stroke="#fff" stroke-width="1.4"/></g></g>` +
    `<g fill="#ffb347"><path d="M150 36l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><path d="M186 50l1.4 3.5 3.5 1.4-3.5 1.4-1.4 3.5-1.4-3.5-3.5-1.4 3.5-1.4z"/></g>`);
},
contract(id) {
  return svg(id, '#d9b48a', '#b98b5f', lg(id, 'pp', '#ffffff', '#f1ece2') + lg(id, 'pn', '#2f3a55', '#141a2a', 1, 0) + lg(id, 'st', '#d44a3a', '#962a20') + lg(id, 'cp', '#ffffff', '#dfe4ec'),
    `<g opacity=".12">${[0, 1, 2, 3, 4, 5].map(i => `<path d="M0 ${20 + i * 30}q160 ${i % 2 ? 8 : -8} 320 0" stroke="#5a3a1a" stroke-width="3" fill="none"/>`).join('')}</g>` +
    `<g ${SH(id)} transform="rotate(-5 140 86)"><rect x="80" y="14" width="118" height="146" rx="2" fill="${U(id, 'pp')}"/><text x="139" y="34" font-family="sans-serif" font-size="11" text-anchor="middle" fill="#2f3a55" font-weight="700">합의서</text><rect x="116" y="38" width="46" height="1.5" fill="#2f3a55"/>${[50, 58, 66, 74, 82, 90, 98].map((y, i) => `<rect x="92" y="${y}" width="${[94, 88, 94, 70, 94, 80, 60][i]}" height="2.4" rx="1.2" fill="#c3c8d2"/>`).join('')}<rect x="92" y="118" width="40" height="1.2" fill="#9aa3b5"/><rect x="146" y="118" width="40" height="1.2" fill="#9aa3b5"/><path d="M96 114q6-8 10 0t10-2 8 2" stroke="#3a4a8a" stroke-width="1.3" fill="none"/><circle cx="170" cy="112" r="9" fill="none" stroke="#d44a3a" stroke-width="2" opacity=".85"/><path d="M165 110h10M168 114h4" stroke="#d44a3a" stroke-width="1.6" opacity=".85"/></g>` +
    `<g ${SH(id)} transform="translate(230 118)"><ellipse cx="0" cy="18" rx="16" ry="4" fill="#000" opacity=".15"/><rect x="-10" y="-30" width="20" height="46" rx="6" fill="${U(id, 'st')}"/><rect x="-12" y="12" width="24" height="8" rx="2" fill="#7a2018"/><rect x="-7" y="-26" width="4" height="36" rx="2" fill="#fff" opacity=".25"/><circle cx="0" cy="-30" r="10" fill="${U(id, 'st')}"/></g>` +
    `<g ${SH(id)} transform="translate(228 54) rotate(38)"><rect x="-5" y="-40" width="10" height="72" rx="5" fill="${U(id, 'pn')}"/><rect x="-5" y="-14" width="10" height="4" fill="#e9c46a"/><path d="M-5 32l5 14 5-14z" fill="#c9ccd4"/><rect x="3" y="-36" width="3" height="22" rx="1.5" fill="#e9c46a"/></g>` +
    `<g transform="translate(40 128)"><ellipse cx="0" cy="18" rx="22" ry="5" fill="#000" opacity=".15"/><path d="M-16-10h32v22q0 8-8 8h-16q-8 0-8-8z" fill="${U(id, 'cp')}"/><path d="M16-4h5q6 0 6 6t-6 6h-5" stroke="#dfe4ec" stroke-width="3.5" fill="none"/><ellipse cx="0" cy="-10" rx="16" ry="4" fill="#6b3d22"/><path d="M-5-20q3-4 0-8M4-22q3-4 0-8" stroke="#fff" stroke-width="1.6" fill="none" opacity=".7" stroke-linecap="round"/></g>`);
},
money(id) {
  const bill = (x, y, r, c1, c2) => `<g transform="translate(${x} ${y}) rotate(${r})" ${SH(id)}><rect x="-34" y="-16" width="68" height="32" rx="3" fill="${c1}"/><rect x="-30" y="-12" width="60" height="24" rx="2" fill="none" stroke="${c2}" stroke-width="1.2"/><circle cx="12" cy="0" r="8" fill="${c2}" opacity=".35"/><rect x="-26" y="-6" width="18" height="3" rx="1.5" fill="${c2}"/><rect x="-26" y="1" width="12" height="3" rx="1.5" fill="${c2}"/></g>`;
  return svg(id, '#e8f6ec', '#d8efe0', lg(id, 'cc', '#454b5e', '#2a2e3b') + lg(id, 'co', '#ffe08a', '#d6a232') + rg(id, 'gl', '#ffffff', .9),
    `<circle cx="140" cy="90" r="80" fill="${U(id, 'gl')}"/>` +
    bill(110, 118, -8, '#f0b24a', '#b67a18') + bill(118, 104, 6, '#8fcf8a', '#3e8a4a') + bill(104, 88, -4, '#f0b24a', '#b67a18') +
    `<g ${SH(id)} transform="translate(206 42)"><rect width="60" height="92" rx="8" fill="${U(id, 'cc')}"/><rect x="7" y="8" width="46" height="20" rx="3" fill="#bfe7c9"/><text x="49" y="23" font-family="monospace" font-size="11" fill="#1f4a2b" text-anchor="end">1,500</text>${[0, 1, 2, 3].map(r => [0, 1, 2].map(c => `<rect x="${8 + c * 15}" y="${36 + r * 13}" width="12" height="9" rx="2" fill="${c === 2 && r === 3 ? '#f08a5d' : '#6a7186'}"/>`).join('')).join('')}</g>` +
    [[46, 132], [60, 138], [52, 124], [66, 128]].map(([x, y]) => `<g ${SH(id)}><ellipse cx="${x}" cy="${y}" rx="10" ry="4" fill="#b8841f"/><ellipse cx="${x}" cy="${y - 2}" rx="10" ry="4" fill="${U(id, 'co')}"/><ellipse cx="${x}" cy="${y - 2}" rx="5" ry="2" fill="none" stroke="#b8841f" stroke-width="1"/></g>`).join('') +
    `<g transform="translate(280 30)"><circle r="14" fill="#3aa76d"/><text y="5" font-family="sans-serif" font-size="14" fill="#fff" text-anchor="middle" font-weight="700">₩</text></g><path d="M20 60l18-14 12 8 20-22" stroke="#3aa76d" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/>`);
},
interior(id) {
  return svg(id, '#f7efe4', '#efe3d2', lg(id, 'wp', '#b9d7c9', '#9ec3b2') + lg(id, 'fl', '#d4a878', '#b8895a') + lg(id, 'wn', '#bfe6ff', '#8fcaf0'),
    `<rect x="0" y="0" width="160" height="128" fill="${U(id, 'wp')}"/><g opacity=".25">${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<circle cx="${10 + i * 20}" cy="${20 + (i % 2) * 20}" r="3" fill="#fff"/><circle cx="${10 + i * 20}" cy="${70 + (i % 2) * 20}" r="3" fill="#fff"/>`).join('')}</g>` +
    `<path d="M160 0v128" stroke="#8fb3a2" stroke-width="2"/><path d="M160 0h26v70q-8 10-26 6z" fill="#cfe4d9" opacity=".9"/>` +
    `<rect x="0" y="128" width="320" height="42" fill="${U(id, 'fl')}"/><path d="M0 128h320" stroke="#8a6440" stroke-width="2"/><path d="M0 142h320M0 156h320" stroke="#a37a4f" opacity=".4"/>` +
    `<g ${SH(id)}><rect x="212" y="22" width="70" height="56" rx="2" fill="#fff"/><rect x="217" y="27" width="60" height="46" fill="${U(id, 'wn')}"/><path d="M247 27v46M217 50h60" stroke="#fff" stroke-width="2"/></g>` +
    `<path d="M20 150h120l10 20H10z" fill="#e8e3da" opacity=".85"/>` +
    `<g ${SH(id)}><path d="M190 158l18-110M226 158l-10-110" stroke="#c9a26a" stroke-width="5" stroke-linecap="round"/>${[60, 80, 100, 120, 140].map(y => `<path d="M${208 - (y - 48) * 0.16} ${y}h${(216 - (y - 48) * 0.09) - (208 - (y - 48) * 0.16) + ((y - 48) * 0.16 - (y - 48) * 0.09)}" stroke="#b58b52" stroke-width="3"/>`).join('')}</g>` +
    person(211, 92, .82, { skin: SKIN[1], shirt: '#f6f6f6', pants: '#5a7bb0', style: 'cap', cap: '#f0a53a', ra: -150, extra: `<g transform="translate(22 -104)"><rect x="-1.5" y="0" width="3" height="18" fill="#6a7186"/><rect x="-12" y="-8" width="24" height="9" rx="4" fill="#7fc4a8"/></g>` }) +
    `<g ${SH(id)} transform="translate(92 138)"><path d="M-12-16h24l-3 20h-18z" fill="#6aa6d8"/><ellipse cx="0" cy="-16" rx="12" ry="3" fill="#dfeaf2"/><path d="M-10-24q10-10 20 0" stroke="#555" fill="none" stroke-width="1.5"/></g>` +
    `<g transform="translate(40 134)"><rect x="-14" y="-8" width="28" height="8" rx="4" fill="#9ec3b2"/><rect x="-1.5" y="0" width="3" height="16" fill="#6a7186" transform="rotate(20)"/></g>` +
    `<g transform="translate(290 110)" ${SH(id)}><rect x="-14" y="0" width="28" height="18" rx="3" fill="#e45b4e"/><rect x="-6" y="-4" width="12" height="5" rx="2" fill="none" stroke="#9a2d24" stroke-width="2"/></g>`);
},
realtor(id) {
  const card = (x, y, c) => `<g><rect x="${x}" y="${y}" width="22" height="26" rx="1.5" fill="#fff"/><path d="M${x + 4} ${y + 12}l7-6 7 6v6h-14z" fill="${c}"/><rect x="${x + 4}" y="${y + 20}" width="14" height="1.6" fill="#9aa3b5"/><rect x="${x + 4}" y="${y + 3}" width="10" height="2" fill="#e75a4f"/></g>`;
  return svg(id, '#d5ecfb', '#fbf1e2', lg(id, 'wl', '#f6e7d2', '#e8d2b4') + lg(id, 'gl', '#cfe8f7', '#9cc9e6') + lg(id, 'aw', '#2f9e6a', '#1f7a50') + lg(id, 'gr', '#d8d2c6', '#c2b9aa'),
    `<rect x="0" y="140" width="320" height="30" fill="${U(id, 'gr')}"/><g ${SH(id)}><rect x="26" y="20" width="268" height="122" fill="${U(id, 'wl')}"/></g>` +
    `<rect x="36" y="26" width="248" height="24" rx="3" fill="#fff"/><text x="92" y="44" font-family="sans-serif" font-size="15" font-weight="800" fill="#1f7a50">공인중개사</text><g transform="translate(60 38)"><path d="M-10 4l10-9 10 9v8h-20z" fill="#2f9e6a"/><rect x="-3" y="6" width="6" height="6" fill="#fff"/></g>` +
    `<path d="M30 54h260l-8 14H38z" fill="${U(id, 'aw')}"/>${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `<path d="M${38 + i * 28} 68q14 8 28 0" fill="${i % 2 ? '#1f7a50' : '#fff'}" opacity=".85"/>`).join('')}` +
    `<rect x="40" y="76" width="160" height="62" rx="2" fill="${U(id, 'gl')}"/>` + [0, 1, 2, 3, 4, 5].map(i => card(46 + i * 25, 82, ['#f08a5d', '#4f7bd6', '#2f9e6a', '#e9c46a', '#b07ad8', '#e75a4f'][i])).join('') + [0, 1, 2, 3, 4].map(i => card(58 + i * 25, 110, ['#4f7bd6', '#e9c46a', '#f08a5d', '#2f9e6a', '#e75a4f'][i])).join('') +
    `<path d="M44 78l40 58M110 78l40 58" stroke="#fff" stroke-width="5" opacity=".25"/>` +
    `<rect x="212" y="76" width="64" height="64" fill="#6b4a36"/><rect x="218" y="82" width="52" height="58" fill="${U(id, 'gl')}" opacity=".8"/><circle cx="262" cy="112" r="2" fill="#e9c46a"/>` +
    plant(206, 140, 1.1) + person(292, 158, .95, { skin: SKIN[4], shirt: '#b07ad8', pants: '#3a3f52', style: 'long', hair: HAIR[1], la: 10, ra: 20 }));
},
buyer_couple(id) {
  return svg(id, '#fff8ec', '#f5e8d4', lg(id, 'fl', '#e4c49a', '#c9a171') + lg(id, 'wn', '#d8f0ff', '#a4d6f5') + lg(id, 'bm', '#fff3c4', '#fff3c4', 1, 1),
    `<rect x="0" y="0" width="320" height="120" fill="#fbf4e8"/><rect x="0" y="120" width="320" height="50" fill="${U(id, 'fl')}"/><path d="M0 120h320" stroke="#b58b5a" stroke-width="2"/>${[0, 1, 2, 3, 4, 5, 6].map(i => `<path d="M${i * 54} 120l-20 50" stroke="#b58b5a" opacity=".25"/>`).join('')}` +
    `<g ${SH(id)}><rect x="30" y="16" width="96" height="84" rx="2" fill="#fff"/><rect x="36" y="22" width="84" height="72" fill="${U(id, 'wn')}"/></g><path d="M78 22v72M36 58h84" stroke="#fff" stroke-width="3"/><path d="M40 90q20-30 40-10t36-16v30H40z" fill="#9fd08e" opacity=".8"/>` +
    `<path d="M36 94L10 170h150l-40-76z" fill="#fff3c4" opacity=".45"/>` +
    `<rect x="250" y="44" width="40" height="30" rx="2" fill="#f0a870" opacity=".3"/><path d="M262 64l6-8 6 5 5-6 7 9z" fill="#f08a5d" opacity=".6"/>` +
    person(170, 150, 1.12, { skin: SKIN[0], shirt: '#f08a5d', pants: '#3f6fc7', style: 'long', hair: HAIR[1], ra: -130 }) +
    person(206, 152, 1.18, { skin: SKIN[2], shirt: '#2f9e6a', pants: '#2f3a55', hair: HAIR[0], la: 20 }) +
    person(270, 150, 1.05, { skin: SKIN[4], shirt: '#46536e', pants: '#2a3142', style: 'bun', hair: HAIR[2], la: -40, extra: `<g transform="translate(-22 -48) rotate(-10)"><rect width="14" height="18" rx="1.5" fill="#fff"/><rect x="4" y="-2" width="6" height="3" rx="1" fill="#9aa3b5"/><path d="M3 5l2 2 3-3M3 11l2 2 3-3" stroke="#3aa76d" stroke-width="1.2" fill="none"/></g>` }) +
    `<g fill="#ff7b8a" opacity=".85"><path d="M188 58c-3-4-9-1-6 4l6 6 6-6c3-5-3-8-6-4z"/></g>`);
},
factory_containers(id) {
  const cont = (x, y, w, c1, c2) => `<g ${SH(id)}><rect x="${x}" y="${y}" width="${w}" height="24" rx="1" fill="${c1}"/><rect x="${x + 1}" y="${y + 2}" width="${w - 2}" height="20" fill="url(#${id}rib)" opacity=".35"/><rect x="${x}" y="${y}" width="${w}" height="3" fill="#fff" opacity=".18"/><rect x="${x + w - 7}" y="${y + 4}" width="1.5" height="16" fill="#333" opacity=".4"/></g>`;
  return svg(id, '#d9e6f2', '#f2ede4', lg(id, 'gr', '#b9b4aa', '#9c968b') + lg(id, 'wh', '#cfd6df', '#aab4c1') + `<pattern id="${id}rib" width="5" height="20" patternUnits="userSpaceOnUse"><rect width="2" height="20" fill="#000"/></pattern>`,
    `${cloud(270, 22, .8, .7)}<g ${SH(id)}><path d="M20 58l40-22 40 22 40-22 40 22v48H20z" fill="${U(id, 'wh')}"/></g><rect x="30" y="72" width="20" height="30" fill="#6e7a8c"/><rect x="118" y="72" width="30" height="30" fill="#6e7a8c"/><rect x="200" y="30" width="10" height="76" fill="#8a94a3"/><path d="M200 30l6-14h6l-2 14z" fill="#8a94a3"/><g opacity=".4" fill="#eee"><circle cx="210" cy="10" r="6"/><circle cx="220" cy="4" r="4"/></g>` +
    `<rect x="0" y="104" width="320" height="66" fill="${U(id, 'gr')}"/><path d="M0 104h320" stroke="#fff" opacity=".4"/>` +
    cont(18, 128, 70, '#d9534a', '#8f2c25') + cont(92, 128, 70, '#3f7fcf', '#244f8a') + cont(166, 128, 70, '#2f9e6a', '#1f6a46') + cont(240, 128, 64, '#e9a23b', '#9a6618') +
    cont(40, 104, 70, '#e9a23b', '#9a6618') + cont(114, 104, 70, '#d9534a', '#8f2c25') + cont(190, 104, 70, '#6b6fd0', '#3f428a') +
    cont(80, 80, 70, '#2f9e6a', '#1f6a46') + cont(154, 80, 60, '#3f7fcf', '#244f8a') +
    `<g opacity=".85">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `<rect x="${i * 36}" y="152" width="3" height="18" fill="#6a7186"/>`).join('')}<path d="M0 156h320M0 164h320" stroke="#6a7186" stroke-width="1.2"/></g>` +
    person(292, 154, .8, { skin: SKIN[3], shirt: '#f0a53a', pants: '#2f3a55', style: 'cap', cap: '#fff', la: -30 }));
},
cold_storage(id) {
  return svg(id, '#cfeaff', '#9fcbef', lg(id, 'sh', '#e9f5ff', '#c3def5') + lg(id, 'dr', '#f4fbff', '#cfe3f3', 1, 0) + rg(id, 'mi', '#ffffff', .8),
    `<rect x="0" y="130" width="320" height="40" fill="#8ab8e0"/><path d="M0 130h320" stroke="#fff" stroke-opacity=".6"/>` +
    [0, 1, 2].map(r => `<rect x="14" y="${34 + r * 32}" width="150" height="4" rx="1" fill="#7aa9d2"/>` + [0, 1, 2, 3, 4].map(c => box(20 + c * 28, 34 + r * 32 - 22, 24, 22, ['#e8b27a', '#d9a066', '#f0c28e'][(r + c) % 3])).join('')).join('') +
    `<rect x="14" y="10" width="4" height="120" fill="#6c9cc6"/><rect x="160" y="10" width="4" height="120" fill="#6c9cc6"/>` +
    `<g ${SH(id)}><rect x="190" y="18" width="104" height="112" rx="4" fill="${U(id, 'dr')}"/></g><rect x="196" y="24" width="92" height="100" rx="3" fill="none" stroke="#a9c9e4" stroke-width="2"/><rect x="274" y="60" width="8" height="30" rx="4" fill="#6a7186"/><path d="M196 34h92M196 114h92" stroke="#dcecf8" stroke-width="3"/>` +
    `<g transform="translate(232 64)"><rect x="-12" y="-18" width="24" height="36" rx="12" fill="#fff" ${SH(id)}/><rect x="-2" y="-12" width="4" height="22" rx="2" fill="#d6e6f3"/><rect x="-2" y="2" width="4" height="8" fill="#3f86c9"/><circle cy="12" r="5" fill="#3f86c9"/><text y="-22" font-family="sans-serif" font-size="8" fill="#3f86c9" text-anchor="middle" font-weight="700">-18°</text></g>` +
    `<g fill="#fff" opacity=".9">${[[40, 8], [110, 14], [300, 142], [180, 150], [70, 148]].map(([x, y]) => `<g transform="translate(${x} ${y})"><path d="M0-5v10M-4.3-2.5l8.6 5M-4.3 2.5l8.6-5" stroke="#fff" stroke-width="1.4"/></g>`).join('')}</g>` +
    `<path d="M0 0h320v6q-10 6-20 0t-20 2-20-2-20 4-20-4-20 2-20-2-20 4-20-4-20 2-20-2-20 4-20-4-20 2-20-2-20 4-20-4z" fill="#fff" opacity=".85"/>` +
    person(176, 156, .9, { skin: SKIN[1], shirt: '#3f6fc7', pants: '#2f3a55', style: 'cap', cap: '#e45b4e', extra: `<ellipse cx="14" cy="-66" rx="6" ry="3.5" fill="${U(id, 'mi')}"/><rect x="-12" y="-52" width="24" height="5" rx="2.5" fill="#e45b4e"/>` }));
},
machines(id) {
  const mach = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})"><g ${SH(id)}><rect x="0" y="0" width="110" height="86" rx="6" fill="${c}"/><rect x="0" y="0" width="110" height="12" rx="6" fill="#fff" opacity=".2"/></g><rect x="10" y="16" width="62" height="54" rx="4" fill="#1f2a3a"/><rect x="14" y="20" width="54" height="46" rx="3" fill="#2f4057"/><rect x="36" y="20" width="10" height="22" fill="#9aa3b5"/><path d="M38 42h6l-3 8z" fill="#d6dbe3"/><rect x="22" y="56" width="38" height="6" fill="#6a7186"/><path d="M16 22l14 40" stroke="#fff" stroke-width="4" opacity=".1"/><g fill="#ffcf5a"><circle cx="42" cy="52" r="1"/><circle cx="47" cy="50" r=".8"/><circle cx="37" cy="51" r=".8"/></g><rect x="78" y="16" width="24" height="18" rx="2" fill="#0f1a24"/><rect x="80" y="18" width="20" height="10" fill="#3fd18a" opacity=".85"/>${[0, 1, 2].map(r => [0, 1, 2].map(c => `<circle cx="${82 + c * 7}" cy="${42 + r * 7}" r="2.2" fill="${r === 2 && c === 2 ? '#e45b4e' : '#c9ccd4'}"/>`).join('')).join('')}<rect x="0" y="74" width="110" height="12" rx="2" fill="#3a3f52"/><rect x="104" y="-14" width="4" height="14" fill="#6a7186"/><circle cx="106" cy="-18" r="4" fill="#3fd18a"/></g>`;
  return svg(id, '#e9edf2', '#d4dae3', lg(id, 'fl', '#aeb6c2', '#8e97a5'),
    `<rect x="0" y="0" width="320" height="20" fill="#cfd5de"/>${[0, 1, 2, 3].map(i => `<rect x="${20 + i * 80}" y="4" width="50" height="6" rx="3" fill="#fff" opacity=".9"/>`).join('')}<rect x="0" y="126" width="320" height="44" fill="${U(id, 'fl')}"/>` +
    mach(186, 58, .78, '#5e8fc4') + mach(28, 40, 1, '#e9a23b') +
    `<g>${Array.from({ length: 16 }, (_, i) => `<path d="M${i * 22} 150l10-10h11l-10 10z" fill="${i % 2 ? '#2b2e38' : '#f5c542'}"/>`).join('')}</g>` +
    person(160, 138, .9, { skin: SKIN[2], shirt: '#46536e', pants: '#2a3142', style: 'cap', cap: '#f5c542', la: -40, extra: `<rect x="-6" y="-72" width="12" height="4" rx="2" fill="#9ad3ff" opacity=".7"/>` }));
},
cars_abandoned(id) {
  const car = (x, y, c, r, s) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s || 1})"><ellipse cx="0" cy="12" rx="38" ry="4" fill="#000" opacity=".18"/><path d="M-36 8v-10q0-6 6-7l10-2 8-10q4-4 10-4h16q6 0 10 5l8 9 8 2q6 2 6 8v9z" fill="${c}"/><path d="M-10-2l7-9h12v9zM12-2v-9h6l8 9z" fill="#b7cfe0"/><path d="M-4-10l6 7" stroke="#fff" opacity=".4" stroke-width="2"/><rect x="-36" y="4" width="72" height="3" fill="#000" opacity=".15"/><circle cx="-22" cy="9" r="7" fill="#2b2e38"/><circle cx="-22" cy="9" r="3" fill="#8a8f9a"/><circle cx="22" cy="10" r="6" fill="#2b2e38"/><ellipse cx="22" cy="14" rx="7" ry="2.5" fill="#2b2e38"/><circle cx="-4" cy="-6" r="2" fill="#7a5a30" opacity=".5"/><circle cx="10" cy="-4" r="3" fill="#7a5a30" opacity=".4"/><rect x="0" y="-9" width="7" height="5" fill="#ffe14f" transform="rotate(6)"/></g>`;
  return svg(id, '#f6e9cf', '#e9d9b8', lg(id, 'gr', '#c4b38a', '#a8966c'),
    `${cloud(50, 26, .9, .6)}<path d="M0 60q60-20 120-6t110-8 90 6v28H0z" fill="#b9c79b" opacity=".6"/><rect x="0" y="80" width="320" height="90" fill="${U(id, 'gr')}"/>` +
    `<g opacity=".8">${Array.from({ length: 12 }, (_, i) => `<rect x="${i * 28}" y="62" width="3" height="28" fill="#8a7a5a"/>`).join('')}<path d="M0 68h320M0 80h320" stroke="#8a7a5a" stroke-width="1.2"/></g>` +
    car(70, 108, '#8fa7bf', -2, .95) + car(230, 104, '#c47b6a', 3, .9) + car(150, 138, '#d9c26a', 0, 1.1) +
    `<g fill="#6f9b4c">${[[20, 150], [110, 160], [196, 158], [290, 148], [36, 118], [270, 126]].map(([x, y]) => `<path d="M${x} ${y}l-4-12 5 8 2-14 3 13 5-9-3 14z"/>`).join('')}</g>` +
    `<g transform="translate(296 104)"><rect x="-1.5" y="0" width="3" height="30" fill="#6a7186"/><rect x="-14" y="-12" width="28" height="16" rx="2" fill="#fff" ${SH(id)}/><path d="M-9-6h18M-9-2h12" stroke="#e45b4e" stroke-width="2"/></g>`);
},
grave_land(id) {
  const mound = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="2" rx="26" ry="5" fill="#000" opacity=".15"/><path d="M-24 2q2-20 24-20t24 20z" fill="#79b35f"/><path d="M-18-4q8-12 18-12" stroke="#a6d38b" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="-5" y="-4" width="10" height="7" rx="1" fill="#cfcac0"/><rect x="-3" y="-14" width="6" height="11" rx="1" fill="#e2ded6"/></g>`;
  const pine = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-2" y="-10" width="4" height="10" fill="#7a4e30"/><path d="M0-44l-12 18h6l-9 12h7l-8 10h32l-8-10h7l-9-12h6z" fill="#3e8a57"/><path d="M0-44l-4 10 8 6-6 8 8 10" stroke="#5aa870" fill="none" stroke-width="2" opacity=".6"/></g>`;
  return svg(id, '#cfe6f6', '#fbf1dc', lg(id, 'm1', '#9cc7a6', '#7fae8a') + lg(id, 'm2', '#b7d69c', '#8fbc74') + rg(id, 'sun', '#fff2b8', .9),
    `<circle cx="258" cy="36" r="30" fill="${U(id, 'sun')}"/>${cloud(80, 28, .9, .8)}` +
    `<path d="M0 80l50-40 40 24 60-44 70 50 50-26 50 30v96H0z" fill="${U(id, 'm1')}" opacity=".7"/>` +
    `<path d="M0 112q70-44 170-30t150 6v82H0z" fill="${U(id, 'm2')}"/>` +
    pine(28, 104, .9) + pine(52, 98, .7) + pine(292, 102, .95) + pine(270, 96, .7) +
    mound(132, 118, 1) + mound(178, 112, .9) + mound(214, 124, 1.05) +
    `<path d="M40 170q60-30 90-40t60-2 60 12" stroke="#e6d6b0" stroke-width="7" fill="none" opacity=".9" stroke-linecap="round"/>` +
    `<g transform="translate(96 150)"><rect x="-1.5" y="-24" width="3" height="24" fill="#8a6440"/><rect x="-12" y="-30" width="24" height="10" rx="1.5" fill="#fff" ${SH(id)}/><rect x="-8" y="-26.5" width="16" height="2.4" rx="1" fill="#e45b4e"/></g>` +
    person(262, 156, .8, { skin: SKIN[0], shirt: '#8a6a4f', pants: '#3a3f52', style: 'cap', cap: '#3f6fc7', la: -40 }));
},
multi_family(id) {
  const room = (x, y, w, c, inner) => `<rect x="${x}" y="${y}" width="${w}" height="34" fill="${c}"/><rect x="${x}" y="${y + 30}" width="${w}" height="4" fill="#000" opacity=".08"/>${inner}`;
  const lamp = (x, y) => `<path d="M${x} ${y}v5" stroke="#8a8f9a"/><path d="M${x - 4} ${y + 9}l2-4h4l2 4z" fill="#ffd66b"/><circle cx="${x}" cy="${y + 12}" r="6" fill="#fff2b8" opacity=".5"/>`;
  return svg(id, '#e9f3fb', '#f6efe4', lg(id, 'gr', '#c9d8b0', '#aec190'),
    `${cloud(40, 30, .8, .8)}${cloud(286, 24, .7, .7)}<rect x="0" y="146" width="320" height="24" fill="${U(id, 'gr')}"/>` +
    `<g ${SH(id)}><path d="M72 36l88-28 88 28z" fill="#a86e53"/><rect x="76" y="36" width="168" height="112" fill="#fdfaf5"/></g><rect x="76" y="36" width="168" height="112" fill="none" stroke="#6b4a36" stroke-width="3"/>` +
    room(79, 39, 80, '#fde8d2', lamp(100, 39) + `<rect x="122" y="56" width="30" height="14" rx="3" fill="#f08a5d"/><rect x="120" y="52" width="34" height="6" rx="3" fill="#f4b08c"/>` + person(96, 73, .42, { skin: SKIN[0], shirt: '#4f7bd6', face: false })) +
    room(162, 39, 79, '#e1efe2', lamp(200, 39) + `<rect x="206" y="50" width="26" height="20" rx="1" fill="#8fcaf0"/><path d="M219 50v20M206 60h26" stroke="#fff"/>` + person(184, 73, .42, { skin: SKIN[3], shirt: '#2f9e6a', style: 'long', face: false })) +
    `<rect x="76" y="73" width="168" height="3" fill="#6b4a36"/>` +
    room(79, 76, 110, '#e5e8fb', lamp(134, 76) + `<rect x="92" y="96" width="36" height="12" rx="2" fill="#b07ad8"/><rect x="92" y="90" width="10" height="8" rx="2" fill="#d6b8ee"/>` + person(160, 110, .42, { skin: SKIN[2], shirt: '#e2574c', face: false }) + person(175, 110, .34, { skin: SKIN[1], shirt: '#f5c542', face: false })) +
    room(192, 76, 49, '#fff4d6', `<rect x="200" y="84" width="16" height="24" fill="#c9a26a"/><circle cx="213" cy="96" r="1.2" fill="#6b4a36"/><rect x="222" y="94" width="14" height="14" rx="2" fill="#f0a870"/>`) +
    `<rect x="76" y="110" width="168" height="3" fill="#6b4a36"/>` +
    room(79, 113, 72, '#f9e1e6', lamp(115, 113) + person(106, 146, .42, { skin: SKIN[4], shirt: '#46536e', style: 'bun', face: false }) + `<rect x="124" y="130" width="22" height="16" rx="2" fill="#e57a92"/>`) +
    room(154, 113, 87, '#e8f1f7', `${[0, 1, 2, 3, 4].map(i => `<rect x="${160 + i * 7}" y="${140 - i * 5}" width="7" height="${6 + i * 5}" fill="#c9a26a"/>`).join('')}<rect x="202" y="120" width="30" height="26" fill="#6b4a36"/><rect x="205" y="123" width="24" height="23" fill="#a6d3ef"/>`) +
    `<path d="M186 76v34M151 113v35M159 39v34" stroke="#6b4a36" stroke-width="3"/>` +
    [[100, 56, '1'], [196, 56, '2'], [126, 90, '3'], [216, 90, '4']].map(([x, y, t]) => `<g transform="translate(${x} ${y - 10})"><circle r="6" fill="#e45b4e"/><text y="3" font-family="sans-serif" font-size="8" fill="#fff" text-anchor="middle" font-weight="700">${t}</text></g>`).join(''));
},
share(id) {
  return svg(id, '#eef4ff', '#fdeff4', lg(id, 'a', '#f08a5d', '#d8683f') + lg(id, 'b', '#4f7bd6', '#3a5fb0') + lg(id, 'c', '#2f9e6a', '#1f7a50') + lg(id, 'd', '#e9c46a', '#c99a34') + rg(id, 'gl', '#ffffff', .9),
    `<circle cx="160" cy="88" r="78" fill="${U(id, 'gl')}"/>` +
    `<g ${SH(id)} transform="translate(-10 -6)"><path d="M160 30L110 72h50z" fill="${U(id, 'a')}"/><rect x="118" y="72" width="42" height="36" fill="#fbd9c6"/><rect x="128" y="80" width="14" height="12" fill="#a7d3ef"/></g>` +
    `<g ${SH(id)} transform="translate(10 -6)"><path d="M160 30l50 42h-50z" fill="${U(id, 'b')}"/><rect x="160" y="72" width="42" height="36" fill="#d5e1f7"/><rect x="176" y="80" width="14" height="12" fill="#a7d3ef"/></g>` +
    `<g ${SH(id)} transform="translate(-10 8)"><rect x="118" y="108" width="42" height="34" fill="${U(id, 'c')}"/><rect x="138" y="116" width="14" height="26" fill="#1f5a3c"/></g>` +
    `<g ${SH(id)} transform="translate(10 8)"><rect x="160" y="108" width="42" height="34" fill="${U(id, 'd')}"/><rect x="170" y="116" width="14" height="12" fill="#a7d3ef"/></g>` +
    `<path d="M150 20v140M100 106h120" stroke="#9aa3b5" stroke-width="1.2" stroke-dasharray="3 4"/>` +
    [[62, 58, '#f08a5d', '1/4'], [258, 58, '#4f7bd6', '1/4'], [62, 132, '#2f9e6a', '1/4'], [258, 132, '#c99a34', '1/4']].map(([x, y, c, t]) => `<g transform="translate(${x} ${y})"><circle r="17" fill="#fff" ${SH(id)}/><circle r="13" fill="none" stroke="${c}" stroke-width="3"/><text y="3.5" font-family="sans-serif" font-size="9" fill="${c}" text-anchor="middle" font-weight="800">${t}</text></g>`).join('') +
    `<path d="M80 62l30 10M240 62l-28 10M80 128l28-6M240 128l-28-6" stroke="#c7ccd6" stroke-width="1.5" stroke-dasharray="2 3"/>`);
},
shop(id) {
  return svg(id, '#d7ecfb', '#fbf0e2', lg(id, 'wl', '#eee6da', '#d9ccb9') + lg(id, 'gl', '#e5f4fd', '#b0d7ef') + lg(id, 'gr', '#d6cfc2', '#bdb3a2'),
    `<rect x="0" y="146" width="320" height="24" fill="${U(id, 'gr')}"/><g ${SH(id)}><rect x="40" y="0" width="240" height="148" fill="${U(id, 'wl')}"/></g>` +
    [0, 1].map(r => [0, 1, 2, 3].map(c => `<rect x="${58 + c * 56}" y="${8 + r * 30}" width="36" height="20" rx="1.5" fill="#9cc9e6"/><rect x="${58 + c * 56}" y="${24 + r * 30}" width="36" height="4" fill="#8a94a3"/>`).join('')).join('') +
    `<rect x="40" y="66" width="240" height="4" fill="#b8a992"/>` +
    `<path d="M48 74h224l-6 16H54z" fill="#e75a4f"/>${Array.from({ length: 8 }, (_, i) => `<path d="M${54 + i * 26.5} 90h13l-3-16h-10z" fill="#fff" opacity=".9"/>`).join('')}${Array.from({ length: 16 }, (_, i) => `<circle cx="${60 + i * 13.3}" cy="90" r="6.6" fill="${i % 2 ? '#fff' : '#e75a4f'}"/>`).join('')}` +
    `<rect x="56" y="98" width="140" height="48" fill="${U(id, 'gl')}"/><rect x="204" y="98" width="60" height="48" fill="#6b4a36"/><rect x="209" y="103" width="50" height="43" fill="${U(id, 'gl')}" opacity=".8"/><rect x="250" y="120" width="4" height="10" rx="2" fill="#e9c46a"/>` +
    `<rect x="70" y="104" width="28" height="30" rx="3" fill="#fff" opacity=".85"/><rect x="73" y="107" width="22" height="24" rx="2" fill="#cfe8f7"/><path d="M90 134v8M78 134v8" stroke="#6a7186" stroke-width="2"/><path d="M76 124h18v6H76z" fill="#2f3a55"/><rect x="80" y="112" width="10" height="12" rx="5" fill="#2f3a55"/>` +
    `<rect x="110" y="104" width="28" height="30" rx="3" fill="#fff" opacity=".85"/><rect x="113" y="107" width="22" height="24" rx="2" fill="#cfe8f7"/><path d="M116 124h18v6h-18z" fill="#2f3a55"/>` +
    `<g transform="translate(166 118)"><circle cx="-5" cy="8" r="4" fill="none" stroke="#2f3a55" stroke-width="2"/><circle cx="5" cy="8" r="4" fill="none" stroke="#2f3a55" stroke-width="2"/><path d="M-3 5l10-16M3 5l-10-16" stroke="#2f3a55" stroke-width="2"/></g>` +
    `<path d="M60 100l30 44M120 100l30 44" stroke="#fff" stroke-width="6" opacity=".25"/>` +
    `<g transform="translate(292 118)"><rect x="-4" y="-22" width="8" height="30" rx="4" fill="#fff" stroke="#c9ccd4"/><path d="M-4-16l8-4M-4-8l8-4M-4 0l8-4" stroke="#e75a4f" stroke-width="2.5"/><path d="M-4-12l8-4M-4-4l8-4" stroke="#3f6fc7" stroke-width="2.5"/></g>` +
    person(24, 160, .85, { skin: SKIN[1], shirt: '#2f9e6a', pants: '#3a3f52', style: 'long', hair: HAIR[0], ra: -30 }));
},
foreign_home(id) {
  const note = (x, y, r, c, t, fs) => `<g transform="translate(${x} ${y}) rotate(${r})" ${SH(id)}><rect x="-22" y="-12" width="44" height="24" rx="2" fill="${c}"/><circle cx="0" cy="-10" r="2" fill="#e45b4e"/><text y="4" font-family="sans-serif" font-size="${fs || 8}" text-anchor="middle" fill="#3a3f52" font-weight="700">${t}</text></g>`;
  return svg(id, '#fdf3e6', '#f7e6d2', lg(id, 'fl', '#d8b88e', '#bf9b6c') + lg(id, 'su', '#4f7bd6', '#2f5fb8') + lg(id, 'wn', '#d8f0ff', '#a4d6f5') + lg(id, 'gb', '#7fc0ec', '#3f86c9'),
    `<rect x="0" y="128" width="320" height="42" fill="${U(id, 'fl')}"/><path d="M0 128h320" stroke="#a37a4f" stroke-width="2"/>` +
    `<g ${SH(id)}><rect x="228" y="16" width="72" height="62" rx="2" fill="#fff"/><rect x="233" y="21" width="62" height="52" fill="${U(id, 'wn')}"/></g><path d="M264 21v52" stroke="#fff" stroke-width="2"/><path d="M226 14h76v6h-76z" fill="#f08a5d"/>` +
    `<rect x="30" y="20" width="136" height="78" rx="4" fill="#c9a26a" opacity=".35"/>` +
    note(60, 40, -6, '#fff6b3', '안녕하세요', 7) + note(120, 36, 5, '#ffd6e0', 'Hello') + note(58, 76, 4, '#d6f0ff', 'Xin chào') + note(118, 74, -5, '#dff5d8', 'Сайн уу') + note(166, 56, 8, '#ffe4c7', '你好') +
    `<g ${SH(id)} transform="translate(236 124)"><rect x="-18" y="-40" width="36" height="42" rx="6" fill="${U(id, 'su')}"/><rect x="-7" y="-48" width="14" height="9" rx="3" fill="none" stroke="#2f3a55" stroke-width="3"/><path d="M-10-40v42M10-40v42" stroke="#2a4f9a" stroke-width="2"/><rect x="-14" y="-30" width="10" height="7" rx="2" fill="#f5c542" transform="rotate(-10)"/><circle cx="-11" cy="3" r="3" fill="#2b2e38"/><circle cx="11" cy="3" r="3" fill="#2b2e38"/></g>` +
    `<g transform="translate(30 126)"><rect x="-2" y="-8" width="4" height="8" fill="#8a6440"/><rect x="-10" y="-9" width="20" height="3" fill="#8a6440"/><circle cx="0" cy="-22" r="13" fill="${U(id, 'gb')}"/><path d="M-8-28q6 2 5 8t6 6M4-32q4 4 2 8M-12-18q6 0 8 4" stroke="#6ab06a" stroke-width="3" fill="none" stroke-linecap="round"/></g>` +
    person(186, 152, 1.08, { skin: SKIN[3], shirt: '#e57a92', pants: '#3f6fc7', style: 'long', hair: HAIR[0], ra: -150 }) +
    person(282, 154, .95, { skin: SKIN[4], shirt: '#2f9e6a', pants: '#2f3a55', hair: HAIR[3], la: 30 }));
},
pets(id) {
  return svg(id, '#fff4e4', '#fde8d0', lg(id, 'fl', '#e4c49a', '#c9a171') + lg(id, 'so', '#7fa8d8', '#5a86bf') + lg(id, 'dg', '#e9b27a', '#c98a52'),
    `<rect x="0" y="120" width="320" height="50" fill="${U(id, 'fl')}"/><ellipse cx="150" cy="148" rx="110" ry="16" fill="#e98a7a" opacity=".35"/>` +
    `<g ${SH(id)}><rect x="130" y="16" width="56" height="42" rx="2" fill="#fff"/><rect x="134" y="20" width="48" height="34" fill="#a6d3ef"/><path d="M134 50l14-14 10 10 8-6 16 10z" fill="#7ab87a"/></g>` +
    `<g ${SH(id)}><rect x="40" y="66" width="170" height="36" rx="12" fill="${U(id, 'so')}"/><rect x="30" y="84" width="190" height="34" rx="12" fill="${U(id, 'so')}"/><rect x="28" y="72" width="22" height="46" rx="10" fill="#6a94cc"/><rect x="200" y="72" width="22" height="46" rx="10" fill="#6a94cc"/></g><rect x="48" y="84" width="72" height="14" rx="6" fill="#8fb6e3"/><rect x="126" y="84" width="72" height="14" rx="6" fill="#8fb6e3"/><rect x="40" y="118" width="6" height="8" fill="#5a4636"/><rect x="204" y="118" width="6" height="8" fill="#5a4636"/>` +
    `<rect x="150" y="70" width="22" height="18" rx="5" fill="#f5c542" transform="rotate(-8 161 79)"/>` +
    `<g transform="translate(92 146)"><ellipse cx="4" cy="4" rx="36" ry="5" fill="#000" opacity=".15"/><ellipse cx="4" cy="-6" rx="30" ry="11" fill="${U(id, 'dg')}"/><circle cx="-24" cy="-12" r="12" fill="${U(id, 'dg')}"/><path d="M-34-20q-6 8 0 16l4-12z" fill="#9a6232"/><path d="M-16-22q6 6 2 14l-6-10z" fill="#9a6232"/><circle cx="-28" cy="-13" r="1.5" fill="#2a2320"/><circle cx="-20" cy="-13" r="1.5" fill="#2a2320"/><ellipse cx="-24" cy="-7" rx="4" ry="3" fill="#f4dcc0"/><circle cx="-24" cy="-8.5" r="1.5" fill="#2a2320"/><path d="M34-8q10-6 8-14" stroke="#c98a52" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="-4" cy="3" rx="6" ry="3" fill="#c98a52"/><ellipse cx="16" cy="3" rx="6" ry="3" fill="#c98a52"/></g>` +
    `<g transform="translate(250 146)"><ellipse cx="0" cy="3" rx="18" ry="4" fill="#000" opacity=".15"/><path d="M-12 2q-2-26 12-26t12 26z" fill="#6a6f7d"/><circle cx="0" cy="-30" r="10" fill="#6a6f7d"/><path d="M-9-34l-1-10 7 6zM9-34l1-10-7 6z" fill="#6a6f7d"/><path d="M-7-41l0-3 3 3zM7-41l0-3-3 3z" fill="#f2a3b0"/><ellipse cx="-4" cy="-31" rx="1.6" ry="2.2" fill="#d6f07a"/><ellipse cx="4" cy="-31" rx="1.6" ry="2.2" fill="#d6f07a"/><path d="M-1-27h2l-1 1.5z" fill="#f2a3b0"/><path d="M-6-18q6 4 12 0" stroke="#fff" opacity=".5" fill="none"/><path d="M12 0q14-2 10-18" stroke="#6a6f7d" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M-6-8v-6M0-6v-8M6-8v-6" stroke="#555a67" stroke-width="1.5"/></g>` +
    `<g transform="translate(290 118)"><rect x="-4" y="-50" width="8" height="52" fill="#d9c2a0"/><rect x="-16" y="-54" width="32" height="8" rx="3" fill="#c9a26a"/><rect x="-14" y="-24" width="28" height="7" rx="3" fill="#c9a26a"/><rect x="-18" y="0" width="36" height="6" rx="3" fill="#b58b52"/></g>` +
    `<g transform="translate(184 158)"><path d="M-12-6h24l-3 7h-18z" fill="#e45b4e"/><ellipse cy="-6" rx="12" ry="3" fill="#8a5a3a"/></g>` + plant(16, 124, 1.2));
},
fire_safety(id) {
  return svg(id, '#fff1e4', '#fde2d2', lg(id, 'ex', '#ef5a4c', '#b8302a', 1, 0) + lg(id, 'tr', '#e8453a', '#b72c24') + lg(id, 'gr', '#cfcfd4', '#b3b4bb') + lg(id, 'sd', '#5bbf85', '#2f9e6a'),
    `<rect x="0" y="130" width="320" height="40" fill="${U(id, 'gr')}"/><path d="M0 150h320" stroke="#fff" stroke-width="2" stroke-dasharray="12 10" opacity=".6"/>` +
    `<g ${SH(id)} transform="translate(154 38)"><rect x="0" y="16" width="130" height="62" rx="6" fill="${U(id, 'tr')}"/><path d="M130 30h14q8 0 12 8l6 14v26h-32z" fill="${U(id, 'tr')}"/><path d="M134 34h12l8 14h-20z" fill="#cfe8f7"/><rect x="0" y="16" width="130" height="8" rx="4" fill="#fff" opacity=".25"/><rect x="8" y="36" width="116" height="5" fill="#fff" opacity=".9"/><rect x="8" y="50" width="30" height="20" rx="2" fill="#b72c24"/>${[0, 1, 2].map(i => `<rect x="${46 + i * 26}" y="50" width="22" height="16" rx="2" fill="#f2f2f2" opacity=".9"/>`).join('')}<path d="M10 4h100M10 10h100" stroke="#c9ccd4" stroke-width="3"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<path d="M${14 + i * 12} 4v6" stroke="#c9ccd4" stroke-width="2"/>`).join('')}<rect x="60" y="8" width="12" height="8" rx="2" fill="#3f86c9"/><circle cx="66" cy="8" r="3" fill="#7ad0ff"/><circle cx="26" cy="82" r="10" fill="#2b2e38"/><circle cx="26" cy="82" r="4" fill="#c9ccd4"/><circle cx="140" cy="82" r="10" fill="#2b2e38"/><circle cx="140" cy="82" r="4" fill="#c9ccd4"/></g>` +
    `<g ${SH(id)} transform="translate(80 140)"><rect x="-18" y="-72" width="36" height="72" rx="14" fill="${U(id, 'ex')}"/><rect x="-12" y="-66" width="6" height="56" rx="3" fill="#fff" opacity=".25"/><rect x="-14" y="-46" width="28" height="18" rx="2" fill="#fff"/><rect x="-10" y="-42" width="20" height="3" fill="#b8302a"/><rect x="-10" y="-36" width="14" height="2.4" fill="#9aa3b5"/><rect x="-6" y="-84" width="12" height="14" rx="2" fill="#3a3f52"/><path d="M6-80h16l-4 6H6z" fill="#3a3f52"/><path d="M-6-80q-18 2-22 20t-2 40" stroke="#2b2e38" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="0" cy="-74" r="4" fill="#e9c46a"/></g>` +
    `<g ${SH(id)} transform="translate(30 42)"><path d="M0-22l20 7v14q0 14-20 22-20-8-20-22v-14z" fill="${U(id, 'sd')}"/><path d="M-8 0l6 6 11-12" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>` +
    `<g transform="translate(120 20)"><circle r="11" fill="#fff" ${SH(id)}/><circle r="7" fill="none" stroke="#c9ccd4" stroke-width="1.5"/><circle r="2" fill="#e45b4e"/><path d="M14-4q4 4 0 8M18-8q8 8 0 16" stroke="#e9a23b" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>`);
},
plumbing(id) {
  return svg(id, '#e8f4fb', '#d7eaf5', lg(id, 'tl', '#ffffff', '#e5eef5') + lg(id, 'wt', '#7fc4ec', '#4a9ad0') + lg(id, 'mt', '#dfe4ec', '#a4acb9', 1, 0) + lg(id, 'tb', '#e45b4e', '#b8302a'),
    `<g opacity=".5">${Array.from({ length: 12 }, (_, i) => `<path d="M${i * 28} 0v126" stroke="#c7dbe8"/>`).join('')}${Array.from({ length: 5 }, (_, i) => `<path d="M0 ${i * 28}h320" stroke="#c7dbe8"/>`).join('')}</g><rect x="0" y="126" width="320" height="44" fill="#b8c6d3"/>` +
    `<g ${SH(id)}><rect x="104" y="16" width="80" height="44" rx="4" fill="#fff"/><rect x="108" y="20" width="72" height="36" rx="3" fill="#cfe8f7"/><path d="M114 24l20 28" stroke="#fff" stroke-width="5" opacity=".6"/></g>` +
    `<g ${SH(id)}><path d="M88 70h112l-8 30q-4 10-14 10h-68q-10 0-14-10z" fill="${U(id, 'tl')}"/><rect x="84" y="64" width="120" height="8" rx="4" fill="#fff"/></g><ellipse cx="144" cy="74" rx="46" ry="6" fill="${U(id, 'wt')}"/><ellipse cx="130" cy="73" rx="10" ry="1.6" fill="#fff" opacity=".6"/><path d="M144 60v-8h14" stroke="url(#${id}mt)" stroke-width="6" stroke-linecap="round" fill="none"/><circle cx="144" cy="70" r="2" fill="#7a8a9a" opacity=".6"/>` +
    `<path d="M138 110v12q0 8 8 8h16v-8h-12v-12z" fill="url(#${id}mt)"/><rect x="160" y="120" width="10" height="12" rx="2" fill="#a4acb9"/>` +
    `<g transform="translate(152 42)"><path d="M0 0q-4 6 0 9 4-3 0-9z" fill="#4a9ad0"/></g>` +
    `<g ${SH(id)} transform="translate(236 134)"><rect x="-30" y="-20" width="60" height="22" rx="3" fill="${U(id, 'tb')}"/><rect x="-12" y="-28" width="24" height="10" rx="3" fill="none" stroke="#8a2a22" stroke-width="3"/><rect x="-30" y="-20" width="60" height="5" fill="#fff" opacity=".2"/><rect x="-4" y="-12" width="8" height="5" rx="1" fill="#e9c46a"/></g>` +
    `<g ${SH(id)} transform="translate(270 104) rotate(35)"><rect x="-3" y="-4" width="6" height="40" rx="3" fill="url(#${id}mt)"/><path d="M-9-12a9 9 0 1 1 18 0l-5 0v-5h-8v5z" fill="url(#${id}mt)"/></g>` +
    `<g ${SH(id)} transform="translate(56 124)"><rect x="-2.5" y="-50" width="5" height="46" rx="2" fill="#c9a26a"/><path d="M-14-4q0-10 14-10t14 10v4h-28z" fill="#e45b4e"/></g>` +
    person(206, 150, .95, { skin: SKIN[2], shirt: '#3f6fc7', pants: '#2f3a55', style: 'cap', cap: '#f5c542', la: -20, vest: '#2f5fb8' }));
},
support(id) {
  return svg(id, '#fff3e3', '#ffe4d6', lg(id, 'tb', '#d9a86f', '#b8864e') + rg(id, 'lt', '#fff6c8', .95) + lg(id, 'ht', '#ff8a9a', '#e8566b'),
    `<ellipse cx="160" cy="36" rx="130" ry="70" fill="${U(id, 'lt')}"/>` +
    `<g ${SH(id)}><rect x="244" y="30" width="46" height="36" rx="2" fill="#fff"/><rect x="248" y="34" width="38" height="28" fill="#bfe3f7"/></g><path d="M248 58l10-10 8 6 6-4 14 10z" fill="#9fd08e"/>` +
    `<rect x="0" y="140" width="320" height="30" fill="#f1d3b8"/>` + plant(34, 142, 1.5) +
    person(106, 150, 1.12, { skin: SKIN[0], shirt: '#8fb6e3', pants: '#46536e', style: 'long', hair: HAIR[1], ra: -40 }) +
    person(214, 150, 1.12, { skin: SKIN[2], shirt: '#f0a870', pants: '#5a4636', style: 'bun', hair: HAIR[0], la: 40 }) +
    `<g ${SH(id)}><rect x="112" y="108" width="96" height="10" rx="4" fill="${U(id, 'tb')}"/><rect x="124" y="116" width="6" height="34" fill="#a57744"/><rect x="190" y="116" width="6" height="34" fill="#a57744"/></g>` +
    `<g transform="translate(142 102)"><path d="M-6-8h12v8q0 5-6 5t-6-5z" fill="#fff"/><path d="M6-5q4 0 4 3t-4 3" stroke="#fff" stroke-width="1.6" fill="none"/><path d="M-2-12q2-3 0-6M2-12q2-3 0-6" stroke="#d9a86f" stroke-width="1.2" fill="none"/></g><g transform="translate(180 102)"><path d="M-6-8h12v8q0 5-6 5t-6-5z" fill="#fff"/></g>` +
    `<g transform="translate(160 40)"><path d="M0 14c-14-9-20-16-20-24 0-6 5-10 10-10 4 0 8 3 10 6 2-3 6-6 10-6 5 0 10 4 10 10 0 8-6 15-20 24z" fill="${U(id, 'ht')}" ${SH(id)}/><path d="M-12-10q2-4 6-4" stroke="#fff" stroke-width="2" fill="none" opacity=".7" stroke-linecap="round"/></g>` +
    `<g ${SH(id)} transform="translate(276 102)"><circle r="16" fill="#3aa76d"/><path d="M-6-8q-2 0-2 3 0 9 11 13 3 0 3-3l-1-3-4 1-4-5 2-3-3-3z" fill="#fff"/></g>` +
    `<g fill="#ffb347" opacity=".8"><circle cx="126" cy="30" r="2.5"/><circle cx="196" cy="24" r="2"/><circle cx="206" cy="48" r="1.6"/></g>`);
},
calendar_timer(id) {
  let cells = '';
  for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) {
    const n = r * 7 + c + 1, x = 48 + c * 15, y = 62 + r * 15;
    cells += `<rect x="${x}" y="${y}" width="12" height="12" rx="2" fill="${n < 12 ? '#e9edf3' : '#f6f7fa'}"/>${n < 12 ? `<path d="M${x + 3} ${y + 3}l6 6M${x + 9} ${y + 3}l-6 6" stroke="#b8c0cf" stroke-width="1.2"/>` : `<text x="${x + 6}" y="${y + 8.5}" font-family="sans-serif" font-size="6" fill="#6a7186" text-anchor="middle">${n}</text>`}`;
  }
  return svg(id, '#eef3ff', '#f7ecff', lg(id, 'cl', '#ffffff', '#eef1f7') + lg(id, 'hd', '#e45b4e', '#c43c30') + lg(id, 'tm', '#2f3a55', '#1a2136') + lg(id, 'sd', '#ffd97a', '#e9a23b'),
    `<g ${SH(id)}><rect x="38" y="24" width="124" height="130" rx="8" fill="${U(id, 'cl')}"/><rect x="38" y="24" width="124" height="28" rx="8" fill="${U(id, 'hd')}"/><rect x="38" y="44" width="124" height="8" fill="${U(id, 'hd')}"/></g><text x="100" y="42" font-family="sans-serif" font-size="11" fill="#fff" text-anchor="middle" font-weight="700">6개월</text>` +
    `<rect x="60" y="16" width="6" height="16" rx="3" fill="#6a7186"/><rect x="134" y="16" width="6" height="16" rx="3" fill="#6a7186"/>` + cells +
    `<circle cx="${48 + 5 * 15 + 6}" cy="${62 + 3 * 15 + 6}" r="9" fill="none" stroke="#e45b4e" stroke-width="2"/>` +
    `<g ${SH(id)}><rect x="186" y="40" width="104" height="52" rx="10" fill="${U(id, 'tm')}"/></g><text x="238" y="75" font-family="monospace" font-size="24" fill="#ff6b5a" text-anchor="middle" font-weight="700">D-30</text><circle cx="198" cy="50" r="2.5" fill="#3fd18a"/>` +
    `<g transform="translate(236 128)" ${SH(id)}><rect x="-18" y="-30" width="36" height="5" rx="2" fill="#8a5a3a"/><rect x="-18" y="25" width="36" height="5" rx="2" fill="#8a5a3a"/><path d="M-13-25h26q0 14-11 22 11 8 11 28h-26q0-20 11-28-11-8-11-22z" fill="#dff0fb" opacity=".9"/><path d="M-9-18h18q-2 8-9 12-7-4-9-12zM-10 22q2-10 10-14 8 4 10 14z" fill="${U(id, 'sd')}"/><path d="M0-6v14" stroke="#e9a23b" stroke-width="1.4" stroke-dasharray="2 2"/></g>` +
    `<g transform="translate(284 130)"><circle r="16" fill="#fff" ${SH(id)}/><circle r="13" fill="none" stroke="#3f6fc7" stroke-width="2"/><path d="M0-9v9l6 4" stroke="#2f3a55" stroke-width="2" stroke-linecap="round" fill="none"/></g>`);
},
data_chart(id) {
  const h = [34, 52, 44, 70, 62, 86];
  return svg(id, '#eef6ff', '#f3f0ff', lg(id, 'br', '#6aa8f0', '#3f6fc7') + lg(id, 'bh', '#ffb86b', '#f0803a') + lg(id, 'mp', '#e4f3e0', '#cfe6c8'),
    `<g ${SH(id)}><rect x="24" y="20" width="176" height="130" rx="10" fill="#fff"/></g><rect x="36" y="30" width="60" height="5" rx="2.5" fill="#2f3a55"/><rect x="36" y="39" width="36" height="3" rx="1.5" fill="#b0b7c6"/>` +
    [0, 1, 2, 3].map(i => `<path d="M40 ${132 - i * 24}h148" stroke="#eef0f4"/>`).join('') +
    h.map((v, i) => `<rect x="${48 + i * 24}" y="${132 - v}" width="16" height="${v}" rx="3" fill="${U(id, i === 5 ? 'bh' : 'br')}"/><rect x="${48 + i * 24}" y="${132 - v}" width="5" height="${v}" rx="2" fill="#fff" opacity=".2"/>`).join('') +
    `<path d="M40 132h148" stroke="#9aa3b5" stroke-width="1.2"/><polyline points="${h.map((v, i) => `${56 + i * 24},${120 - v}`).join(' ')}" fill="none" stroke="#2f9e6a" stroke-width="2.4" stroke-linejoin="round"/>${h.map((v, i) => `<circle cx="${56 + i * 24}" cy="${120 - v}" r="3" fill="#fff" stroke="#2f9e6a" stroke-width="2"/>`).join('')}` +
    `<g ${SH(id)}><rect x="210" y="34" width="92" height="104" rx="10" fill="${U(id, 'mp')}"/></g><path d="M214 70q30-10 50 10t36-4M230 38q6 40-8 96" stroke="#fff" stroke-width="5" fill="none"/><path d="M246 38q10 50 40 96" stroke="#bfe3f7" stroke-width="7" fill="none" opacity=".9"/>` +
    [[234, 70, '#e45b4e', 1], [270, 96, '#3f6fc7', .8], [282, 58, '#f0803a', .75]].map(([x, y, c, s]) => `<g transform="translate(${x} ${y}) scale(${s})" ${SH(id)}><path d="M0 14c-8-9-12-14-12-20a12 12 0 0 1 24 0c0 6-4 11-12 20z" fill="${c}"/><circle cy="-6" r="4.5" fill="#fff"/></g>`).join(''));
},
bank_loan(id) {
  return svg(id, '#dff0fb', '#f4f0e6', lg(id, 'bk', '#f7f4ee', '#dcd5c8') + lg(id, 'rf', '#3f6fc7', '#2a4f9a') + lg(id, 'co', '#ffe08a', '#d6a232') + lg(id, 'gr', '#d6d2c8', '#bdb7aa'),
    `${cloud(270, 26, .8, .8)}${cloud(40, 20, .6, .6)}<rect x="0" y="142" width="320" height="28" fill="${U(id, 'gr')}"/>` +
    `<g ${SH(id)}><path d="M48 52l82-32 82 32z" fill="${U(id, 'rf')}"/><rect x="54" y="52" width="152" height="8" fill="#2a4f9a"/><rect x="58" y="60" width="144" height="70" fill="${U(id, 'bk')}"/></g>` +
    `<g transform="translate(130 40)"><circle r="9" fill="#ffe08a"/><text y="4" font-family="sans-serif" font-size="11" fill="#2a4f9a" text-anchor="middle" font-weight="800">₩</text></g>` +
    [0, 1, 2, 3, 4].map(i => `<rect x="${68 + i * 28}" y="64" width="12" height="62" fill="#fff"/><rect x="${72 + i * 28}" y="64" width="3" height="62" fill="#e4ddcf"/>`).join('') +
    `<rect x="120" y="96" width="20" height="34" rx="10" fill="#3a4a6a"/><rect x="50" y="130" width="160" height="6" fill="#cfc6b6"/><rect x="44" y="136" width="172" height="6" fill="#bfb5a3"/>` +
    `<g ${SH(id)} transform="translate(244 84)"><rect x="-26" y="-34" width="52" height="68" rx="3" fill="#fff"/><rect x="-26" y="-34" width="52" height="12" rx="3" fill="#3aa76d"/><text y="-25" font-family="sans-serif" font-size="7" fill="#fff" text-anchor="middle" font-weight="700">대출</text>${[-14, -7, 0, 7].map(y => `<rect x="-20" y="${y}" width="${y === 0 ? 26 : 40}" height="2.6" rx="1.3" fill="#c3c8d2"/>`).join('')}<circle cx="12" cy="20" r="9" fill="#fdecea"/><text x="12" y="23.5" font-family="sans-serif" font-size="10" fill="#e45b4e" text-anchor="middle" font-weight="800">%</text></g>` +
    [0, 1, 2, 3, 4].map(i => `<g ${SH(id)}><ellipse cx="290" cy="${150 - i * 6}" rx="14" ry="5" fill="#b8841f"/><ellipse cx="290" cy="${148 - i * 6}" rx="14" ry="5" fill="${U(id, 'co')}"/></g>`).join('') +
    `<path d="M22 110l14-10 10 6 16-16" stroke="#e45b4e" stroke-width="3" fill="none" stroke-linecap="round" opacity=".5"/>`);
},
inspection(id) {
  return svg(id, '#39415a', '#262c3f', lg(id, 'bm', '#fff5c4', '#fff5c4', 1, 0) + rg(id, 'sp', '#fff4c0', .9) + lg(id, 'fl', '#3a4158', '#2c3246') + lg(id, 'cb', '#c9a26a', '#a57744'),
    `<rect x="0" y="130" width="320" height="40" fill="${U(id, 'fl')}"/><path d="M120 92L270 30v90z" fill="#fff5c4" opacity=".22"/><ellipse cx="236" cy="72" rx="52" ry="46" fill="${U(id, 'sp')}"/>` +
    `<g transform="translate(232 66)"><path d="M-14-10q-8 8-2 18t14 6q8 4 12-6t-6-18q-8-6-18 0z" fill="#b3895a" opacity=".55"/><path d="M-8-4q2 6 8 4" stroke="#8a6440" stroke-width="1.5" fill="none" opacity=".6"/><path d="M-2 14v10M4 12v6" stroke="#8a6440" stroke-width="1.6" opacity=".5" stroke-linecap="round"/></g>` +
    `<path d="M216 44l6 10-4 6 6 8" stroke="#6b4a36" stroke-width="1.4" fill="none" opacity=".7"/>` +
    person(104, 150, 1.12, { skin: SKIN[1], shirt: '#e9a23b', pants: '#2f3a55', style: 'cap', cap: '#3f6fc7', ra: -110, la: -30, extra: `<g transform="translate(24 -66) rotate(-24)"><rect x="-4" y="-3" width="20" height="7" rx="3" fill="#2b2e38"/><path d="M16-5h6v11h-6z" fill="#c9ccd4"/><circle cx="23" cy=".5" r="3" fill="#fff5c4"/></g>` }) +
    `<g ${SH(id)} transform="translate(40 96) rotate(-6)"><rect x="-22" y="-34" width="44" height="60" rx="3" fill="${U(id, 'cb')}"/><rect x="-18" y="-28" width="36" height="50" rx="1" fill="#fff"/><rect x="-7" y="-38" width="14" height="7" rx="2" fill="#6a7186"/>${[-18, -6, 6].map((y, i) => `<rect x="-14" y="${y}" width="7" height="7" rx="1.5" fill="none" stroke="#9aa3b5" stroke-width="1.2"/>${i < 2 ? `<path d="M-13 ${y + 3.5}l2 2.5 4-5" stroke="#3aa76d" stroke-width="1.8" fill="none" stroke-linecap="round"/>` : ''}<rect x="-3" y="${y + 2.5}" width="16" height="2.2" rx="1" fill="#c3c8d2"/>`).join('')}</g>` +
    `<g fill="#fff" opacity=".35"><circle cx="30" cy="20" r="1.2"/><circle cx="150" cy="16" r="1"/><circle cx="300" cy="140" r="1.2"/></g>`);
},
warning(id) {
  return svg(id, '#fff6e0', '#ffe9c9', lg(id, 'sd', '#4f86e0', '#2a4f9a') + lg(id, 'tr', '#ffd54a', '#f0a82a') + lg(id, 'gr', '#e0d6c2', '#c9bda6') + rg(id, 'gl', '#ffffff', .9),
    `<circle cx="160" cy="80" r="80" fill="${U(id, 'gl')}"/><rect x="0" y="140" width="320" height="30" fill="${U(id, 'gr')}"/>` +
    `<g ${SH(id)} transform="translate(88 138)"><rect x="-3" y="-60" width="6" height="60" fill="#8a94a3"/><path d="M0-112l34 58h-68z" fill="${U(id, 'tr')}" stroke="#2b2e38" stroke-width="3" stroke-linejoin="round"/><rect x="-3.5" y="-94" width="7" height="22" rx="3" fill="#2b2e38"/><circle cx="0" cy="-64" r="4" fill="#2b2e38"/></g>` +
    `<g ${SH(id)} transform="translate(206 84)"><path d="M0-56l44 16v28q0 36-44 56-44-20-44-56v-28z" fill="${U(id, 'sd')}"/><path d="M0-56l44 16v28q0 36-44 56z" fill="#fff" opacity=".12"/><path d="M0-44l32 11v22q0 27-32 43-32-16-32-43v-22z" fill="none" stroke="#fff" stroke-width="2" opacity=".5"/><path d="M-16 0l11 11 22-24" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>` +
    [[272, 150], [296, 152], [34, 152]].map(([x, y]) => `<g transform="translate(${x} ${y})" ${SH(id)}><rect x="-12" y="-2" width="24" height="4" rx="1" fill="#e2574c"/><path d="M-8-2l6-24h4l6 24z" fill="#f08a3a"/><path d="M-6-8h12M-4-16h8" stroke="#fff" stroke-width="3"/></g>`).join('') +
    `<g opacity=".9">${Array.from({ length: 10 }, (_, i) => `<path d="M${130 + i * 12} 160l6-8h6l-6 8z" fill="${i % 2 ? '#2b2e38' : '#f5c542'}"/>`).join('')}</g>`);
}
};

/* ---- case → scene mapping (first match wins; most specific first) ---- */
const RULES = [
  [/극단|위기|자해|자살|우울|생명/, 'support'],
  [/컨테이너/, 'factory_containers'],
  [/냉동|냉장/, 'cold_storage'],
  [/CNC|기계|설비|렌탈|헬스/, 'machines'],
  [/차량|차 다섯|견인|자동차|방치된 차/, 'cars_abandoned'],
  [/분묘|봉분|묘지|임야/, 'grave_land'],
  [/다가구|점유자 넷|여섯 세대|세대가/, 'multi_family'],
  [/지분|공유자|공유물/, 'share'],
  [/외국인|유학생|화교|몽골|파키스탄|베트남|중국인|이주/, 'foreign_home'],
  [/고양이|강아지|반려|애완/, 'pets'],
  [/화재|소화기|불이 났|불길|방화/, 'fire_safety'],
  [/세면대|배관|변기|막혔|하수/, 'plumbing'],
  [/상가|가게|미용실|식당|점포|권리금|영업/, 'shop'],
  [/인도명령 기한|6개월|기한|타이머|마감|D-/, 'calendar_timer'],
  [/거래량|데이터|지역·|표로|통계|아파트보다/, 'data_chart'],
  [/대출|잔금|이자|은행/, 'bank_loan'],
  [/부동산|중개|사장님|매물/, 'realtor'],
  [/인테리어|수리|견적|공사|누수|철거|도배/, 'interior'],
  [/매수자|신혼|집 보러|깎아/, 'buyer_couple'],
  [/계고|집행|집행관/, 'bailiff'],
  [/빈집|불이 켜|현황조사|점검|확인/, 'inspection'],
  [/인도명령|법원|소송|판결|변호사/, 'court'],
  [/합의서|각서|계약서|확정일자|배당/, 'contract'],
  [/이사비|만원|돈|보증금|관리비/, 'money'],
  [/열쇠|예비열쇠|비밀번호/, 'keys_handover'],
  [/이사|트럭|짐/, 'moving_truck'],
  [/문자|카톡|통화|연락|전화/, 'phone_chat'],
  [/쪽지|현관|내용증명|우편|현수막|편지/, 'door_notice'],
  [/위협|협박|유치권/, 'warning']
];
const CAT_DEFAULT = {
  '명도': 'villa', '고난도 명도': 'warning', '매도·임대': 'realtor', '빌라 투자': 'data_chart',
  '선순위 임차인': 'contract', '위기 대응': 'support', '외국인 점유자': 'foreign_home',
  '상가': 'shop', '지분': 'share', '부동산 사장님': 'realtor', '인테리어': 'interior'
};
function strip(s) { return String(s || '').replace(/<[^>]+>/g, ' '); }
function caseSceneKey(c) {
  c = c || {};
  const title = strip(c.title), setup = strip(c.setup);
  // title first (most descriptive), then setup
  for (const txt of [title, setup]) for (const [re, key] of RULES) if (re.test(txt)) return key;
  return CAT_DEFAULT[c.cat] || 'villa';
}
let _n = 0;
function sceneHTML(key, uid) {
  const f = SCENES[key] || SCENES.villa;
  const id = 's' + (uid != null ? String(uid).replace(/[^a-zA-Z0-9_-]/g, '') : '') + '_' + (++_n) + '_';
  return `<div class="scene">${f(id)}</div>`;
}
root.SCENES = SCENES; root.caseSceneKey = caseSceneKey; root.sceneHTML = sceneHTML;
if (typeof module !== 'undefined' && module.exports) module.exports = { SCENES, caseSceneKey, sceneHTML };
})(typeof window !== 'undefined' ? window : globalThis);
