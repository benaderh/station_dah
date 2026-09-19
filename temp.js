
const SUPABASE_URL="https://twxpixyjuacreatxncfo.supabase.co";
const SUPABASE_KEY="sb_publishable_VdDiO_xSqIvBbWak_wPASw__zsfWGby";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);

/* ====== Connexion ====== */
async function doLogin(){
 const email=$("email").value.trim(),password=$("password").value;
 if(!email||!password){$("status").textContent="Email et mot de passe requis.";return;}
 const{error}=await sb.auth.signInWithPassword({email,password});
 if(error){$("status").textContent="Connexion refusée : "+error.message;return;}
 loadAndRender();}
async function checkAuth(){
 const{data:{session}}=await sb.auth.getSession();
 if(!session){$("loginBox").style.display="block";$("status").textContent="Connecte-toi pour continuer.";return false;}
 const{data:{user}}=await sb.auth.getUser();
 const{data:prof}=await sb.from("profiles").select("role").eq("id",user.id).maybeSingle();
 if(!prof||(prof.role!=="patron"&&prof.role!=="admin")){
  $("status").textContent="Ce compte n'est pas autorisé sur cette page.";
  await sb.auth.signOut();$("loginBox").style.display="block";return false;}
 $("loginBox").style.display="none";
 return true;}

/* ====== Données ====== */
const TABLES=["tresorerie","categories","articles","tiers","mouvements","mouv_detail","agent_detail","indexs","factures","agent"];
let DB={tresorerie:[],categories:[],articles:[],tiers:[],mouvements:[],mouv_detail:[],agent_detail:[],indexs:[],factures:[],agent:[],meta:{}};
let selDate=null;

