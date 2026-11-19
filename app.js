const $=s=>document.querySelector(s);
const DIAG={err:'',snap:0,listen:'-'};
window.addEventListener('error',e=>{DIAG.err=String(e.message||'error').slice(0,80)});
window.addEventListener('unhandledrejection',e=>{DIAG.err=errCode(e.reason)});
const fmt=n=>'Rs '+Math.round(+n||0).toLocaleString('en-US');
const r2=v=>Math.round((+v||0)*100)/100;
const S={
  loading:false,busy:false,
  shopId:null,role:'owner',
  shop:localStorage.shop||'Meri Dukan',
  rc:null,
  lang:localStorage.lang||'rm',
  hide:localStorage.hide==='1',
  dark:localStorage.dark==='1',
  tab:'today',q:'',cat:'',cart:[],disc:0,saving:false,no:1,noReady:false,
  buf:'',tmp:'',lock:localStorage.pinHash?'enter':'set1',
  pinFail:0,pinUntil:0,
  day:{sales:0,cash:0,cashOut:0,ud:0,com:0,cost:0,exp:0,bills:0,closed:false,countedCash:0},
  cfg:{dayStart:'00:00',allowNegativeStock:false,billFooter:'',lowStockDefault:5}
};
const P=[];
const C=[];
const B=[];
const W=[];
const D=[];
const WAL=[];
const SUP=[];

const isOwner=()=>S.role==='owner';

const I={
today:'<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',
sale:'<path d="M3 4h3l2 11h10l2-8H7M9 20h.01M17 20h.01"/>',
stock:'<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/>',
acc:'<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
more:'<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
plus:'<path d="M12 5v14M5 12h14"/>',
eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z"/>',
lock:'<path d="M6 11h12v9H6zM8 11V8a4 4 0 018 0v3"/>'
};
I.eyeoff=I.eye+'<path d="M3 3l18 18"/>';
const ic=k=>`<svg viewBox="0 0 24 24">${I[k]}</svg>`;
const t=()=>T[S.lang]||T.rm;
const hid=n=>(!isOwner()||S.hide)?'Rs ****':fmt(n);
const card=(l,v)=>`<div class=card><span>${l}</span><b>${v}</b></div>`;
const sub=()=>S.cart.reduce((a,x)=>a+Math.round(x.pr*x.q),0);
const total=()=>Math.max(0,sub()-Math.round(+S.disc||0));
const hdr=()=>`<div class=top><b>${clean(S.shop)||'Munafa Book'}</b><span>${S.day.closed?`<span class=tag>${t().dayClosed}</span>`:''}${isOwner()?`<button class=ib onclick="toggleHide()" aria-label="hide">${ic(S.hide?'eyeoff':'eye')}</button>`:''}<button class=ib onclick="lockNow()" aria-label="lock">${ic('lock')}</button></span></div>`;
const clean=v=>String(v||'').replace(/[<>"'`]/g,'').trim();
const gv=id=>($('#'+id)||{}).value||'';

function applyTheme(){
  document.body.classList.toggle('dark',!!S.dark);
  document.documentElement.style.colorScheme=S.dark?'dark':'light';
}

function chips(){
  const cs=[...new Set(P.map(p=>p.cat).filter(Boolean))];
  return `<div class=chips><button class="chip ${S.cat?'':'on'}" onclick="setCat('')">${t().all}</button>${cs.map(c=>`<button class="chip ${S.cat===c?'on':''}" onclick="setCat('${clean(c)}')">${clean(c)}</button>`).join('')}</div>`;
}

function plist(sale){
  if(S.loading)return `<p>${t().wait}</p>`;
  const q=S.q.toLowerCase(),a=P.filter(p=>(p.n.toLowerCase().includes(q)||(p.bc&&p.bc===S.q))&&(!S.cat||p.cat===S.cat));
  if(!a.length)return `<p>${t().empty}</p>`;
  return a.slice(0,60).map(p=>{
    const tag=p.com?`<span class=tag>${t().comTag}</span>`:p.svc?`<span class=tag>${t().svc}</span>`:(p.s<=0?`<span class="tag red">${t().out}</span>`:`<span class=tag>${p.s}</span>`);
    const img=p.th?`<img class=th src="${p.th}" alt="">`:'';
    const body=`<span class=pl>${img}<span>${clean(p.n)}<br><small>${p.com?'':fmt(p.p)+(p.unit?' / '+clean(p.unit):'')}</small></span></span>${tag}`;
    return `<button class=row onclick="${sale?`addCart('${p.id}')`:`openProd('${p.id}')`}">${body}</button>`;
  }).join('')+(a.length>60?`<p>${t().moreItems}</p>`:'');
}

function cartHtml(){
  if(!S.cart.length)return `<p>${t().empty}</p>`;
  return S.cart.map(x=>`<div class=row><span>${clean(x.p.n)}<br><small>${fmt(x.pr*x.q)}</small></span><span class=q><button onclick="chg('${x.k}',-1)">-</button><b>${x.q}</b><button onclick="chg('${x.k}',1)">+</button></span></div>`).join('');
}

function lockView(){
  const x=t(),m=S.lock,msg=m==='enter'?x.pin1:m==='set1'?x.pin2:x.pin3;
  return `<div class=lockbox><h1>${msg}</h1><div class=dots>${[0,1,2,3].map(i=>`<i class="${i<S.buf.length?'f':''}"></i>`).join('')}</div><div class=pad>${[1,2,3,4,5,6,7,8,9,'',0,'<'].map(k=>k===''?'<span></span>':`<button onclick="pin('${k}')">${k==='<'?'&lt;':k}</button>`).join('')}</div><p style="margin-top:16px;font-size:12px">${x.pinNote}</p></div>`;
}

async function sha256Hex(str){
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function pin(k){
  if(Date.now()<S.pinUntil){toast(t().pinLockWait,3000);return}
  if(k==='<')S.buf=S.buf.slice(0,-1);else if(S.buf.length<4)S.buf+=k;
  if(S.buf.length===4){
    const b=S.buf;S.buf='';
    const h=await sha256Hex(b);
    if(S.lock==='enter'){
      if(h===localStorage.pinHash){S.lock='';S.pinFail=0}
      else{
        S.pinFail++;
        if(S.pinFail>=5){S.pinUntil=Date.now()+30000;S.pinFail=0;toast(t().pinLockWait,4000)}
        else toast(t().pinBad);
      }
    }else if(S.lock==='set1'){S.tmp=h;S.lock='set2'}
    else{if(h===S.tmp){localStorage.pinHash=h;delete localStorage.pin;S.lock='';S.pinFail=0}else{toast(t().pinBad);S.lock='set1'}}
  }
  render();
}
function lockNow(){S.buf='';S.lock=localStorage.pinHash?'enter':'set1';render()}
function changePin(){if(!isOwner())return;S.buf='';S.lock='set1';render()}

let hiddenAt=0;
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){hiddenAt=Date.now()}
  else if(hiddenAt&&Date.now()-hiddenAt>180000&&localStorage.pinHash){S.buf='';S.lock='enter';render()}
});

