data = open('index.html', 'rb').read()

OLD_ROWS = b'lines.map(l=>{const sens=RUB_SENS[l.rubrique]||1;return`<tr><td>${l.rubrique} ??? ${RUBRIQUES[l.rubrique]||"?"}</td>\r\n    <td>${sens===1?\'<span class="pill ok">+ Gain</span>\':\'<span class="pill warn">??? Retenue</span>\'}</td>\r\n    <td>${frDate(l.date_p)}</td><td class="num">${fmtQ(l.nj)}</td><td class="num">${fmt(l.prix)}</td>\r\n    <td class="num" style="color:${sens===1?"var(--green)":"var(--red)"}">${sens===1?"+":"???"} ${fmt(l.prix)}</td>\r\n    <td><button class="tag-del" onclick="delPaieLine(\'${l.cle}\')">???</button></td></tr>`;}).join("")}</table>`\r\n   :`<p class="subtle" style="margin-top:8px">Aucune ligne pour ${m}/${a} ??? cliquez sur ?? Actualiser ??.</p>`}\r\n  </div>`;}).join("");'

NEW_ROWS = (
    b'lines.map(l=>{const sens=RUB_SENS[l.rubrique]||1;const nj=Number(l.nj)||1;const tot=nj*Number(l.prix);const isAuto=[1,8].includes(Number(l.rubrique));const dbl=isAuto?"":\'ondblclick="openEditPaieLineModal(\\\'"+l.cle+"\\\')"\'+\' style="cursor:pointer" title="Dbl-clic"\';return`<tr ${dbl}><td>${l.rubrique} ??? ${RUBRIQUES[l.rubrique]||"?"}${l.treso_id?\'<span style="color:var(--accent);font-size:10px"> \xf0\x9f\x92\xb5</span>\':\'\'}</td>\r\n    <td>${sens===1?\'<span class="pill ok">+ Gain</span>\':\'<span class="pill warn">??? Ret.</span>\'}</td>\r\n    <td>${frDate(l.date_p)}</td><td class="num">${fmtQ(nj)}</td><td class="num">${fmt(Number(l.prix))}</td><td class="num" style="font-weight:700">${fmt(tot)}</td>\r\n    <td class="num" style="color:${sens===1?"var(--green)":"var(--red)"};font-weight:700">${sens===1?"+":"???"} ${fmt(tot)}</td>\r\n    <td>${isAuto?\'<span title="Auto">\xf0\x9f\x94\x92</span>\':`<span style="cursor:pointer;font-size:12px" onclick="openEditPaieLineModal(\'${l.cle}\')">\u270f\ufe0f</span>`}</td></tr>`;}).join("")}</table>`\r\n   :`<p class="subtle" style="margin-top:8px">Aucune ligne pour ${m}/${a} ??? cliquez sur ?? Actualiser ??.</p>`}\r\n  ${(()=>{const dj=lines.filter(l=>Number(l.rubrique)===10).reduce((s,l)=>s+(Number(l.nj)||1)*Number(l.prix),0);const reste=Math.max(0,net-dj);const lbl=dj>0?`D??j?? pay??\u00a0: <b style="color:var(--green,#34d399)">${fmt(dj)}\u00a0DA</b>&nbsp;|&nbsp;<span style="color:orange;font-weight:700">Reste\u00a0: ${fmt(reste)}\u00a0DA</span>`:"Mt ?? payer\u00a0:";return`<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--line2,#2a3347);display:flex;align-items:center;gap:8px;flex-wrap:wrap"><label style="margin:0;font-size:13px;color:var(--muted)">${lbl}</label><input id="mt_paye_${t.tier_id}" type="number" min="0" value="${reste}" style="width:120px;padding:6px 10px;background:var(--card2,#111);border:1px solid var(--line2,#2a3347);border-radius:8px;color:var(--green,#34d399);font-weight:700;font-size:14px"><button class="btn sm accent" style="margin:0;padding:6px 12px" onclick="payerMaintenant(${t.tier_id})">\xf0\x9f\x92\xb3 Payer</button><span class="subtle" style="font-size:11px">Net\u00a0: <b>${fmt(net)}\u00a0DA</b></span></div>`})()}\r\n  </div>`;}).join("");'
)

if OLD_ROWS in data:
    data = data.replace(OLD_ROWS, NEW_ROWS, 1)
    open('index.html', 'wb').write(data)
    print("SUCCESS: vPaie rows replaced.")
    
    # Let's verify our added logic is indeed present
    if b'payerMaintenant(' in data:
        print("Verification: 'payerMaintenant' is found!")
    else:
        print("Verification failed: 'payerMaintenant' NOT found!")
else:
    print("FAILED: OLD_ROWS not found in data.")
