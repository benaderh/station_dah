"""Script final — applique les 3 remplacements restants en mode binaire pur."""

data = open('index.html', 'rb').read()
print(f"Loaded: {len(data)} bytes")

def bsub(old_b, new_b, label):
    global data
    if old_b in data:
        data = data.replace(old_b, new_b, 1)
        print(f"  OK  : {label}")
        return True
    print(f"  MISS: {label}")
    return False

# ━━ validerPeriode ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OLD_VAL = (
    b'function validerPeriode(){\r\n const cur=sel.paieMois+"/"+sel.paieAnnee;\r\n const np=nextPeriod(sel.paieAnnee,sel.paieMois);\r\n if(!confirm("Valider la p??riode "+cur+" ?\\n\\nLes lignes Net seront calcul??es pour cette p??riode, puis les lignes Salaire de la p??riode "+np.mois+"/"+np.annee+" seront cr????es."))return;\r\n let seq=nextPaieCle();\r\n const lastCur=perDates(sel.paieAnnee,sel.paieMois).pop();\r\n personnelList().forEach(t=>{\r\n  const lines=paieLines(sel.paieAnnee,sel.paieMois,t.tier_id).filter(l=>Number(l.rubrique)!==9);\r\n  if(!lines.length)return;\r\n  DB.paie=DB.paie.filter(l=>!(String(l.annee)===String(sel.paieAnnee)&&String(l.mois)===String(sel.paieMois)&&String(l.idp_tier)===String(t.tier_id)&&Number(l.rubrique)===9));\r\n  const net=lines.reduce((s,l)=>s+(RUB_SENS[l.rubrique]||1)*Number(l.prix),0);\r\n  DB.paie.push({cle:seq++,annee:sel.paieAnnee,mois:sel.paieMois,date_p:lastCur,idp_tier:t.tier_id,rubrique:9,sens:1,nj:0,prix:net});\r\n });\r\n const firstDay="20"+np.annee+"-"+np.mois+"-01";\r\n personnelList().forEach(t=>{\r\n  const exists=DB.paie.some(l=>String(l.annee)===String(np.annee)&&String(l.mois)===String(np.mois)&&String(l.idp_tier)===String(t.tier_id)&&Number(l.rubrique)===1);\r\n  if(!exists)DB.paie.push({cle:seq++,annee:np.annee,mois:np.mois,date_p:firstDay,idp_tier:t.tier_id,rubrique:1,sens:1,nj:0,prix:0});\r\n });\r\n sel.paieAnnee=np.annee;sel.paieMois=np.mois;\r\n save();render();toast("P??riode "+cur+" valid??e ??? nouvelle p??riode : "+np.mois+"/"+np.annee,"ok");}'
)
NEW_VAL = (
    b'function validerPeriode(){\r\n const cur=sel.paieMois+"/"+sel.paieAnnee;\r\n const np=nextPeriod(sel.paieAnnee,sel.paieMois);\r\n const impayes=[];\r\n personnelList().forEach(t=>{\r\n  const net=netPaie(sel.paieAnnee,sel.paieMois,t.tier_id);\r\n  const deja=paieLines(sel.paieAnnee,sel.paieMois,t.tier_id).filter(l=>Number(l.rubrique)===10).reduce((s,l)=>s+(Number(l.nj)||1)*Number(l.prix),0);\r\n  const reste=net-deja;\r\n  if(reste>0.01)impayes.push({nom:tierNom(t.tier_id),net,deja,reste});\r\n });\r\n let msg="Valider la p??riode "+cur+" ?\\n\\nLignes Net calcul??es + Salaires "+np.mois+"/"+np.annee+" cr????s.";\r\n if(impayes.length)msg+="\\n\\n\\u26a0\\ufe0f Impay??s :\\n"+impayes.map(i=>"  \\u2022 "+i.nom+" : Net "+fmt(i.net)+" DA, Pay?? "+fmt(i.deja)+" DA, Reste "+fmt(i.reste)+" DA").join("\\n");\r\n if(!confirm(msg))return;\r\n let seq=nextPaieCle();\r\n const lastCur=perDates(sel.paieAnnee,sel.paieMois).pop();\r\n const firstDay="20"+np.annee+"-"+np.mois+"-01";\r\n personnelList().forEach(t=>{\r\n  const lines=paieLines(sel.paieAnnee,sel.paieMois,t.tier_id).filter(l=>![9,10,11].includes(Number(l.rubrique)));\r\n  if(!lines.length)return;\r\n  const net=lines.reduce((s,l)=>s+(RUB_SENS[l.rubrique]||1)*Number(l.prix),0);\r\n  DB.paie=DB.paie.filter(l=>!(String(l.annee)===String(sel.paieAnnee)&&String(l.mois)===String(sel.paieMois)&&String(l.idp_tier)===String(t.tier_id)&&Number(l.rubrique)===9));\r\n  DB.paie.push({cle:seq++,annee:sel.paieAnnee,mois:sel.paieMois,date_p:lastCur,idp_tier:t.tier_id,rubrique:9,sens:1,nj:1,prix:net});\r\n  const deja=paieLines(sel.paieAnnee,sel.paieMois,t.tier_id).filter(l=>Number(l.rubrique)===10).reduce((s,l)=>s+(Number(l.nj)||1)*Number(l.prix),0);\r\n  const reste=net-deja;\r\n  if(reste>0.01)DB.paie.push({cle:seq++,annee:np.annee,mois:np.mois,date_p:firstDay,idp_tier:t.tier_id,rubrique:11,sens:1,nj:1,prix:reste});\r\n });\r\n personnelList().forEach(t=>{\r\n  const exists=DB.paie.some(l=>String(l.annee)===String(np.annee)&&String(l.mois)===String(np.mois)&&String(l.idp_tier)===String(t.tier_id)&&Number(l.rubrique)===1);\r\n  if(!exists)DB.paie.push({cle:seq++,annee:np.annee,mois:np.mois,date_p:firstDay,idp_tier:t.tier_id,rubrique:1,sens:1,nj:0,prix:0});\r\n });\r\n sel.paieAnnee=np.annee;sel.paieMois=np.mois;\r\n save();render();\r\n if(impayes.length)alert("\\u26a0\\ufe0f P??riode "+cur+" valid??e.\\n\\nRestes report??s en "+np.mois+"/"+np.annee+" :\\n"+impayes.map(i=>"  \\u2022 "+i.nom+" : "+fmt(i.reste)+" DA").join("\\n"));\r\n else toast("P??riode "+cur+" valid??e","ok");}'
)
bsub(OLD_VAL, NEW_VAL, "validerPeriode")