const V={
today(){
  const d=S.day,x=t(),low=P.filter(p=>!p.svc&&!p.com&&p.s<=p.m),tp=[...P].sort((a,b)=>b.sold-a.sold).slice(0,5).filter(p=>p.sold>0);
  const all=[...W,d.sales],mx=Math.max(...all,1),pr=d.sales-d.cost;
  const ownerCards=isOwner()
    ?`${card(x.profit,hid(pr))}${card(x.exp,fmt(d.exp))}${card(x.net,hid(pr-d.exp))}`
    :'';
  return `<h1>${x.today}</h1>
  <div class=grid>${card(x.sales,fmt(d.sales))}${card(x.cash,fmt(d.cash))}${card(x.udg,fmt(d.ud))}${card(x.comm,fmt(d.com))}${ownerCards}${card(x.bills,d.bills)}</div>
  ${isOwner()&&W.length?`<h2>${x.week}</h2><div class=bars>${all.map(v=>`<i style="height:${Math.max(4,Math.round(v/mx*100))}%"></i>`).join('')}</div>`:''}
  ${isOwner()?`<div class=seg style="margin-top:12px"><button class="btn alt" onclick="openExpModal()">${x.addExp}</button><button class="btn alt" onclick="openCloseDay()">${x.closeDay}</button></div>`:''}
  <h2>${x.low}</h2>${low.length?low.map(p=>`<div class=row><span>${clean(p.n)}</span><span class="tag red">${p.s}</span></div>`).join(''):`<p>${x.empty}</p>`}
  <h2>${x.top}</h2>${tp.length?tp.map(p=>`<div class=row><span>${clean(p.n)}</span><b>${p.sold}</b></div>`).join(''):`<p>${x.empty}</p>`}`;
},
sale(){
  const x=t(),e=S.cart.length?'':'disabled';
  return `<h1>${x.sale}</h1><div class=seg><input placeholder="${x.search}" value="${clean(S.q)}" oninput="setQ(this.value)" style="margin:0"><button class="btn alt" style="width:auto;padding:0 12px" onclick="startScan('sale')">${x.scan}</button></div>${chips()}<div id=list>${plist(1)}</div>
  <h2>${x.cart}</h2><div id=cart>${cartHtml()}</div>
  <input type=number inputmode=numeric placeholder="${x.disc}" value="${S.disc||''}" oninput="S.disc=+this.value||0;$('#tot').textContent=fmt(total())">
  <div class=row><span>${x.total}</span><b id=tot>${fmt(total())}</b></div>
  <div class=seg><button class=btn onclick="payBtn(0)" ${e}>${x.payC}</button><button class="btn alt" onclick="payBtn(1)" ${e}>${x.payU}</button></div>`;
},
stock(){
  const x=t();
  return `<h1>${x.stock}</h1><div class=seg><input placeholder="${x.search}" value="${clean(S.q)}" oninput="setQ(this.value)" style="margin:0"><button class="btn alt" style="width:auto;padding:0 12px" onclick="startScan('stock')">${x.scan}</button></div>${chips()}<div id=list>${plist(0)}</div>
  ${isOwner()?`<button class=fab onclick="openAdd()" aria-label="${x.add}">${ic('plus')}</button>`:''}`;
},
acc(){
  const x=t(),d=S.day;
  return `<h1>${x.acc}</h1>
  ${isOwner()?`<div class=row><span>${x.today}<br><small>${fmt(d.sales)}</small></span><b>${hid(d.sales-d.cost-d.exp)}</b></div>
  <div class=seg><button class="btn alt" onclick="openDayBillsModal()">${x.pickDay}</button><button class="btn alt" onclick="openMonthModal()">${x.monthRep}</button></div>`:''}
  <h2>${x.bToday}</h2>${B.length?B.map(b=>`<button class=row onclick="openBill('${b.id}')"><span>#${b.billNo}<br><small>${b.status==='cancelled'?x.bCancelled:(b.payment==='udhaar'?clean(b.customerName):x.bCash)}</small></span><b${b.status==='cancelled'?' style="opacity:.5;text-decoration:line-through"':''}>${fmt(b.total)}</b></button>`).join(''):`<p>${x.empty}</p>`}
  ${isOwner()?`<h2>${x.days}</h2>${D.length?D.map(r=>`<div class=row><span>${r[0]}<br><small>${fmt(r[1])}</small></span><b>${hid(r[2])}</b></div>`).join(''):`<p>${x.empty}</p>`}`:''}`;
},
udhaar(){
  const x=t(),q=(S.q||'').toLowerCase(),list=C.filter(c=>!q||(c.name||'').toLowerCase().includes(q)||(c.phone||'').includes(q));
  return `<h1>${x.ukhata}</h1>
  <input placeholder="${x.searchCust}" value="${clean(S.q)}" oninput="S.q=this.value;render()">
  <div class=seg><button class="btn alt" onclick="openNewUd()">${x.newU}</button>${isOwner()?`<button class="btn alt" onclick="confirmMigrateUd()">${x.migrateUd}</button>`:''}</div>
  <h2>${x.cust}</h2>${list.length?list.map(c=>`<button class=row onclick="openCust('${c.id}')"><span>${clean(c.name)}<br><small>${clean(c.phone||'')}</small></span><b>${fmt(c.balance||0)}</b></button>`).join(''):`<p>${x.empty}</p>`}`;
},
more(){
  const x=t();
  return `<h1>${x.more}</h1><h2>${x.lang}</h2>
  <div class=seg><button class="btn ${S.lang==='ur'?'':'alt'}" onclick="setLang('ur')">اردو</button><button class="btn ${S.lang==='rm'?'':'alt'}" onclick="setLang('rm')">Roman Urdu</button><button class="btn ${S.lang==='en'?'':'alt'}" onclick="setLang('en')">English</button></div>
  <button class=row onclick="go('udhaar')"><span>${x.ukhata}</span><span class=tag>${C.length}</span></button>
  ${isOwner()?`
  <button class=row onclick="openWalletsModal()"><span>${x.wallets}</span><span class=tag>${WAL.length}</span></button>
  <button class=row onclick="openSuppliersModal()"><span>${x.suppliers}</span><span class=tag>${SUP.length}</span></button>
  <button class=row onclick="openExpModal()"><span>${x.expTitle}</span><span class=tag>${fmt(S.day.exp)}</span></button>
  <button class=row onclick="openMonthModal()"><span>${x.monthRep}</span></button>
  <button class=row onclick="openStaffModal()"><span>${x.staff}</span></button>
  <button class=row onclick="openSettingsModal()"><span>${x.settings}</span></button>
  <button class=row onclick="openBackupModal()"><span>${x.backup} / ${x.csvExp}</span></button>
  <button class=row onclick="toggleHide()"><span>${x.hide}</span><span class=tag>${S.hide?'ON':'OFF'}</span></button>
  <button class=row onclick="setShop()"><span>${x.shop}</span><span class=tag>${clean(S.shop)}</span></button>
  <button class=row onclick="changePin()"><span>${x.chgpin}</span></button>
  <button class=row onclick="openDeleteShopModal()"><span>${x.delShop}</span><span class="tag red">!</span></button>
  `:''}
  <button class=row onclick="openDiag()"><span>${x.diag}</span></button>
  <button class=row onclick="doLogout()"><span>${x.logout}</span></button>`;
}
};

function render(){
  document.documentElement.dir=S.lang==='ur'?'rtl':'ltr';
  document.documentElement.lang=S.lang==='ur'?'ur':'en';
  document.body.className=(S.lang||'')+(S.dark?' dark':'');
  if(S.lock){$('#view').innerHTML=lockView();$('#nav').style.display='none';return}
  $('#nav').style.display='flex';
  $('#view').innerHTML=hdr()+(V[S.tab]||V.today)();
  const x=t();
  $('#nav').innerHTML=['today','sale','stock','acc','more'].map(k=>`<button class="${S.tab===k||(k==='more'&&S.tab==='udhaar')?'on':''}" onclick="go('${k}')">${ic(k)}<span>${x[k]}</span></button>`).join('');
}
let tmr;
function toast(m,ms){const e=$('#toast');e.textContent=m;e.style.display='block';clearTimeout(tmr);tmr=setTimeout(()=>e.style.display='none',ms||2200)}
function errCode(e){return String((e&&(e.code||e.message))||e||'unknown').slice(0,80)}
function showErr(e){const c=errCode(e);DIAG.err=c;toast(t().authErr+' ('+c+')',7000)}
function modal(h){$('#modal').innerHTML='<div>'+h+'</div>';$('#modal').style.display='block'}
function closeM(){$('#modal').style.display='none'}
function go(k){S.tab=k;S.q='';S.cat='';render();scrollTo(0,0)}
function setQ(v){S.q=v;if($('#list'))$('#list').innerHTML=plist(S.tab==='sale')}
function setCat(c){S.cat=c;render()}

let scanStream=null,scanTimer=null;
async function startScan(mode){
  const x=t();
  if(!('BarcodeDetector' in window)||!navigator.mediaDevices?.getUserMedia){toast(x.scanFail,3500);return}
  modal(`<h1>${x.scan}</h1><video id=sv autoplay playsinline style="width:100%;max-height:240px;border-radius:12px;background:#000"></video><button class="btn alt" style="margin-top:8px" onclick="stopScan()">${x.cancel}</button>`);
  try{
    scanStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    const vid=$('#sv');if(vid)vid.srcObject=scanStream;
    const det=new BarcodeDetector({formats:['ean_13','ean_8','code_128','code_39','qr_code','upc_a','upc_e']});
    scanTimer=setInterval(async()=>{
      if(!$('#sv')||!scanStream)return;
      try{
        const codes=await det.detect($('#sv'));
        if(codes&&codes.length){
          const code=codes[0].rawValue||'';
          stopScan();
          if(code){
            S.q=code;
            if(mode==='sale'){
              const hit=P.find(p=>p.bc===code);
              if(hit)addCart(hit.id);else render();
            }else render();
          }
        }
      }catch(_){}
    },400);
  }catch(e){stopScan();toast(x.scanFail,3500)}
}
function stopScan(){
  if(scanTimer){clearInterval(scanTimer);scanTimer=null}
  if(scanStream){scanStream.getTracks().forEach(tr=>tr.stop());scanStream=null}
  closeM();
}

function canAddQty(p,nextQ){
  if(p.svc||p.com)return true;
  if(S.cfg.allowNegativeStock)return true;
  return nextQ<=p.s;
}

function addCart(id){
  const p=P.find(z=>z.id===id);
  if(!p)return;
  if(p.com){
    modal(`<h1>${clean(p.n)}</h1><input id=cm type=number inputmode=numeric placeholder="${t().comAsk}"><div class=seg><button class="btn alt" onclick="closeM()">${t().cancel}</button><button class=btn onclick="addCom('${id}')">${t().ok}</button></div>`);
    return;
  }
  const l=S.cart.find(z=>z.p.id===id&&!z.p.com),q=l?l.q:0;
  if(!canAddQty(p,q+1)){toast(t().warn);return}
  if(l)l.q++;else S.cart.push({k:id,p:p,q:1,pr:p.p});
  render();
}
function addCom(id){
  const a=Math.round(+gv('cm')||0);
  if(!(a>0))return;
  const p=P.find(z=>z.id===id);
  if(!p)return;
  S.cart.push({k:id+'-'+Date.now(),p:p,q:1,pr:a});
  closeM();render();
}
function chg(k,d){
  const l=S.cart.find(z=>z.k===k);
  if(!l)return;
  if(d>0&&!l.p.com&&!canAddQty(l.p,l.q+d)){toast(t().warn);return}
  l.q+=d;if(l.q<=0)S.cart=S.cart.filter(z=>z!==l);
  render();
}

function payBtn(u){
  if(S.saving||!S.cart.length)return;
  if(u){
    const opts=C.map(c=>`<option value="${c.id}">${clean(c.name)} (${fmt(c.balance||0)})</option>`).join('');
    modal(`<h1>${t().ukhata}</h1>
    ${C.length?`<label>${t().searchCust}</label><select id=ucid onchange="pickExistingCust()"><option value="">-- ${t().newU} --</option>${opts}</select>`:''}
    <input id=un placeholder="${t().cust}"><input id=up type=tel inputmode=tel placeholder="${t().phone}">
    <div class=seg><button class="btn alt" onclick="closeM()">${t().cancel}</button><button class=btn onclick="udSave()">${t().ok}</button></div>`);
    return;
  }
  finish('','','');
}
function pickExistingCust(){
  const id=gv('ucid');
  if(!id)return;
  const c=C.find(z=>z.id===id);
  if(!c)return;
  if($('#un'))$('#un').value=c.name||'';
  if($('#up'))$('#up').value=c.phone||'';
}
function udSave(){
  const n=clean(gv('un'));
  if(!n){toast(t().cust);return}
  const ph=clean(gv('up'));
  const existing=C.find(z=>(z.name||'').trim().toLowerCase()===n.toLowerCase());
  finish(n,ph,existing?existing.id:'');
}
function stamp(){const d=new Date();return d.toLocaleDateString('en-GB')+' '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}

async function finish(name,phone,customerId){
  if(S.saving)return;
  S.saving=true;
  try{
    if(typeof DB==='undefined')throw new Error('DB-missing');
    if(!S.noReady){toast(t().wait);return}
    const L=S.cart.map(x=>{const ty=x.p.com?'commission':x.p.svc?'service':'item';return{x:x,ty:ty,amt:Math.round(x.pr*x.q),cost:ty==='commission'?0:(+x.p.c||0)}});
    if(!L.length)return;
    if(L.some(l=>l.ty==='item'&&!canAddQty(l.x.p,l.x.q))){toast(t().warn);return}
    const sb=L.reduce((a,l)=>a+l.amt,0);
    const disc=Math.min(Math.max(0,Math.round(+S.disc||0)),sb),tot=sb-disc;
    let left=disc;
    L.forEach((l,i)=>{const sh=i===L.length-1?left:Math.floor(disc*l.amt/(sb||1));l.sh=sh;left-=sh;l.profit=r2(l.amt-l.cost*l.x.q-sh)});
    const cost=r2(L.reduce((a,l)=>a+l.cost*l.x.q,0)),profit=r2(L.reduce((a,l)=>a+l.profit,0)),comm=r2(L.filter(l=>l.ty==='commission').reduce((a,l)=>a+l.profit,0));
    const no=S.no,ph=clean(phone||''),cn=clean(name||'');
    let cid=customerId||'';
    if(cn&&!cid&&DB.ensureCustomer){
      cid=await DB.ensureCustomer(cn,ph);
    }
    const sale={
      billNo:no,
      items:L.map(l=>({productId:l.x.p.id,name:l.x.p.n,qty:l.x.q,price:l.x.pr,amount:l.amt,costAtSale:l.cost,profit:l.profit,type:l.ty})),
      subtotal:sb,discount:disc,total:tot,cost:cost,profit:profit,commission:comm,
      payment:cn?'udhaar':'cash',customerName:cn,customerPhone:ph,customerId:cid
    };
    const pr=DB.sale(sale);
    S.no=no+1;
    const items=S.cart.map(x=>({n:x.p.n,q:x.q,pr:x.pr}));
    const curBal=cid?(C.find(z=>z.id===cid)?.balance||0):0;
    const R={no:no,date:stamp(),items:items,disc:disc,total:tot,name:cn,phone:ph,bal:cn?curBal+tot:0};
    S.cart=[];S.disc=0;S.rc=R;
    closeM();render();showRc();
    pr.catch(showErr);
  }catch(e){showErr(e)}
  finally{S.saving=false}
}

function rcHtml(R){
  const x=t(),ft=clean(S.cfg.billFooter||'');
  return `<div id=rcpt class=rc><b>${clean(S.shop)}</b><div>#${R.no} - ${R.date}</div>${R.name?`<div>${clean(R.name)}${R.phone?' - '+clean(R.phone):''}</div>`:''}<hr>${R.items.map(i=>`<div class=rl><span>${clean(i.n)} x${i.q}</span><span>${fmt(i.pr*i.q)}</span></div>`).join('')}<hr>${R.disc?`<div class=rl><span>${x.disc}</span><span>-${fmt(R.disc)}</span></div>`:''}<div class="rl big"><span>${x.total}</span><span>${fmt(R.total)}</span></div>${R.name?`<div class="rl big"><span>${x.rcBal}</span><span>${fmt(R.bal)}</span></div>`:''}<div>${x.thanks}</div>${ft?`<div>${ft}</div>`:''}</div>`;
}
function rcText(R){
  const x=t(),l=R.items.map(i=>`${i.n} x${i.q} = ${fmt(i.pr*i.q)}`).join('\n');
  return `*${S.shop}*\n#${R.no} - ${R.date}\n\n${l}\n\n${x.total}: ${fmt(R.total)}`+(R.name?`\n${x.rcBal}: ${fmt(R.bal)}\n${x.rmd}`:'')+`\n${x.thanks}`;
}
function waLink(ph,text){
  let d=(ph||'').replace(/\D/g,'');
  if(d.startsWith('0'))d='92'+d.slice(1);
  return 'https://wa.me/'+d+'?text='+encodeURIComponent(text);
}
function sendWa(){window.open(waLink(S.rc.phone,rcText(S.rc)),'_blank')}
function showRc(){
  const x=t();
  modal(rcHtml(S.rc)+`<div class=seg><button class=btn onclick="sendWa()">${x.wa}</button><button class="btn alt" onclick="window.print()">${x.prt}</button></div><button class="btn alt" onclick="closeM()">${x.done}</button>`);
  toast(x.saved+' #'+S.rc.no);
}

function openNewUd(){
  const x=t();
  modal(`<h1>${x.newU}</h1><input id=nn placeholder="${x.cust}"><input id=np type=tel inputmode=tel placeholder="${x.phone}"><input id=na type=number inputmode=numeric placeholder="${x.amt}"><div class=seg><button class="btn alt" onclick="closeM()">${x.cancel}</button><button class=btn onclick="newUdSave()">${x.ok}</button></div>`);
}
async function newUdSave(){
  if(S.busy)return;
  const n=clean(gv('nn')),a=Math.round(+gv('na')||0),ph=clean(gv('np'));
  if(!n||!(a>0)){toast(t().qtyBad);return}
  S.busy=true;
  try{
    await DB.addManualUdhaar(n,ph,a);
    closeM();toast(t().saved);
  }catch(e){showErr(e)}
  finally{S.busy=false}
}
async function openCust(cid){
  const c=C.find(z=>z.id===cid);if(!c)return;
  const x=t();
  modal(`<h1>${clean(c.name)}: ${fmt(c.balance||0)}</h1>${c.phone?`<p>${clean(c.phone)}</p>`:''}<p>${x.wait}</p><button class="btn alt" onclick="closeM()">${x.done}</button>`);
  try{
    const hist=await DB.customerHistory(cid);
    const billsHtml=hist.sales.length?hist.sales.map(b=>`<div class=row><span>#${b.billNo||'-'} · ${b.dayKey||''}<br><small>${b.status==='cancelled'?x.bCancelled:clean((b.items||[]).map(i=>i.name+' x'+i.qty).join(', '))}</small></span><b>${fmt(b.total)}</b></div>`).join(''):`<p>${x.empty}</p>`;
    const paysHtml=hist.payments.length?hist.payments.map(p=>`<div class=row><span>${p.dayKey||''}${p.note?' · '+clean(p.note):''}<br><small>${p.status==='cancelled'?x.bCancelled:x.payments}</small></span><span>${p.status!=='cancelled'&&isOwner()?`<button class="btn alt" style="width:auto;padding:0 10px" onclick="revPay('${p.id}','${cid}')">${x.reversePay}</button>`:''} <b>${fmt(p.amount)}</b></span></div>`).join(''):`<p>${x.empty}</p>`;
    modal(`<h1>${clean(c.name)}: ${fmt(c.balance||0)}</h1>${c.phone?`<p>${clean(c.phone)}</p>`:''}
    <input id=pa type=number inputmode=numeric placeholder="${x.amt}"><input id=pn placeholder="${x.expNote}">
    <div class=seg><button class="btn alt" onclick="closeM()">${x.cancel}</button><button class=btn onclick="payInFirebase('${cid}')">${x.recv}</button></div>
    <button class="btn alt" onclick="remindCust('${cid}')">${x.rcRem}</button>
    <h2>${x.bToday}</h2>${billsHtml}
    <h2>${x.payments}</h2>${paysHtml}
    <button class="btn alt" style="margin-top:8px" onclick="closeM()">${x.done}</button>`);
  }catch(e){showErr(e)}
}
async function payInFirebase(cid){
  if(S.busy)return;
  const c=C.find(z=>z.id===cid),a=Math.round(+gv('pa')||0);
  if(!c||!(a>0)||a>(c.balance||0)){toast(t().qtyBad);return}
  S.busy=true;
  try{await DB.receivePayment(cid,a,clean(gv('pn')));closeM();toast(t().saved)}
  catch(e){showErr(e)}finally{S.busy=false}
}
async function revPay(pid,cid){
  if(!isOwner()||S.busy||!confirm(t().sure))return;
  S.busy=true;
  try{await DB.reversePayment(pid);toast(t().payReversed);openCust(cid)}
  catch(e){showErr(e)}finally{S.busy=false}
}
function remindCust(cid){
  const c=C.find(z=>z.id===cid);if(!c)return;
  const x=t();
  window.open(waLink(c.phone,`*${S.shop}*\n${c.name}\n${x.rcBal}: ${fmt(c.balance||0)}\n${x.rmd}\n${x.thanks}`),'_blank');
}
function confirmMigrateUd(){
  if(!isOwner()||!confirm(t().migrateWarn)||S.busy)return;
  S.busy=true;
  DB.migrateOldUdhaar().then(()=>{toast(t().migrateDone);render()}).catch(showErr).finally(()=>{S.busy=false});
}

function shrink(f){
  return new Promise(res=>{
    const im=new Image();
    im.onload=()=>{
      const mk=(m,q)=>{const r=Math.min(1,m/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*r);c.height=Math.round(im.height*r);c.getContext('2d').drawImage(im,0,0,c.width,c.height);return c.toDataURL('image/jpeg',q)};
      URL.revokeObjectURL(im.src);
      res({full:mk(400,.6),th:mk(96,.6)});
    };
    im.onerror=()=>res({});
    im.src=URL.createObjectURL(f);
  });
}
function cats(){return `<datalist id=cl>${[...new Set(P.map(p=>p.cat))].map(c=>`<option value="${clean(c)}">`).join('')}</datalist>`}
function openAdd(){
  if(!isOwner())return;
  const x=t(),defMin=S.cfg.lowStockDefault||0;
  modal(`<h1>${x.add}</h1><input id=an placeholder="${x.name}"><input id=ap type=number inputmode=decimal placeholder="${x.price}"><input id=aq type=number inputmode=decimal placeholder="${x.qty}"><input id=af type=file accept="image/*" capture=environment>
  <button class="btn alt" onclick="$('#mf').style.display='block';this.remove()">${x.moreF}</button>
  <div id=mf style="display:none"><input id=ak list=cl placeholder="${x.cat}">${cats()}<input id=au placeholder="${x.unit}"><input id=ac type=number inputmode=decimal placeholder="${x.cost}"><input id=am2 type=number inputmode=numeric value="${defMin||''}" placeholder="${x.minStock}"><input id=ab placeholder="${x.barcode}"><select id=at><option value=item>${x.tItem}</option><option value=service>${x.svc}</option><option value=commission>${x.isCom}</option></select></div>
  <div class=seg style="margin-top:8px"><button class="btn alt" onclick="closeM()">${x.cancel}</button><button class=btn onclick="addP()">${x.add}</button></div>`);
}
async function addP(){
  if(!isOwner()||S.busy)return;
  const n=clean(gv('an')),tp=gv('at')||'item',p=+gv('ap');
  if(!n||(tp!=='commission'&&!(p>0))){toast(t().name+' / '+t().price);return}
  S.busy=true;
  try{
    const f=$('#af').files[0];
    const ph=f?await Promise.race([shrink(f),new Promise(r=>setTimeout(()=>r({}),3000))]):{};
    const o={name:n,category:clean(gv('ak'))||'General',unit:clean(gv('au')),salePrice:tp==='commission'?0:p,cost:Math.max(0,+gv('ac')||0),stock:tp==='item'?Math.max(0,+gv('aq')||0):0,minStock:Math.max(0,+gv('am2')||0),barcode:clean(gv('ab')),type:tp,thumb:ph.th||'',full:ph.full||''};
    const pr=DB.add(o);closeM();toast(t().added);pr.catch(showErr);
  }catch(e){showErr(e)}finally{S.busy=false}
}
function openProd(id){
  const p=P.find(z=>z.id===id);if(!p)return;
  const x=t(),ns=p.svc||p.com;
  modal(`<h1>${clean(p.n)}</h1><div id=pp></div><p>${p.com?'':fmt(p.p)}${ns?'':' - '+p.s+' '+clean(p.unit)}</p>
  ${isOwner()&&!ns?`<button class=btn onclick="openIn('${id}')">${x.stockIn}</button>`:''}
  ${isOwner()?`<button class="btn alt" style="margin-top:8px" onclick="openEdit('${id}')">${x.edit}</button><button class="btn alt" style="margin-top:8px" onclick="arch('${id}')">${x.del}</button>`:''}
  <button class="btn alt" style="margin-top:8px" onclick="closeM()">${x.done}</button>`);
  if(p.th)DB.photo(id).then(b=>{if(b&&$('#pp'))$('#pp').innerHTML=`<img class=big src="${b}" alt="">`}).catch(()=>{});
}
function openEdit(id){
  if(!isOwner())return;
  const p=P.find(z=>z.id===id),x=t();
  modal(`<h1>${x.edit}</h1><input id=an value="${clean(p.n)}"><input id=ak list=cl value="${clean(p.cat)}">${cats()}<input id=au value="${clean(p.unit)}" placeholder="${x.unit}"><input id=ap type=number inputmode=decimal value="${p.p}" placeholder="${x.price}"><input id=am2 type=number inputmode=numeric value="${p.m}" placeholder="${x.minStock}"><input id=ab value="${clean(p.bc)}" placeholder="${x.barcode}"><input id=af type=file accept="image/*" capture=environment>
  <div class=seg style="margin-top:8px"><button class="btn alt" onclick="closeM()">${x.cancel}</button><button class=btn onclick="editSave('${id}')">${x.ok}</button></div>`);
}
async function editSave(id){
  if(!isOwner()||S.busy)return;
  const n=clean(gv('an'));if(!n){toast(t().name);return}
  S.busy=true;
  try{
    const f=$('#af').files[0];
    const ph=f?await Promise.race([shrink(f),new Promise(r=>setTimeout(()=>r({}),3000))]):{};
    const o={name:n,category:clean(gv('ak'))||'General',unit:clean(gv('au')),salePrice:Math.max(0,+gv('ap')||0),minStock:Math.max(0,+gv('am2')||0),barcode:clean(gv('ab'))};
    if(ph.th){o.thumb=ph.th;o.full=ph.full}
    const pr=DB.edit(id,o);closeM();toast(t().updated);pr.catch(showErr);
  }catch(e){showErr(e)}finally{S.busy=false}
}
function arch(id){
  if(!isOwner()||!confirm(t().sure))return;
  try{const pr=DB.archive(id);closeM();toast(t().removed);pr.catch(showErr)}catch(e){showErr(e)}
}
function newAvg(p,q,uc){const o=Math.max(0,p.s),n=o+q;return n>0?Math.round((o*p.c+q*uc)/n*100)/100:uc}
function openIn(id){
  if(!isOwner())return;
  const p=P.find(z=>z.id===id),x=t();
  const supOpts=SUP.map(s=>`<option value="${s.id}">${clean(s.name)} (${fmt(s.balance||0)})</option>`).join('');
  modal(`<h1>${clean(p.n)}</h1><p>${x.qty}: ${p.s} ${clean(p.unit)}</p>
  <input id=iq type=number inputmode=decimal placeholder="${x.qty}" oninput="pvIn('${id}')">
  <input id=ic type=number inputmode=decimal value="${p.c||''}" placeholder="${x.cost}" oninput="pvIn('${id}')">
  <select id=isup><option value="">-- ${x.suppliers} --</option>${supOpts}</select>
  <input id=ipaid type=number inputmode=numeric placeholder="${x.paidAmt}">
  <p id=pv></p>
  <div class=seg><button class="btn alt" onclick="closeM()">${x.cancel}</button><button class=btn onclick="inSave('${id}')">${x.ok}</button></div>`);
}
function pvIn(id){
  const p=P.find(z=>z.id===id),q=+gv('iq'),uc=+gv('ic');
  if($('#pv'))$('#pv').textContent=q>0&&uc>=0?t().newAvg+': '+fmt(newAvg(p,q,uc)):'';
}
function inSave(id){
  if(!isOwner())return;
  const p=P.find(z=>z.id===id),q=+gv('iq'),uc=+gv('ic');
  if(!(q>0)||gv('ic')===''||!(uc>=0)){toast(t().qtyBad);return}
  const supId=gv('isup');
  const paidRaw=gv('ipaid');
  const paid=paidRaw===''?Math.round(q*uc):Math.max(0,Math.round(+paidRaw||0));
  try{
    const pr=DB.stockIn(p,q,uc,newAvg(p,q,uc),supId?{supplierId:supId,paid}:null);
    closeM();toast(t().stockAdded);pr.catch(showErr);
  }catch(e){showErr(e)}
}

function openBill(id){
  const b=B.find(z=>z.id===id);if(!b)return;
  const x=t();
  modal(`<h1>#${b.billNo}${b.status==='cancelled'?' - '+x.bCancelled:''}</h1><p>${b.dayKey||''}</p>${b.customerName?`<p>${clean(b.customerName)}</p>`:''}${b.items.map(i=>`<div class=row><span>${clean(i.name)} x${i.qty}</span><b>${fmt(i.amount)}</b></div>`).join('')}${b.discount?`<div class=row><span>${x.disc}</span><b>-${fmt(b.discount)}</b></div>`:''}<div class=row><span>${x.total}</span><b>${fmt(b.total)}</b></div>
  ${b.status==='active'&&isOwner()?`<div class=seg><button class="btn alt" onclick="openReturnModal('${b.id}')">${x.returnItem}</button><button class=btn onclick="askCancel('${b.id}')">${x.bCancel}</button></div>`:''}
  <button class="btn alt" onclick="closeM()">${x.done}</button>`);
}
function askCancel(id){
  if(!isOwner())return;
  const b=B.find(z=>z.id===id);if(!b)return;
  const x=t(),isClosed=S.day.closed&&(b.dayKey===DB.dayKey());
  modal(`<h1>${x.bCancel} #${b.billNo}</h1><p>${x.bCancelAsk}</p>${isClosed?`<div class=note>${x.dayIsClosed}</div>`:''}<div class=seg><button class="btn alt" onclick="closeM()">${x.cancel}</button><button class=btn onclick="doCancel('${id}')">${x.ok}</button></div>`);
}
function doCancel(id){
  if(!isOwner()||S.busy)return;
  S.busy=true;
  try{
    const b=B.find(z=>z.id===id);if(!b||b.status!=='active')return;
    const pr=DB.cancel(b);closeM();toast(t().bDone);pr.catch(showErr);
  }catch(e){showErr(e)}finally{S.busy=false}
}
function openReturnModal(id){
  if(!isOwner())return;
  const b=B.find(z=>z.id===id);if(!b)return;
  const x=t();
  modal(`<h1>${x.returnTitle} #${b.billNo}</h1>${b.items.map((i,idx)=>`<div class=row><span>${clean(i.name)} (${x.qty}: ${i.qty})</span><input id="rq${idx}" type=number min=0 max=${i.qty} value=0 style="width:84px;margin:0"></div>`).join('')}<div class=seg style="margin-top:8px"><button class="btn alt" onclick="closeM()">${x.cancel}</button><button class=btn onclick="saveReturn('${id}')">${x.ok}</button></div>`);
}
async function saveReturn(id){
  if(!isOwner()||S.busy)return;
  const b=B.find(z=>z.id===id);if(!b||b.status!=='active')return;
  const retItems=[];
  b.items.forEach((it,idx)=>{
    const rq=Math.min(it.qty,Math.max(0,Math.round(+gv('rq'+idx)||0)));
    if(rq>0)retItems.push({productId:it.productId,name:it.name,qty:rq,price:it.price,costAtSale:it.costAtSale||0,type:it.type||'item'});
  });
  if(!retItems.length){toast(t().qtyBad);return}
  S.busy=true;
  try{await DB.returnSale(b,retItems);closeM();toast(t().returnDone)}
  catch(e){showErr(e)}finally{S.busy=false}
}

async function openDayBillsModal(){
  if(!isOwner())return;
  const x=t(),defDay=DB.dayKey();
  modal(`<h1>${x.pickDay}</h1><input id=pday type=date value="${defDay}"><button class=btn onclick="loadDayBills()">${x.ok}</button><div id=daybills style="margin-top:10px"></div><button class="btn alt" style="margin-top:8px" onclick="closeM()">${x.done}</button>`);
  loadDayBills();
}
async function loadDayBills(){
  const dk=gv('pday')||DB.dayKey(),x=t();
  $('#daybills').innerHTML=`<p>${x.wait}</p>`;
  try{
    const list=await DB.salesByDay(dk);
    $('#daybills').innerHTML=list.length?list.map(b=>`<div class=row><span>#${b.billNo} · ${b.payment==='udhaar'?clean(b.customerName):x.bCash} ${b.status==='cancelled'?'('+x.bCancelled+')':''}</span><b>${fmt(b.total)}</b></div>`).join(''):`<p>${x.empty}</p>`;
  }catch(e){showErr(e)}
}
async function openMonthModal(){
  if(!isOwner())return;
  const x=t(),ym=DB.dayKey().slice(0,7);
  modal(`<h1>${x.monthRep}</h1><input id=pmon type=month value="${ym}"><button class=btn onclick="runMonthRep()">${x.ok}</button><div id=mres style="margin-top:10px"></div><button class="btn alt" style="margin-top:8px" onclick="closeM()">${x.done}</button>`);
  runMonthRep();
}
async function runMonthRep(){
  const ym=gv('pmon')||DB.dayKey().slice(0,7),x=t();
  $('#mres').innerHTML=`<p>${x.wait}</p>`;
  try{
    const rows=await DB.monthDaily(ym);
    const sales=rows.reduce((a,r)=>a+(+r.sales||0),0);
    const cost=rows.reduce((a,r)=>a+(+r.cost||0),0);
    const exp=rows.reduce((a,r)=>a+(+r.expenses||0),0);
    const bills=rows.reduce((a,r)=>a+(+r.bills||0),0);
    const gross=sales-cost,net=gross-exp;
    const mx=Math.max(...rows.map(r=>+r.sales||0),1);
    const txt=`*${S.shop}* - ${x.monthRep} (${ym})\n${x.sales}: ${fmt(sales)}\n${x.profit}: ${fmt(gross)}\n${x.exp}: ${fmt(exp)}\n${x.net}: ${fmt(net)}\n${x.bills}: ${bills}`;
    $('#mres').innerHTML=`<div class=grid>${card(x.sales,fmt(sales))}${card(x.profit,hid(gross))}${card(x.exp,fmt(exp))}${card(x.net,hid(net))}${card(x.bills,bills)}${card(x.days,rows.length)}</div>
    ${rows.length?`<h2>${x.month}</h2><div class=bars>${rows.map(r=>`<i style="height:${Math.max(4,Math.round((+r.sales||0)/mx*100))}%"></i>`).join('')}</div>`:''}
    <button class=btn style="margin-top:10px" onclick="window.open(waLink('',${JSON.stringify(txt)}),'_blank')">${x.shareRep}</button>`;
  }catch(e){showErr(e)}
}

async function openExpModal(){
  if(!isOwner())return;
  const x=t();
  modal(`<h1>${x.expTitle}</h1><input id=ea type=number inputmode=numeric placeholder="${x.amt}"><input id=ec placeholder="${x.expCat}"><input id=en placeholder="${x.expNote}"><button class=btn onclick="saveExp()">${x.addExp}</button><div id=elist style="margin-top:12px"></div><button class="btn alt" style="margin-top:8px" onclick="closeM()">${x.done}</button>`);
  loadTodayExp();
}
async function loadTodayExp(){
  const x=t();
  try{
    const list=await DB.expensesByDay(DB.dayKey());
    if(!$('#elist'))return;
    $('#elist').innerHTML=list.length?list.map(e=>`<div class=row><span>${clean(e.category||'Other')}${e.note?' · '+clean(e.note):''}</span><span>${e.status!=='cancelled'?`<button class="btn alt" style="width:auto;padding:0 10px" onclick="cancelExp('${e.id}')">${x.cancel}</button>`:`<span class=tag>${x.bCancelled}</span>`} <b>${fmt(e.amount)}</b></span></div>`).join(''):`<p>${x.empty}</p>`;
  }catch(e){showErr(e)}
}
async function saveExp(){
  if(!isOwner()||S.busy)return;
  const a=Math.round(+gv('ea')||0),cat=clean(gv('ec'))||'Other',note=clean(gv('en'));
  if(!(a>0)){toast(t().qtyBad);return}
  S.busy=true;
  try{await DB.addExpense(a,cat,note);toast(t().expSaved);openExpModal()}
  catch(e){showErr(e)}finally{S.busy=false}
}
async function cancelExp(eid){
  if(!isOwner()||S.busy||!confirm(t().sure))return;
  S.busy=true;
  try{await DB.cancelExpense(eid);toast(t().expCancelled);openExpModal()}
  catch(e){showErr(e)}finally{S.busy=false}
}

function openCloseDay(){
  if(!isOwner())return;
  const x=t(),d=S.day;
  const est=(+d.cash||0)-(+d.cashOut||0);
  modal(`<h1>${x.closeDay}</h1>
  <div class=row><span>${x.estCash}</span><b>${fmt(est)}</b></div>
  <input id=ccash type=number inputmode=numeric value="${d.countedCash||''}" placeholder="${x.countedCash}" oninput="calcDiff(${est})">
  <div class=row><span>${x.diffCash}</span><b id=cdiff>${fmt(0)}</b></div>
  <input id=cnote placeholder="${x.closeNote}">
  <div class=seg><button class="btn alt" onclick="closeM()">${x.cancel}</button><button class=btn onclick="doCloseDay(${est})">${x.closeDay}</button></div>`);
}
function calcDiff(est){
  const v=+gv('ccash')||0;
  if($('#cdiff'))$('#cdiff').textContent=fmt(v-est);
}
async function doCloseDay(est){
  if(!isOwner()||S.busy||!confirm(t().closeConfirm))return;
  const counted=Math.max(0,Math.round(+gv('ccash')||0));
  S.busy=true;
  try{await DB.closeDay(counted,counted-est,clean(gv('cnote')));closeM();toast(t().dayClosed)}
  catch(e){showErr(e)}finally{S.busy=false}
}

async function openWalletsModal(){
  if(!isOwner())return;
  const x=t(),d=S.day,estCash=(+d.cash||0)-(+d.cashOut||0);
  const wOpts=WAL.map(w=>`<option value="${w.id}">${clean(w.name)} (${fmt(w.balance||0)})</option>`).join('');
  modal(`<h1>${x.wallets}</h1>
  <div class=row><span>${x.estCash}</span><b>${fmt(estCash)}</b></div>
  ${WAL.length?WAL.map(w=>`<div class=row><span>${clean(w.name)}</span><b>${fmt(w.balance||0)}</b></div>`).join(''):`<p>${x.empty}</p>`}
  <h2>${x.addWallet}</h2>
  <input id=wn placeholder="${x.name}"><input id=wb type=number inputmode=numeric placeholder="${x.openBal}">
  <button class="btn alt" onclick="saveNewWallet()">${x.addWallet}</button>
  ${WAL.length?`<h2>${x.wSend} / ${x.wRecv}</h2>
  <select id=wsel>${wOpts}</select>
  <select id=wtype><option value=send>${x.wSend}</option><option value=receive>${x.wRecv}</option><option value=topup>${x.wTopup}</option><option value=withdraw>${x.wWithdraw}</option></select>
  <input id=wamt type=number inputmode=numeric placeholder="${x.amt}">
  <input id=wfee type=number inputmode=numeric placeholder="${x.fee}">
  <label class=row><input id=wsep type=checkbox style="width:auto;margin:0"><span>${x.sepFeeCash}</span></label>
  <button class=btn onclick="saveWalletTx()">${x.ok}</button>`:''}
  <div id=wtxlist style="margin-top:10px"></div>
  <button class="btn alt" style="margin-top:8px" onclick="closeM()">${x.done}</button>`);
  try{
    const list=await DB.todayWalletTx(DB.dayKey());
    if($('#wtxlist'))$('#wtxlist').innerHTML=list.length?`<h2>${x.today}</h2>`+list.map(z=>`<div class=row><span>${clean(z.type)} (${x.fee}: ${fmt(z.fee||0)})</span><b>${fmt(z.amount)}</b></div>`).join(''):'';
  }catch(_){}
}
async function saveNewWallet(){
  if(!isOwner()||S.busy)return;
  const n=clean(gv('wn')),b=+gv('wb')||0;
  if(!n){toast(t().name);return}
  S.busy=true;
  try{await DB.addWallet(n,b);toast(t().saved);openWalletsModal()}
  catch(e){showErr(e)}finally{S.busy=false}
}
async function saveWalletTx(){
  if(!isOwner()||S.busy)return;
  const wid=gv('wsel'),ty=gv('wtype'),amt=Math.round(+gv('wamt')||0),fee=Math.round(+gv('wfee')||0),sep=!!$('#wsep')?.checked;
  if(!wid||!(amt>0)||fee<0){toast(t().qtyBad);return}
  S.busy=true;
  try{await DB.walletTx(wid,ty,amt,fee,sep);toast(t().saved);openWalletsModal()}
  catch(e){showErr(e)}finally{S.busy=false}
}

function openSuppliersModal(){
  if(!isOwner())return;
  const x=t();
  modal(`<h1>${x.suppliers}</h1>
  <input id=sn placeholder="${x.name}"><input id=sp type=tel inputmode=tel placeholder="${x.phone}">
  <button class="btn alt" onclick="saveNewSup()">${x.addSup}</button>
  <h2>${x.suppliers}</h2>
  ${SUP.length?SUP.map(s=>`<button class=row onclick="openSupDetail('${s.id}')"><span>${clean(s.name)}<br><small>${clean(s.phone||'')}</small></span><b>${fmt(s.balance||0)}</b></button>`).join(''):`<p>${x.empty}</p>`}
  <button class="btn alt" style="margin-top:8px" onclick="closeM()">${x.done}</button>`);
}
async function saveNewSup(){
  if(!isOwner()||S.busy)return;
  const n=clean(gv('sn')),ph=clean(gv('sp'));
  if(!n){toast(t().name);return}
  S.busy=true;
  try{await DB.addSupplier(n,ph);toast(t().saved);openSuppliersModal()}
  catch(e){showErr(e)}finally{S.busy=false}
}
async function openSupDetail(sid){
  const s=SUP.find(z=>z.id===sid);if(!s)return;
  const x=t();
  modal(`<h1>${clean(s.name)}: ${fmt(s.balance||0)}</h1><p>${x.wait}</p><button class="btn alt" onclick="closeM()">${x.done}</button>`);
  try{
    const hist=await DB.supplierHistory(sid);
    modal(`<h1>${clean(s.name)}: ${fmt(s.balance||0)}</h1>
    <input id=spay type=number inputmode=numeric placeholder="${x.amt}">
    <button class=btn onclick="doPaySup('${sid}')">${x.paySup}</button>
    <h2>${x.stockIn}</h2>${hist.stockIns.map(z=>`<div class=row><span>${z.dayKey||''} · ${x.qty} ${z.qty}</span><b>${fmt(z.total||0)}</b></div>`).join('')||`<p>${x.empty}</p>`}
    <h2>${x.payments}</h2>${hist.payments.map(z=>`<div class=row><span>${z.dayKey||''}</span><b>${fmt(z.amount||0)}</b></div>`).join('')||`<p>${x.empty}</p>`}
    <button class="btn alt" style="margin-top:8px" onclick="openSuppliersModal()">${x.done}</button>`);
  }catch(e){showErr(e)}
}
async function doPaySup(sid){
  if(!isOwner()||S.busy)return;
  const s=SUP.find(z=>z.id===sid),a=Math.round(+gv('spay')||0);
  if(!s||!(a>0)||a>(s.balance||0)){toast(t().qtyBad);return}
  S.busy=true;
  try{await DB.paySupplier(sid,a);toast(t().saved);openSupDetail(sid)}
  catch(e){showErr(e)}finally{S.busy=false}
}

async function openStaffModal(){
  if(!isOwner())return;
  const x=t();
  modal(`<h1>${x.staff}</h1><div class=note>${x.costNote}</div><button class=btn onclick="makeStaffCode()">${x.genInvite}</button><div id=invout style="margin:10px 0"></div><div id=memlist></div><button class="btn alt" style="margin-top:8px" onclick="closeM()">${x.done}</button>`);
  try{
    const ms=await DB.listMembers();
    if($('#memlist'))$('#memlist').innerHTML=ms.map(m=>`<div class=row><span>${clean(m.name||m.id)} <small>(${m.role})</small></span><button class="btn alt" style="width:auto;padding:0 10px" onclick="flipMem('${m.id}',${m.active===false?true:false})">${m.active===false?'OFF':'ON'}</button></div>`).join('');
  }catch(_){}
}
async function makeStaffCode(){
  if(!isOwner()||S.busy)return;
  S.busy=true;
  try{
    const code=await DB.createInvite();
    if($('#invout'))$('#invout').innerHTML=`<div class=row><span>Invite Code</span><b>${code}</b></div>`;
  }catch(e){showErr(e)}finally{S.busy=false}
}
async function flipMem(mid,act){
  if(!isOwner()||S.busy)return;
  S.busy=true;
  try{await DB.toggleMember(mid,act);openStaffModal()}
  catch(e){showErr(e)}finally{S.busy=false}
}

function openSettingsModal(){
  if(!isOwner())return;
  const x=t(),c=S.cfg;
  modal(`<h1>${x.settings}</h1>
  <label>${x.dayStart}</label><input id=sds value="${clean(c.dayStart||'00:00')}" placeholder="00:00">
  <label>${x.lowDef}</label><input id=sld type=number inputmode=numeric value="${c.lowStockDefault||0}">
  <label>${x.billFooter}</label><input id=sbf value="${clean(c.billFooter||'')}">
  <label class=row><input id=sneg type=checkbox ${c.allowNegativeStock?'checked':''} style="width:auto;margin:0"><span>${x.negStock}</span></label>
  <label class=row><input id=sdark type=checkbox ${S.dark?'checked':''} style="width:auto;margin:0"><span>${x.darkMode}</span></label>
  <button class=btn onclick="saveSettings()">${x.ok}</button>
  <button class="btn alt" style="margin-top:8px" onclick="window.open('privacy.html','_blank')">${x.privPolicy}</button>
  <button class="btn alt" style="margin-top:8px" onclick="closeM()">${x.done}</button>`);
}
async function saveSettings(){
  if(!isOwner()||S.busy)return;
  S.busy=true;
  try{
    const ds=(gv('sds')||'00:00').trim()||'00:00';
    const ld=Math.max(0,Math.round(+gv('sld')||0));
    const bf=clean(gv('sbf'));
    const neg=!!$('#sneg')?.checked;
    const dk=!!$('#sdark')?.checked;
    S.dark=dk;localStorage.dark=dk?'1':'0';applyTheme();
    S.cfg={dayStart:ds,lowStockDefault:ld,billFooter:bf,allowNegativeStock:neg};
    await DB.saveSettings(S.cfg);
    closeM();toast(t().updated);render();
  }catch(e){showErr(e)}finally{S.busy=false}
}

function openBackupModal(){
  if(!isOwner())return;
  const x=t();
  modal(`<h1>${x.backup} / ${x.csvExp}</h1>
  <button class=btn onclick="doJsonBackup()">${x.backup}</button>
  <button class="btn alt" style="margin-top:8px" onclick="doCsvExport()">${x.csvExp}</button>
  <div class=note style="margin-top:12px">${x.restoreWarn}</div>
  <input id=rfile type=file accept="application/json">
  <button class="btn alt" onclick="doRestore()">${x.restore}</button>
  <button class="btn alt" style="margin-top:8px" onclick="closeM()">${x.done}</button>`);
}
async function doJsonBackup(){
  if(!isOwner()||S.busy)return;
  S.busy=true;
  try{
    const data=await DB.buildBackup();
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`munafa-backup-${DB.dayKey()}.json`;a.click();URL.revokeObjectURL(url);
    toast(t().updated);
  }catch(e){showErr(e)}finally{S.busy=false}
}
function csvRow(arr){return arr.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')}
function doCsvExport(){
  const lines=[
    '# STOCK',
    csvRow(['Name','Category','Stock','Price','Cost','Sold']),
    ...P.map(p=>csvRow([p.n,p.cat,p.s,p.p,p.c,p.sold])),
    '# TODAY BILLS',
    csvRow(['BillNo','Day','Payment','Customer','Total','Profit','Status']),
    ...B.map(b=>csvRow([b.billNo,b.dayKey,b.payment,b.customerName,b.total,b.profit,b.status])),
    '# CUSTOMERS',
    csvRow(['Name','Phone','Balance']),
    ...C.map(c=>csvRow([c.name,c.phone,c.balance]))
  ];
  const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`munafa-export-${DB.dayKey()}.csv`;a.click();URL.revokeObjectURL(url);
  toast(t().updated);
}
async function doRestore(){
  if(!isOwner()||S.busy)return;
  const f=$('#rfile')?.files?.[0];
  if(!f||!confirm(t().restoreWarn))return;
  S.busy=true;
  try{
    const txt=await f.text();
    const json=JSON.parse(txt);
    await DB.restoreBackup(json);
    closeM();toast(t().updated);render();
  }catch(e){showErr(e)}finally{S.busy=false}
}

function openDeleteShopModal(){
  if(!isOwner())return;
  const x=t();
  modal(`<h1>${x.delShop}</h1><div class=note>${x.delWarn} <b>${clean(S.shop)}</b></div>
  <input id=delconf placeholder="${clean(S.shop)}">
  <div class=seg><button class="btn alt" onclick="closeM()">${x.cancel}</button><button class=btn onclick="confirmDeleteShop()">${x.del}</button></div>`);
}
async function confirmDeleteShop(){
  if(!isOwner()||S.busy)return;
  if(gv('delconf').trim()!==S.shop.trim()){toast(t().sure);return}
  S.busy=true;
  try{
    await DB.deleteAllShopData();
    closeM();toast(t().removed);
  }catch(e){showErr(e)}finally{S.busy=false}
}

function openDiag(){
  const x=t(),u=window.UID,yn=v=>v?x.dYes:x.dNo;
  const r=(a,b)=>`<div class=row><span>${a}</span><b>${b}</b></div>`;
  modal(`<h1>${x.diag}</h1>${r(x.dLogin,yn(u))}${r(x.dUid,u?u.slice(0,6):'-')}${r(x.dItems,P.length)}${r(x.dDb,yn(typeof DB!=='undefined'))}${r(x.dListen,DIAG.listen+' / '+DIAG.snap)}${r(x.dNet,yn(navigator.onLine))}${r(x.dErr,clean(DIAG.err)||'-')}<button class="btn alt" onclick="closeM()">${x.done}</button>`);
}
function setShop(){if(!isOwner())return;const v=prompt(t().shop,S.shop);if(v&&v.trim()){S.shop=v.trim();localStorage.shop=S.shop;render()}}
function setLang(l){S.lang=l;localStorage.lang=l;render()}
function toggleHide(){if(!isOwner())return;S.hide=!S.hide;localStorage.hide=S.hide?'1':'0';render()}
applyTheme();
render();
