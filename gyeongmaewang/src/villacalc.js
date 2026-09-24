
/* ============================== 빌라 계산기 ============================== */
const V = {bid:"15000", ltv:"70", acq:"1.1", fix:"500", sell:"18000", months:"6", rate:"4.5", sellFee:"0.5",
  base:"16000", state:"rough", rough:"10", full:"8", costBasic:"450", costFull:"2500",
  apt:"", villa:"", apt_area:"", villa_area:"",
  region:"metro", gongsi:"", redev:false,
  weeksSelf:"20", weeksAgent:"10", weekly:"30", agentFee:"200", hours:"30", wage:"3"};
const vnum = s => { const v = parseFloat(String(s).replace(/,/g,"")); return isFinite(v) ? v : NaN; };
const vin = (id, label, ph, extra) => `<div class="f"><label for="v_${id}">${label}</label><input id="v_${id}" data-v="${id}" inputmode="decimal" value="${esc(V[id])}" placeholder="${ph||""}" ${extra||""}></div>`;
function villaCalcHTML(){
  return `<div class="panel calc" style="grid-column:1/-1"><h2>🏘️ 빌라 계산기</h2><p class="note" style="margin-top:-4px">레버리지 수익률, 수리 여부, 팔리는 하한선, 취득세 중과배제, 명도 대행을 한 번에 따져 봐요. 숫자는 예시값이니 내 물건으로 바꿔 넣으세요.</p></div>
  <div class="panel calc"><h2>레버리지·수익률</h2>
    <div class="f2">${vin("bid","낙찰가 (만원)","15000")}${vin("ltv","대출 비율 (%)","70")}</div>
    <div class="f2">${vin("acq","취득 부대비용 (%)","1.1")}${vin("fix","수리·명도 등 (만원)","500")}</div>
    <div class="f2">${vin("sell","예상 매도가 (만원)","18000")}${vin("months","보유 기간 (개월)","6")}</div>
    <div class="f2">${vin("rate","대출 금리 (연 %)","4.5")}${vin("sellFee","매도 중개비 (%)","0.5")}</div>
    <div id="v_out1"></div></div>
  <div class="panel calc"><h2>상태별 매도가 · 수리할까?</h2>
    <div class="f2">${vin("base","깔끔한 기본집 기준 매도가 (만원)","16000")}<div class="f"><label for="v_state">지금 상태</label><select id="v_state" data-v="state"><option value="rough" ${V.state==="rough"?"selected":""}>험한 집 (수리 필요)</option><option value="basic" ${V.state==="basic"?"selected":""}>기본 정리된 집</option></select></div></div>
    <div class="f2">${vin("rough","험한 집 할인 (%)","10")}${vin("full","올수리 프리미엄 (%)","8")}</div>
    <div class="f2">${vin("costBasic","기본 정리 공사비 (만원)","450")}${vin("costFull","올수리 공사비 (만원)","2500")}</div>
    <div id="v_out2"></div></div>
  <div class="panel calc"><h2>팔리는 하한선 — 인근 아파트 대비</h2>
    <div class="f2">${vin("apt","인근 아파트 가격 (만원)","35000")}${vin("apt_area","아파트 전용 (㎡)","59")}</div>
    <div class="f2">${vin("villa","이 빌라 예상 매도가 (만원)","18000")}${vin("villa_area","빌라 전용 (㎡)","49")}</div>
    <div id="v_out3"></div></div>
  <div class="panel calc"><h2>취득세 중과배제 간이 체크</h2>
    <div class="f2"><div class="f"><label for="v_region">지역</label><select id="v_region" data-v="region"><option value="metro" ${V.region==="metro"?"selected":""}>수도권</option><option value="local" ${V.region==="local"?"selected":""}>지방</option></select></div>${vin("gongsi","주택 공시가격 (만원)","9000")}</div>
    <label class="note" style="display:flex;gap:6px;align-items:center;margin:4px 0"><input type="checkbox" id="v_redev" data-v="redev" ${V.redev?"checked":""}> 정비구역(재개발·재건축 등) 안에 있다</label>
    <div id="v_out4"></div></div>
  <div class="panel calc"><h2>명도 — 직접 vs 대행</h2>
    <div class="f2">${vin("weeksSelf","직접 할 때 예상 기간 (주)","20")}${vin("weeksAgent","대행 맡길 때 (주)","10")}</div>
    <div class="f2">${vin("weekly","주당 보유비용 (이자·관리비, 만원)","30")}${vin("agentFee","대행 비용 (만원)","200")}</div>
    <div class="f2">${vin("hours","직접 할 때 드는 내 시간 (시간)","30")}${vin("wage","내 시간 가치 (시간당 만원)","3")}</div>
    <div id="v_out5"></div></div>`;
}
const kv = (k, v, strong) => `<div class="kv"><span>${k}</span>${strong?`<span class="big" style="font-size:20px">${v}</span>`:`<b>${v}</b>`}</div>`;
function villaCalcAll(){
  const o1 = $("#v_out1"); if(!o1) return;
  { const bid=vnum(V.bid), ltv=vnum(V.ltv)||0, acq=vnum(V.acq)||0, fix=vnum(V.fix)||0, sell=vnum(V.sell), m=vnum(V.months), r=vnum(V.rate)||0, sf=vnum(V.sellFee)||0;
    if(!isFinite(bid)||!isFinite(sell)||!isFinite(m)||m<=0){ o1.innerHTML = `<div class="out"><span class="note">낙찰가·매도가·보유 기간을 넣어 주세요.</span></div>`; }
    else { const loan = bid*ltv/100, cash = bid-loan + bid*acq/100 + fix, interest = loan*r/100*m/12, sellCost = sell*sf/100;
      const profit = sell - bid - bid*acq/100 - fix - interest - sellCost, roi = cash>0 ? profit/cash*100 : NaN, ann = roi*12/m;
      o1.innerHTML = `<div class="out ${profit>=0?"ok":"no"}">${kv("대출", won(loan))}${kv("내 현금 (잔금+부대비용+수리)", won(cash))}${kv(`이자 (${m}개월)`, won(interest))}${kv("매도 비용", won(sellCost))}
      ${kv("세전 순수익", won(profit), true)}${kv("투자금 대비 수익률", isFinite(roi)?roi.toFixed(1)+"%":"-")}${kv("연 환산", isFinite(ann)?ann.toFixed(1)+"%":"-")}
      <div class="note">낙찰가 ÷ 내 현금 = ${cash>0?(bid/cash).toFixed(1):"-"}배. 현금:대출 3:7이면 대략 3~3.5배가 나와요(강의 예시). 양도세·사업소득세는 빼고 계산했어요.</div></div>`; } }
  { const o = $("#v_out2"), base=vnum(V.base), rd=vnum(V.rough)||0, fp=vnum(V.full)||0, cb=vnum(V.costBasic)||0, cf=vnum(V.costFull)||0;
    if(!isFinite(base)){ o.innerHTML = `<div class="out"><span class="note">기본집 기준 매도가를 넣어 주세요.</span></div>`; }
    else { const rough = base*(1-rd/100), full = base*(1+fp/100);
      const rows = V.state==="rough" ? [["지금 그대로(험한 집)", rough, 0], ["기본 정리 후", base, cb], ["올수리 후", full, cf]] : [["지금 그대로(기본)", base, 0], ["올수리 후", full, cf]];
      const cur = rows[0][1];
      const best = rows.reduce((b,r)=> (r[1]-cur-r[2]) > (b[1]-cur-b[2]) ? r : b, rows[0]);
      o.innerHTML = `<div class="out"><table class="vt"><thead><tr><th>단계</th><th>매도가</th><th>더 받는 돈</th><th>공사비</th><th>순증</th></tr></thead><tbody>${rows.map(r=>{ const gain=r[1]-cur, net=gain-r[2]; return `<tr${r===best?' class="best"':""}><td>${r[0]}</td><td>${won(r[1])}</td><td>${r===rows[0]?"-":won(gain)}</td><td>${r[2]?won(r[2]):"-"}</td><td>${r===rows[0]?"-":`<b style="color:${net>=0?"var(--ok)":"var(--seal)"}">${net>=0?"+":""}${won(net)}</b>`}</td></tr>`; }).join("")}</tbody></table>
      <div class="note" style="margin-top:6px">👉 <b>${best===rows[0]?"손대지 않고 파는 게 남아요":best[0]+"가 가장 남아요"}</b>. 공사 기간만큼 이자·관리비가 더 들고, 올수리는 실무에서 드문 선택이라는 점도 같이 보세요. 할인·프리미엄 %는 주변 매물을 보고 직접 조정하세요.</div></div>`; } }
  { const o = $("#v_out3"), a=vnum(V.apt), aa=vnum(V.apt_area), v=vnum(V.villa), va=vnum(V.villa_area);
    if(!isFinite(a)||!isFinite(v)){ o.innerHTML = `<div class="out"><span class="note">인근 아파트 가격과 이 빌라 예상 매도가를 넣어 주세요. 면적까지 넣으면 ㎡당 가격으로 비교해요.</span></div>`; }
    else { const byArea = isFinite(aa)&&isFinite(va)&&aa>0&&va>0; const ratio = byArea ? (v/va)/(a/aa)*100 : v/a*100;
      const lv = ratio<=60 ? ["ok","👍 갭이 넉넉해요","아파트 대신 빌라로 내려오는 수요가 붙기 좋은 구간이에요."] : ratio<=80 ? ["","➖ 보통","무난하지만 상태·입지로 차별화가 필요해요."] : ["no","⚠️ 아파트와 너무 가까워요","이 돈이면 아파트를 보겠다는 매수자가 많아져 잘 안 팔릴 수 있어요."];
      o.innerHTML = `<div class="out ${lv[0]}">${kv(byArea?"㎡당 가격 비율 (빌라 ÷ 아파트)":"가격 비율 (빌라 ÷ 아파트)", ratio.toFixed(0)+"%", true)}<div class="big" style="font-size:16px">${lv[1]}</div><div class="note">${lv[2]} 빌라는 아파트의 대체재예요. 60%·80%는 참고용 경계값이에요.</div></div>`; } }
  { const o = $("#v_out4"), g=vnum(V.gongsi), lim = V.region==="metro" ? 10000 : 20000;
    if(!isFinite(g)){ o.innerHTML = `<div class="out"><span class="note">공시가격을 넣어 주세요. 부동산 공시가격 알리미 등에서 확인할 수 있어요.</span></div>`; }
    else { const ok = g <= lim && !V.redev;
      o.innerHTML = `<div class="out ${ok?"ok":"no"}"><div class="big" style="font-size:18px">${ok?"중과배제 대상일 가능성 높음":"중과배제 대상 아닐 가능성"}</div>
      <div class="note">${V.region==="metro"?"수도권":"지방"} 기준선 공시가격 ${won(lim)} ${g<=lim?"이하":"초과"}${V.redev?" · 정비구역 안 주택은 이 혜택에서 빠지는 게 원칙이에요":""}.</div>
      <div class="note">⚠️ 강의 시점(2026.09) 기준 간이 판정이에요. 세법은 자주 바뀌고 주택 수·조정지역 등 조건이 더 있으니 실제 취득 전엔 세무사·위택스로 꼭 확인하세요.</div></div>`; } }
  { const o = $("#v_out5"), ws=vnum(V.weeksSelf), wa=vnum(V.weeksAgent), wk=vnum(V.weekly)||0, fee=vnum(V.agentFee)||0, h=vnum(V.hours)||0, wg=vnum(V.wage)||0;
    if(!isFinite(ws)||!isFinite(wa)){ o.innerHTML = `<div class="out"><span class="note">두 경우의 예상 기간을 넣어 주세요.</span></div>`; }
    else { const self = ws*wk + h*wg, agent = wa*wk + fee; const d = self-agent;
      o.innerHTML = `<div class="out ${d>0?"ok":""}">${kv("직접 (보유비 + 내 시간)", won(self))}${kv("대행 (보유비 + 대행비)", won(agent))}
      <div class="big" style="font-size:16px">${Math.abs(d)<1?"비슷해요":d>0?`대행이 ${won(d)} 이득`:`직접이 ${won(-d)} 이득`}</div>
      <div class="note">쉬운 명도는 직접, 연락두절·강성 점유자처럼 어려운 명도는 대행을 검토하는 게 일반적이에요(대행비 약 200만원은 강의 사례). 대행을 맡겨도 인도명령은 내 이름으로 제때 신청돼야 해요.</div></div>`; } }
}
document.addEventListener("input", e => { const k = e.target.dataset && e.target.dataset.v; if(!k || page!=="calc") return; V[k] = e.target.type==="checkbox" ? e.target.checked : e.target.value; villaCalcAll(); });
document.addEventListener("change", e => { const k = e.target.dataset && e.target.dataset.v; if(!k || page!=="calc") return; V[k] = e.target.type==="checkbox" ? e.target.checked : e.target.value; villaCalcAll(); });