# ━━ openPaieLineModal ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Get exact bytes from file
idx_opm = data.find(b'function openPaieLineModal')
idx_spl = data.find(b'\r\nfunction savePaieLine', idx_opm)
OLD_OPM = data[idx_opm:idx_spl + 2]  # include \r\n

NEW_OPM = (
    b'function openPaieLineModal(tid){\r\n const tt=DB.tiers.find(x=>String(x.tier_id)===String(tid));\r\n const pomp=tt?isPompiste(tt):false;\r\n const puDef=(tt&&Number(tt.pu))?Number(tt.pu):0;\r\n const rubOpts=Object.keys(RUBRIQUES).filter(r=>{const n=Number(r);return n>=2&&n<=7&&!(pomp&&n===2);}).map(r=>`<option value="${r}">${r} ??? ${RUBRIQUES[r]}</option>`).join("");\r\n openModal(`<h2>Ajouter ligne ??? ${tierNom(tid)}</h2>\r\n <input type="hidden" id="plTid" value="${tid}"><input type="hidden" id="plPuDef" value="${puDef}">\r\n <div class="row">\r\n  <div class="field"><label>Rubrique</label><select id="plRub" onchange="onPlRubChange()">${rubOpts}</select></div>\r\n  <div class="field"><label>Date</label><input id="plDate" type="date" value="${todayISO()}"></div>\r\n  <div class="field"><label>NJ / Qt??</label><input id="plNj" type="number" step="0.5" min="0" value="1" style="width:90px" oninput="updatePlTotal()"></div>\r\n  <div class="field"><label>Prix unitaire (DA)</label><input id="plPrix" type="number" min="0" value="0" style="width:110px" oninput="updatePlTotal()"></div>\r\n  <div class="field"><label>Total (DA)</label><input id="plTotal" type="number" disabled style="width:110px;background:var(--card2,#111);color:var(--accent);font-weight:700"></div>\r\n </div>\r\n <p class="subtle" style="margin-top:8px">Rub 2=Absence (non-pompistes, PU auto). 3/4=gain. 5/6/7=retenue. Rubriques 3\u20137 = caisse auto.</p>\r\n <div style="text-align:right;margin-top:16px">\r\n  <button class="btn" onclick="closeModal()">Annuler</button>\r\n  <button class="btn accent" onclick="savePaieLine()">\u2714 Enregistrer + \xf0\x9f\x92\xb5 Caisse</button></div>`);\r\n setTimeout(()=>{onPlRubChange();},50);}\r\nfunction onPlRubChange(){\r\n const rub=Number(document.getElementById("plRub")?.value);\r\n const puEl=document.getElementById("plPrix");\r\n const puDef=Number(document.getElementById("plPuDef")?.value)||0;\r\n if(puEl&&rub===2&&puDef>0&&Number(puEl.value)===0)puEl.value=puDef;\r\n updatePlTotal();}\r\nfunction updatePlTotal(){\r\n const nj=Number(document.getElementById("plNj")?.value)||1;\r\n const px=Number(document.getElementById("plPrix")?.value)||0;\r\n const el=document.getElementById("plTotal");\r\n if(el)el.value=(nj*px).toFixed(0);}\r\n'
)
print(f"  OPM old len: {len(OLD_OPM)}, cutting at savePaieLine")
data = data.replace(OLD_OPM, NEW_OPM, 1)
print("  OK  : openPaieLineModal")