/* ====== Fonctions utilitaires — copiées telles quelles depuis station.html ====== */
const PIST=[{c:"P01",t:"G"},{c:"P02",t:"G"},{c:"P03",t:"G"},{c:"P04",t:"G"},{c:"P05",t:"E"},{c:"P06",t:"E"},{c:"P07",t:"E"},{c:"P08",t:"E"},{c:"P09",t:"L"},{c:"P10",t:"L"},{c:"P11",t:"L"},{c:"P12",t:"L"}];
const fmt=n=>Math.round(Number(n)||0).toLocaleString("fr-FR");
const fmtQ=n=>{const v=Number(n)||0;return v===Math.round(v)?v.toLocaleString("fr-FR"):v.toLocaleString("fr-FR",{maximumFractionDigits:3});};
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function frDate(iso){if(!iso)return"—";const p=iso.split("-");return p[2]+"/"+p[1]+"/"+p[0];}
function todayISO(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
const article=id=>DB.articles.find(a=>String(a.art_id)===String(id));
const tier=id=>DB.tiers.find(t=>String(t.tier_id)===String(id));
const tierNom=id=>{const t=tier(id);return t?esc(t.nom+" "+(t.prenom||"")).trim():"—";};
const agentLib=ty=>{if(Number(ty)===99)return"Avance sur salaire";const a=DB.agent.find(x=>Number(x.agent_type)===Number(ty));return a?esc(a.agent_libelle):"—";};
function fuelArtId(t){const ta=t==="G"?1:t==="E"?2:3;const a=DB.articles.find(x=>x.type_a===ta);return a?a.art_id:null;}
function prixFor(t){const a=article(fuelArtId(t));return a?Number(a.pv)||0:0;}
const idxRow=(d,n)=>DB.indexs.find(r=>r.index_date===d&&r.index_name===n);
const idxVal=(d,n)=>{const r=idxRow(d,n);return r&&r.index!==null&&r.index!==""?Number(r.index):0;};
function datesAsc(){return[...new Set(DB.indexs.map(r=>r.index_date))].sort();}
function prevDateOf(d){const a=datesAsc();const i=a.indexOf(d);return i>0?a[i-1]:null;}
function calcGroup(d){
 const prev=prevDateOf(d);
 const rows=PIST.map(p=>{
  const idx0=prev?idxVal(prev,p.c):0;
  const r=idxRow(d,p.c);
  const idx1=r&&r.index!==null&&r.index!==""?Number(r.index):null;
  const pu=(r&&Number(r.index_prix))?Number(r.index_prix):prixFor(p.t);
  const diff=idx1===null?0:(idx0===0?0:idx1-idx0);
  return{code:p.c,type:p.t,idx0,idx1,pu,diff,mt:diff*pu};});
 const sum=t=>rows.filter(r=>r.type===t).reduce((s,r)=>({q:s.q+r.diff,m:s.m+r.mt}),{q:0,m:0});
 const r1=idxRow(d,"P01"),r2=idxRow(d,"P09");
 return{rows,g:sum("G"),e:sum("E"),gpl:sum("L"),t1:r1?r1.index_agent:null,t2:r2?r2.index_agent:null};}
function normMode(m){if(m==="cash"||m==="Espèce"||m==="E")return"E";if(m==="credit"||m==="Crédit"||m==="T")return"T";if(m==="banque"||m==="Chèque"||m==="C")return"C";if(m==="bons"||m==="Bons Naftal"||m==="B")return"B";return String(m||"E");}
function getLedger(compte){
 const ledger=[];
 DB.tresorerie.forEach(t=>{if(t.compte===compte)ledger.push({id:t.id,date:t.date,libelle:t.libelle,obs:t.obs||"",sens:t.sens,montant:Number(t.montant),source:"treso"});});
 const agGroup={};DB.agent_detail.forEach(a=>{const ty=Number(a.type_agent),mt=Number(a.mt_agent),d=a.date_agent;const k=d+"_"+ty;if(!agGroup[k])agGroup[k]={date:d,ty:ty,mt:0,cle_id:a.cle_id};agGroup[k].mt+=mt;});Object.values(agGroup).forEach(g=>{if(compte==="caisse"){if(g.ty===1)ledger.push({id:g.cle_id,date:g.date,libelle:"Versement "+agentLib(1)+" (Total)",obs:"",sens:"E",montant:g.mt,source:"agent"});if(g.ty===5||g.ty===6)ledger.push({id:g.cle_id,date:g.date,libelle:"Retrait "+agentLib(g.ty)+" (Total)",obs:"",sens:"S",montant:g.mt,source:"agent"});}});
 DB.factures.forEach(f=>{(f.paiements||[]).forEach((p,idx)=>{let isCaisse=p.source==="caisse",isBanque=p.source==="banque";if(!p.source){const nm=normMode(f.mode);isCaisse=nm==="E";isBanque=nm==="C";}if((compte==="caisse"&&isCaisse)||(compte==="banque"&&isBanque)){ledger.push({id:f.id+"_p"+idx,date:p.date,libelle:"Paiement Facture "+(f.numero?f.numero:(f.type==="carburant"?"Carb":"Div")),obs:tierNom(f.fournisseurId),sens:"S",montant:Number(p.montant),source:"facture"});}});});
 ledger.sort((a,b)=>a.date.localeCompare(b.date));
 let solde=compte==="caisse"?(Number(DB.meta.caisseInit)||0):(Number(DB.meta.banqueInit)||0);
 ledger.forEach(l=>{if(l.sens==="E")solde+=l.montant;else solde-=l.montant;l.solde=solde;});
 return ledger;}
function caisseDuJour(d){
 const led=getLedger("caisse").filter(l=>l.date===d);
 let espece=0,sorties=0,paiements=0;
 led.forEach(l=>{if(l.source==="agent"&&l.sens==="E")espece+=l.montant;if(l.source==="agent"&&l.sens==="S")sorties+=l.montant;if((l.source==="facture"||l.source==="treso")&&l.sens==="S")paiements+=l.montant;if(l.source==="treso"&&l.sens==="E")espece+=l.montant;});
 return{espece,sorties,paiements,net:espece-sorties-paiements};}
function caisseSoldeAvant(date){const led=getLedger("caisse");const last=led.filter(l=>l.date<date).pop();return last?last.solde:(Number(DB.meta.caisseInit)||0);}
function banqueSolde(){const led=getLedger("banque");return led.length?led[led.length-1].solde:(Number(DB.meta.banqueInit)||0);}
function calcStockCarburant(typeA,dateLimit=null){
 const artObj=DB.articles.find(a=>Number(a.type_a)===Number(typeA));
 if(!artObj)return 0;
 const artId=artObj.art_id;
 const achats=DB.mouv_detail.filter(md=>{
  const op=DB.mouvements.find(m=>String(m.operation_id)===String(md.id_operation));
  return String(md.id_art)===String(artId)&&op&&op.sens==="E"&&(!dateLimit||op.date_m<=dateLimit);
 }).reduce((s,md)=>s+Number(md.quantite),0);
 const pistType=typeA===1?"G":typeA===2?"E":"L";
 const pists=PIST.filter(p=>p.t===pistType);
 let vendus=0;
 let dates=datesAsc();
 if(dateLimit)dates=dates.filter(dt=>dt<=dateLimit);
 if(dates.length>0){
  const firstDate=dates[0],lastDate=dates[dates.length-1];
  pists.forEach(p=>{
   const rL=idxRow(lastDate,p.c),rF=idxRow(firstDate,p.c);
   const idxL=rL&&rL.index!==null&&rL.index!==""?Number(rL.index):0;
   const idxF=rF&&rF.index!==null&&rF.index!==""?Number(rF.index):0;
   if(idxL>idxF)vendus+=(idxL-idxF);});}
 const initial=DB.meta.stockInitial?(Number(DB.meta.stockInitial[typeA])||0):0;
 return initial+achats-vendus;}
function allDates(){const s=new Set();
 DB.indexs.forEach(r=>s.add(r.index_date));DB.mouvements.forEach(m=>s.add(m.date_m));DB.agent_detail.forEach(a=>s.add(a.date_agent));
 return[...s].sort();}

/* ====== Chargement ====== */
async function loadAndRender(){
 $("status").textContent="Connexion…";
 $("errBox").innerHTML="";
 if(!(await checkAuth()))return;
 try{
  for(const t of TABLES){
   const{data,error}=await sb.from(t).select("data");
   if(error)throw error;
   DB[t]=(data||[]).map(r=>r.data);}
  const{data:metaRow,error:metaErr}=await sb.from("meta").select("data").eq("id","singleton").maybeSingle();
  if(metaErr)throw metaErr;
  DB.meta=metaRow?metaRow.data:{};
  $("status").textContent="À jour — "+new Date().toLocaleTimeString("fr-FR");
  render();
 }catch(e){
  console.error(e);
  $("status").textContent="Erreur de connexion";
  $("errBox").innerHTML='<div class="err">Impossible de charger les données (réseau ou Supabase indisponible) : '+esc(e.message)+"</div>";
 }}

/* ====== Rendu — reproduction fidèle de vJournal (tableau de bord admin) ====== */
function render(){
 const ds=allDates().slice().reverse();
 const today=todayISO();
 if(!selDate||!ds.includes(selDate))selDate=ds.includes(today)?today:(ds.length?ds[0]:"");
 if(!ds.length){$("out").innerHTML=`<div class="card empty">📒 Aucune donnée enregistrée.</div>`;return;}
 const d=selDate;
 const g=calcGroup(d);

 function carbRow(typeA,label){
  const a=DB.articles.find(x=>Number(x.type_a)===typeA);
  if(!a)return`<tr><td>${label}</td><td class="num">—</td><td class="num">—</td><td class="num">—</td></tr>`;
  const pistType=typeA===1?"G":typeA===2?"E":"L";
  const qVendu=g[pistType==="G"?"g":pistType==="E"?"e":"gpl"].q;
  const vente=qVendu*Number(a.pv||0);
  const marge=qVendu*(Number(a.pv||0)-Number(a.pa||0));
  const stock=calcStockCarburant(typeA,d);
  return`<tr><td>${esc(a.article)}</td><td class="num">${fmt(vente)}</td><td class="num ${marge>=0?"diff-pos":"diff-neg"}">${fmt(marge)}</td><td class="num">${fmtQ(stock)} L</td></tr>`;}
 const carbG=g.g,carbE=g.e,carbGPL=g.gpl;
 const aG=DB.articles.find(x=>x.type_a===1),aE=DB.articles.find(x=>x.type_a===2),aL=DB.articles.find(x=>x.type_a===3);
 const tvCarb=(carbG.q*(aG?Number(aG.pv||0):0))+(carbE.q*(aE?Number(aE.pv||0):0))+(carbGPL.q*(aL?Number(aL.pv||0):0));
 const tmCarb=(carbG.q*(aG?Number(aG.pv||0)-Number(aG.pa||0):0))+(carbE.q*(aE?Number(aE.pv||0)-Number(aE.pa||0):0))+(carbGPL.q*(aL?Number(aL.pv||0)-Number(aL.pa||0):0));

 function diversRow(typeA,label){
  const arts=typeA===0?DB.articles.filter(a=>Number(a.type_a)===0&&Number(a.actif)):[DB.articles.find(a=>Number(a.type_a)===9)].filter(Boolean);
  let qte=0,vente=0,marge=0,stock=0;
  arts.forEach(a=>{
   const ops=DB.mouvements.filter(m=>m.date_m===d).map(m=>String(m.operation_id));
   const mds=DB.mouv_detail.filter(md=>ops.includes(String(md.id_operation))&&String(md.id_art)===String(a.art_id)&&DB.mouvements.find(m=>String(m.operation_id)===String(md.id_operation)&&m.sens==="S"));
   const q=mds.reduce((s,md)=>s+Number(md.quantite),0);
   const v=mds.reduce((s,md)=>s+(Number(md.quantite)*Number(md.prix_u)),0);
   qte+=q;vente+=v;marge+=(v-(q*Number(a.pa||0)));stock+=Number(a.qs||0);});
  return{label,vente,marge,stock,row:`<tr><td>${label}</td><td class="num">${fmt(vente)}</td><td class="num ${marge>=0?"diff-pos":"diff-neg"}">${fmt(marge)}</td></tr>`};}
 const rowGaz=diversRow(9,"Gaz Butane"),rowLub=diversRow(0,"Lubrifiants");
 const tvDiv=rowGaz.vente+rowLub.vente,tmDiv=rowGaz.marge+rowLub.marge;

 const facNonBanque=DB.factures.filter(f=>{
  if(f.type!=="carburant"||f.date>d)return false;
  const regleAALaDate=(f.paiements||[]).filter(p=>p.date<=d).reduce((s,p)=>s+Number(p.montant),0);
  const reste=Number(f.montant)-regleAALaDate;
  const hasBons=(f.paiements||[]).filter(p=>p.date<=d).some(p=>p.source==="bons");
  return reste>0||hasBons;
 }).sort((a,b)=>b.date.localeCompare(a.date));
 let resteQteGE=0,resteQteGPL=0;
 const resteCarburant=facNonBanque.reduce((s,f)=>{
  const regleAALaDate=(f.paiements||[]).filter(p=>p.date<=d).reduce((s,p)=>s+Number(p.montant),0);
  const reste=Number(f.montant)-regleAALaDate;
  if(reste>0&&Number(f.montant)>0){
   const ratio=reste/Number(f.montant);
   (f.lignes||[]).forEach(l=>{
    const art=Number(l.artId);
    if(art===1||art===2)resteQteGE+=Number(l.qte)*ratio;
    else if(art===3)resteQteGPL+=Number(l.qte)*ratio;
   });
  }
  return s+reste;},0);

 const cj=caisseDuJour(d);
 const soldePrec=caisseSoldeAvant(d);
 const soldeFin=soldePrec+cj.net;
 const parType={};DB.agent_detail.filter(x=>x.date_agent===d&&Number(x.type_agent)!==1).forEach(x=>{parType[x.type_agent]=(parType[x.type_agent]||0)+Number(x.mt_agent);});
 const paiementsDetails=getLedger("caisse").filter(l=>l.date===d&&(l.source==="facture"||l.source==="treso")&&l.sens==="S");

 const ledBanque=getLedger("banque").filter(l=>l.date===d);
 const bEncaisse=ledBanque.filter(l=>l.sens==="E").reduce((s,l)=>s+l.montant,0);
 const bDecaisse=ledBanque.filter(l=>l.sens==="S").reduce((s,l)=>s+l.montant,0);
 const soldeBanque=banqueSolde();

 $("out").innerHTML=`
 <div class="row between" style="margin-bottom:16px;align-items:center;background:var(--card);padding:14px 18px;border-radius:12px;border:1px solid var(--line)">
  <div style="display:flex;align-items:center;gap:12px">
   <span style="font-size:24px">📊</span>
   <h1>Tableau de bord</h1>
  </div>
  <div class="row" style="gap:10px;flex-wrap:wrap">
   <select style="padding:8px 12px;border-radius:9px;background:#fff;border:1px solid var(--accent);color:#000;font-size:14px;font-weight:600;min-width:140px;cursor:pointer" onchange="selDate=this.value;render()">
    ${ds.map(x=>`<option value="${x}" ${x===d?"selected":""}>${frDate(x)}</option>`).join("")}
   </select>
   <button class="btn" onclick="loadAndRender()">🔄</button>
   <button class="btn accent" onclick="window.print()">🖨️ Imprimer</button>
  </div>
 </div>
 <div class="grid-stats" style="margin-bottom:16px">
  <div class="stat gold"><div class="v">${fmt(soldeFin)}</div><div class="l">Caisse (Fin de journée)</div></div>
  <div class="stat blue"><div class="v">${fmt(soldeBanque)}</div><div class="l">Banque (Cumulé)</div></div>
  <div class="stat green"><div class="v">${fmt(tmCarb)}</div><div class="l">Marge Carburant</div></div>
  <div class="stat"><div class="v">${fmt(tmDiv)}</div><div class="l">Marge Gaz &amp; Lubrifiants</div></div>
  <div class="stat red"><div class="v">${fmt(resteCarburant)}</div><div class="l">Crédit Carburant (En attente)</div></div>
  <div class="stat green"><div class="v">${fmt(tmCarb+tmDiv)}</div><div class="l">Marge Globale</div></div>
 </div>
 <div class="card" style="margin-bottom:12px">
  <h2 style="margin-bottom:10px">💵 Suivi de Caisse</h2>
  <table style="max-width:480px">
   <tr><td style="padding:7px 4px">Solde initial (report)</td><td class="num" style="padding:7px 4px;font-weight:700">${fmt(soldePrec)} DA</td></tr>
   <tr><td style="padding:7px 4px;color:var(--green)">＋ Encaissements</td><td class="num" style="padding:7px 4px;color:var(--green)">+ ${fmt(cj.espece)} DA</td></tr>
   <tr><td colspan="2" style="padding:4px 4px 2px;font-size:12px;color:var(--muted);font-weight:600">Détail décaissements :</td></tr>
   ${Object.keys(parType).length?Object.keys(parType).sort().map(t=>`<tr><td style="padding:4px 4px 4px 16px;font-size:13px;color:var(--muted)">− ${agentLib(t)}</td><td class="num" style="padding:4px 4px;font-size:13px;color:var(--red)">− ${fmt(parType[t])} DA</td></tr>`).join(""):`<tr><td colspan="2" style="padding:4px 16px;font-size:12px;color:var(--muted)">Aucun décaissement saisi</td></tr>`}
   ${paiementsDetails.length>0?`<tr><td colspan="2" style="padding:6px 4px 2px;font-size:12px;color:var(--muted);font-weight:600">Détail paiements fournisseurs &amp; divers :</td></tr>${paiementsDetails.map(l=>`<tr><td style="padding:4px 4px 4px 16px;font-size:13px;color:var(--muted)">− ${esc(l.libelle)}${l.obs?` <span style="font-size:11.5px;opacity:0.8">(${esc(l.obs)})</span>`:""}</td><td class="num" style="padding:4px 4px;font-size:13px;color:var(--red)">− ${fmt(l.montant)} DA</td></tr>`).join("")}`:""}
   <tr style="border-top:2px solid var(--border)"><td style="padding:10px 4px;font-weight:700;font-size:15px">Solde final caisse</td><td class="num" style="padding:10px 4px;font-weight:700;font-size:15px;color:${soldeFin>=0?"var(--accent)":"var(--red)"}">${fmt(soldeFin)} DA</td></tr>
  </table>
 </div>
 <div class="card" style="margin-bottom:12px">
  <h2 style="margin-bottom:10px">🏦 Suivi de Banque</h2>
  ${ledBanque.length?`<table style="max-width:480px">
   <tr><td colspan="2" style="padding:4px;font-size:12px;color:var(--muted);font-weight:600">Mouvements du ${frDate(d)} :</td></tr>
   ${ledBanque.map(l=>`<tr><td style="padding:5px 4px;font-size:13px">${l.sens==="E"?"＋":"−"} ${esc(l.libelle)}</td><td class="num" style="padding:5px 4px;color:${l.sens==="E"?"var(--green)":"var(--red)"}">${l.sens==="E"?"+":"−"} ${fmt(l.montant)} DA</td></tr>`).join("")}
   <tr style="border-top:2px solid var(--border)"><td style="padding:8px 4px;color:var(--green);font-size:13px">Total crédits</td><td class="num" style="padding:8px 4px;color:var(--green)">+ ${fmt(bEncaisse)} DA</td></tr>
   <tr><td style="padding:4px 4px;color:var(--red);font-size:13px">Total débits</td><td class="num" style="padding:4px 4px;color:var(--red)">− ${fmt(bDecaisse)} DA</td></tr>
   <tr style="border-top:2px solid var(--border)"><td style="padding:10px 4px;font-weight:700;font-size:15px">Solde banque (cumulé)</td><td class="num" style="padding:10px 4px;font-weight:700;font-size:15px;color:var(--accent2)">${fmt(soldeBanque)} DA</td></tr>
  </table>`:`<p class="subtle" style="padding:6px 0">Aucun mouvement bancaire enregistré pour cette journée.</p><div style="display:flex;align-items:center;gap:10px;margin-top:6px"><span style="color:var(--muted);font-size:13px">Solde banque cumulé :</span><b style="color:var(--accent2);font-size:15px">${fmt(soldeBanque)} DA</b></div>`}
 </div>
 <div class="card" style="margin-bottom:12px">
  <h2 style="margin-bottom:10px">⛽ Carburant</h2>
  <table>
   <thead><tr style="background:rgba(255,255,255,0.04)"><th style="text-align:left;padding:8px">Article</th><th class="num" style="padding:8px">Vente (DA)</th><th class="num" style="padding:8px">Marge (DA)</th><th class="num" style="padding:8px">Stock</th></tr></thead>
   <tbody>
    ${carbRow(1,"Gasoil")}${carbRow(2,"Essence")}${carbRow(3,"GPL")}
    <tr style="border-top:2px solid var(--border);font-weight:700"><td style="padding:8px 4px">Total</td><td class="num" style="padding:8px 4px;color:var(--gold)">${fmt(tvCarb)}</td><td class="num" style="padding:8px 4px;color:${tmCarb>=0?"var(--green)":"var(--red)"}">${fmt(tmCarb)}</td><td class="num" style="padding:8px 4px">—</td></tr>
   </tbody>
  </table>
 </div>
 <div class="card" style="margin-bottom:12px">
  <h2 style="margin-bottom:10px">🛢️ Gaz Butane &amp; Lubrifiants</h2>
  <table>
   <thead><tr style="background:rgba(255,255,255,0.04)"><th style="text-align:left;padding:8px">Article</th><th class="num" style="padding:8px">Vente (DA)</th><th class="num" style="padding:8px">Marge (DA)</th></tr></thead>
   <tbody>${rowGaz.row}${rowLub.row}<tr style="border-top:2px solid var(--border);font-weight:700"><td style="padding:8px 4px">Total</td><td class="num" style="padding:8px 4px;color:var(--gold)">${fmt(tvDiv)}</td><td class="num" style="padding:8px 4px;color:${tmDiv>=0?"var(--green)":"var(--red)"}">${fmt(tmDiv)}</td></tr></tbody>
  </table>
 </div>
 <div class="card">
  <h2 style="margin-bottom:10px">📋 Suivi règlements carburant — En attente banque</h2>
  ${facNonBanque.length?`<div style="overflow-x:auto"><table style="min-width:620px">
   <thead><tr style="background:rgba(255,255,255,0.04)"><th style="text-align:left;padding:8px">Facture</th><th style="text-align:left;padding:8px">Fournisseur</th><th style="text-align:left;padding:8px">Date</th><th class="num" style="padding:8px">Qté G/E</th>
      <th class="num" style="padding:8px">Qté GPL</th><th class="num" style="padding:8px">Montant</th><th class="num" style="padding:8px">Réglé</th><th style="text-align:center;padding:8px">Mode</th><th style="text-align:left;padding:8px">N° Chèque</th><th class="num" style="padding:8px;color:var(--red)">Reste dû</th></tr></thead>
   <tbody>${facNonBanque.map(f=>{
    let qteGE=0,qteGPL=0;(f.lignes||[]).forEach(l=>{const art=Number(l.artId);if(art===1||art===2)qteGE+=Number(l.qte);else if(art===3)qteGPL+=Number(l.qte);});
    const regleAALaDate=(f.paiements||[]).filter(p=>p.date<=d).reduce((s,p)=>s+Number(p.montant),0);
    const reste=Number(f.montant)-regleAALaDate;
    const modes=(f.paiements||[]).filter(p=>p.date<=d).map(p=>{
     if(p.source==="bons")return`<span style="background:rgba(251,191,36,0.15);color:#fbbf24;padding:2px 6px;border-radius:4px;font-size:12px">Bons Naftal</span>`;
     if(p.source==="banque")return`<span style="background:rgba(99,179,237,0.15);color:#63b3ed;padding:2px 6px;border-radius:4px;font-size:12px">Banque</span>`;
     return`<span style="background:rgba(72,187,120,0.15);color:#48bb78;padding:2px 6px;border-radius:4px;font-size:12px">Caisse</span>`;}).join(" ");
    const cheques=(f.paiements||[]).filter(p=>p.date<=d&&p.cheque).map(p=>esc(p.cheque)).join(", ")||(f.cheque?esc(f.cheque):"—");
    return`<tr><td style="padding:6px 4px">${esc(f.numero||"—")}</td><td style="padding:6px 4px">${tierNom(f.fournisseurId)}</td><td style="padding:6px 4px">${frDate(f.date)}</td><td class="num" style="padding:6px 4px">${fmtQ(qteGE)}</td>
       <td class="num" style="padding:6px 4px">${fmtQ(qteGPL)}</td><td class="num" style="padding:6px 4px">${fmt(f.montant)}</td><td class="num" style="padding:6px 4px">${fmt(regleAALaDate)}</td><td style="text-align:center;padding:6px 4px">${modes||"—"}</td><td style="padding:6px 4px;font-size:12px;color:var(--accent2)">${cheques}</td><td class="num" style="padding:6px 4px;color:var(--red);font-weight:700">${reste>0?fmt(reste):"✔"}</td></tr>`;}).join("")}
   </tbody></table></div>`:`<p class="subtle">Aucun règlement en attente.</p>`}
 </div>`;}

loadAndRender();
setInterval(loadAndRender,60000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)loadAndRender();});