# ━━ vPaie rows : add dblclick + Payer button ━━━━━━━━━━━━━
OLD_ROWS = (
    b'lines.map(l=>{const sens=RUB_SENS[l.rubrique]||1;return`<tr><td>${l.rubrique} ??? ${RUBRIQUES[l.rubrique]||"?"}</td>\r\n    <td>${sens===1?\'<span class="pill ok">+ Gain</span>\':\'<span class="pill warn">\u2212 Retenue</span>\'}</td>\r\n    <td>${frDate(l.date_p)}</td><td class="num">${fmtQ(l.nj)}</td><td class="num">${fmt(l.prix)}</td>\r\n    <td class="num" style="color:${sens===1?"var(--green)":"var(--red)"}">${sens===1?"+":"\u2212"} ${fmt(l.prix)}</td>\r\n    <td><button class="tag-del" onclick="delPaieLine(\'${l.cle}\')">???</button></td></tr>`;}).join("")}</table>`\r\n   :`<p class="subtle" style="margin-top:8px">Aucune ligne pour ${m}/${a} \u2013 cliquez sur \u00ab Actualiser \u00bb.</p>`}\r\n  </div>`;}).join("");'
)
if OLD_ROWS in data:
    NEW_ROWS = (
        b'lines.map(l=>{const sens=RUB_SENS[l.rubrique]||1;const nj=Number(l.nj)||1;const tot=nj*Number(l.prix);const isAuto=[1,8].includes(Number(l.rubrique));const dbl=isAuto?"":\'ondblclick="openEditPaieLineModal(\\\'"+l.cle+\'\\\')"\'+\' style="cursor:pointer" title="Dbl-clic"\';return`<tr ${dbl}><td>${l.rubrique} ??? ${RUBRIQUES[l.rubrique]||"?"}${l.treso_id?\'<span style="color:var(--accent);font-size:10px"> \xf0\x9f\x92\xb5</span>\':\'\'}</td>\r\n    <td>${sens===1?\'<span class="pill ok">+ Gain</span>\':\'<span class="pill warn">\u2212 Ret.</span>\'}</td>\r\n    <td>${frDate(l.date_p)}</td><td class="num">${fmtQ(nj)}</td><td class="num">${fmt(Number(l.prix))}</td><td class="num" style="font-weight:700">${fmt(tot)}</td>\r\n    <td class="num" style="color:${sens===1?"var(--green)":"var(--red)"};font-weight:700">${sens===1?"+":"\u2212"} ${fmt(tot)}</td>\r\n    <td>${isAuto?\'<span title="Auto">\xf0\x9f\x94\x92</span>\':`<span style="cursor:pointer;font-size:12px" onclick="openEditPaieLineModal(\'${l.cle}\')">\u270f\ufe0f</span>`}</td></tr>`;}).join("")}</table>`\r\n   :`<p class="subtle" style="margin-top:8px">Aucune ligne pour ${m}/${a} ??? cliquez sur \u00ab Actualiser \u00bb.</p>`}\r\n  ${(()=>{const dj=lines.filter(l=>Number(l.rubrique)===10).reduce((s,l)=>s+(Number(l.nj)||1)*Number(l.prix),0);const reste=Math.max(0,net-dj);const lbl=dj>0?`D??j?? pay??\u00a0: <b style="color:var(--green,#34d399)">${fmt(dj)}\u00a0DA</b>&nbsp;|&nbsp;<span style="color:orange;font-weight:700">Reste\u00a0: ${fmt(reste)}\u00a0DA</span>`:"Mt ?? payer\u00a0:";return`<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--line2,#2a3347);display:flex;align-items:center;gap:8px;flex-wrap:wrap"><label style="margin:0;font-size:13px;color:var(--muted)">${lbl}</label><input id="mt_paye_${t.tier_id}" type="number" min="0" value="${reste}" style="width:120px;padding:6px 10px;background:var(--card2,#111);border:1px solid var(--line2,#2a3347);border-radius:8px;color:var(--green,#34d399);font-weight:700;font-size:14px"><button class="btn sm accent" style="margin:0;padding:6px 12px" onclick="payerMaintenant(${t.tier_id})">\xf0\x9f\x92\xb3 Payer</button><span class="subtle" style="font-size:11px">Net\u00a0: <b>${fmt(net)}\u00a0DA</b></span></div>`})()}\r\n  </div>`;}).join("");'
    )
    data = data.replace(OLD_ROWS, NEW_ROWS, 1)
    print("  OK  : vPaie rows+Payer")
else:
    print("  MISS: vPaie rows+Payer — searching context")
    idx = data.find(b'lines.map(l=>')
    if idx > 0:
        print("  Found at:", idx)
        print(repr(data[idx:idx+300]))

# ━━ Write ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
open('index.html', 'wb').write(data)
print(f"\nWritten: {len(data)} bytes")
for kw in [b'Paiement', b'Report', b'payerMaintenant', b'onPlRubChange', b'openEditPaieLineModal', b'mt_paye_', b'Payer', b'RUB_CAISSE_SENS', b'impayes']:
    print(f"  {'OK  ' if kw in data else 'MISS'} : {kw.decode()}")
