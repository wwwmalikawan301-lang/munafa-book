const $=s=>document.querySelector(s);
const DIAG={err:'',snap:0,listen:'-'};
window.addEventListener('error',e=>{DIAG.err=String(e.message||'error').slice(0,80)});
window.addEventListener('unhandledrejection',e=>{DIAG.err=errCode(e.reason)});
const fmt=n=>'Rs '+Math.round(n).toLocaleString('en-US');
const r2=v=>Math.round(v*100)/100;
const S={loading:false,busy:false,shop:localStorage.shop||'Meri Dukan',rc:null,lang:localStorage.lang||'rm',hide:localStorage.hide==='1',tab:'today',q:'',cat:'',cart:[],disc:0,saving:false,no:1,buf:'',tmp:'',lock:localStorage.pin?'enter':'set1',day:{sales:0,cash:0,ud:0,com:0,cost:0,exp:0,bills:0}};
const P=[];
const C=[];
const B=[];
const W=[];
const D=[];
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
const t=()=>T[S.lang];
const hid=n=>S.hide?'Rs ****':fmt(n);
const card=(l,v)=>`<div class=card><span>${l}</span><b>${v}</b></div>`;
const sub=()=>S.cart.reduce((a,x)=>a+Math.round(x.pr*x.q),0);
const total=()=>Math.max(0,sub()-S.disc);
const hdr=()=>`<div class=top><b>Munafa Book</b><span><button class=ib onclick="toggleHide()" aria-label="hide">${ic(S.hide?'eyeoff':'eye')}</button><button class=ib onclick="lockNow()" aria-label="lock">${ic('lock')}</button></span></div>`;

function chips(){
  const cs=[...new Set(P.map(p=>p.cat))];
  return `<div class=chips><button class="chip ${S.cat?'':'on'}" onclick="setCat('')">${t().all}</button>${cs.map(c=>`<button class="chip ${S.cat===c?'on':''}" onclick="setCat('${c}')">${c}</button>`).join('')}</div>`;
}
const clean=v=>String(v||'').replace(/[<>"'`]/g,'').trim();
function plist(sale){
  if(S.loading)return `<p>${t().wait}</p>`;
  const q=S.q.toLowerCase(),a=P.filter(p=>(p.n.toLowerCase().includes(q)||(p.bc&&p.bc===S.q))&&(!S.cat||p.cat===S.cat));
  if(!a.length)return `<p>${t().empty}</p>`;
  return a.slice(0,100).map(p=>{
    const tag=p.com?`<span class=tag>${t().comTag}</span>`:p.svc?`<span class=tag>${t().svc}</span>`:(p.s<=0?`<span class="tag red">${t().out}</span>`:`<span class=tag>${p.s}</span>`);
    const img=p.th?`<img class=th src="${p.th}" alt="">`:'';
    const body=`<span class=pl>${img}<span>${p.n}<br><small>${p.com?'':fmt(p.p)+(p.unit?' / '+p.unit:'')}</small></span></span>${tag}`;
    return `<button class=row onclick="${sale?`addCart('${p.id}')`:`openProd('${p.id}')`}">${body}</button>`;
  }).join('')+(a.length>100?`<p>${t().moreItems}</p>`:'');
}
function cartHtml(){
  if(!S.cart.length)return `<p>${t().empty}</p>`;
  return S.cart.map(x=>`<div class=row><span>${x.p.n}<br><small>${fmt(x.pr*x.q)}</small></span><span class=q><button onclick="chg('${x.k}',-1)">-</button><b>${x.q}</b><button onclick="chg('${x.k}',1)">+</button></span></div>`).join('');
}
function lockView(){
  const x=t(),m=S.lock,msg=m==='enter'?x.pin1:m==='set1'?x.pin2:x.pin3;
  return `<div class=lockbox><h1>${msg}</h1><div class=dots>${[0,1,2,3].map(i=>`<i class="${i<S.buf.length?'f':''}"></i>`).join('')}</div><div class=pad>${[1,2,3,4,5,6,7,8,9,'',0,'<'].map(k=>k===''?'<span></span>':`<button onclick="pin('${k}')">${k==='<'?'&lt;':k}</button>`).join('')}</div></div>`;
}

const V={
today(){
  const d=S.day,x=t(),low=P.filter(p=>!p.svc&&!p.com&&p.s<=p.m),tp=[...P].sort((a,b)=>b.sold-a.sold).slice(0,5).filter(p=>p.sold>0);
  const all=[...W,d.sales],mx=Math.max(...all,1),pr=d.sales-d.cost;
  return `<h1>${x.today}</h1><div class=grid>${card(x.sales,fmt(d.sales))}${card(x.cash,fmt(d.cash))}${card(x.udg,fmt(d.ud))}${card(x.comm,fmt(d.com))}${card(x.profit,hid(pr))}${card(x.exp,fmt(d.exp))}${card(x.net,hid(pr-d.exp))}${card(x.bills,d.bills)}</div>
  ${W.length?`<h2>${x.week}</h2><div class=bars>${all.map(v=>`<i style="height:${Math.round(v/mx*100)}%"></i>`).join('')}</div>`:''}
  <h2>${x.low}</h2>${low.length?low.map(p=>`<div class=row><span>${p.n}</span><span class="tag red">${p.s}</span></div>`).join(''):`<p>${x.empty}</p>`}
  <h2>${x.top}</h2>${tp.length?tp.map(p=>`<div class=row><span>${p.n}</span><b>${p.sold}</b></div>`).join(''):`<p>${x.empty}</p>`}`;
},
sale(){
  const x=t(),e=S.cart.length?'':'disabled';
  return `<h1>${x.sale}</h1><input placeholder="${x.search}" value="${S.q}" oninput="setQ(this.value)">${chips()}<div id=list>${plist(1)}</div>
  <h2>${x.cart}</h2><div id=cart>${cartHtml()}</div>
  <input type=number inputmode=numeric placeholder="${x.disc}" value="${S.disc||''}" oninput="S.disc=+this.value||0;$('#tot').textContent=fmt(total())">
  <div class=row><span>${x.total}</span><b id=tot>${fmt(total())}</b></div>
  <div class=seg><button class=btn onclick="payBtn(0)" ${e}>${x.payC}</button><button class="btn alt" onclick="payBtn(1)" ${e}>${x.payU}</button></div>`;
},
stock(){
  const x=t();
  return `<h1>${x.stock}</h1><input placeholder="${x.search}" value="${S.q}" oninput="setQ(this.value)">${chips()}<div id=list>${plist(0)}</div>
  <button class=fab onclick="openAdd()" aria-label="${x.add}">${ic('plus')}</button>`;
},
acc(){
  const x=t(),d=S.day;
  return `<h1>${x.acc}</h1>
  <div class=row><span>${x.today}<br><small>${fmt(d.sales)}</small></span><b>${hid(d.sales-d.cost-d.exp)}</b></div>
  <h2>${x.bToday}</h2>${B.length?B.map(b=>`<button class=row onclick="openBill('${b.id}')"><span>#${b.billNo}<br><small>${b.status==='cancelled'?x.bCancelled:(b.payment==='udhaar'?clean(b.customerName):x.bCash)}</small></span><b${b.status==='cancelled'?' style="opacity:.5;text-decoration:line-through"':''}>${fmt(b.total)}</b></button>`).join(''):`<p>${x.empty}</p>`}
  <h2>${x.days}</h2>
  ${D.length?D.map(r=>`<div class=row><span>${r[0]}<br><small>${fmt(r[1])}</small></span><b>${hid(r[2])}</b></div>`).join(''):`<p>${x.empty}</p>`}`;
},
udhaar(){
  const x=t();
  return `<h1>${x.ukhata}</h1><button class="btn alt" onclick="openNewUd()">${x.newU}</button><h2>${x.cust}</h2>${C.length?C.map((c,i)=>`<button class=row onclick="openPay(${i})"><span>${c.n}</span><b>${fmt(c.bal)}</b></button>`).join(''):`<p>${x.empty}</p>`}`;
},
more(){
  const x=t();
  return `<h1>${x.more}</h1><h2>${x.lang}</h2>
  <div class=seg><button class="btn ${S.lang==='ur'?'':'alt'}" onclick="setLang('ur')">اردو</button><button class="btn ${S.lang==='rm'?'':'alt'}" onclick="setLang('rm')">Roman Urdu</button><button class="btn ${S.lang==='en'?'':'alt'}" onclick="setLang('en')">English</button></div>
  <button class=row onclick="go('udhaar')"><span>${x.ukhata}</span><span class=tag>${C.length}</span></button>
  <button class=row onclick="toggleHide()"><span>${x.hide}</span><span class=tag>${S.hide?'ON':'OFF'}</span></button>
  <button class=row onclick="setShop()"><span>${x.shop}</span><span class=tag>${S.shop}</span></button>
  <button class=row onclick="changePin()"><span>${x.chgpin}</span></button>
  <button class=row onclick="openDiag()"><span>${x.diag}</span></button>
  <button class=row onclick="doLogout()"><span>${x.logout}</span></button>
  <h2>${x.soon}</h2><p>${x.later}</p>`;
}
};

function render(){
  document.documentElement.dir=S.lang==='ur'?'rtl':'ltr';
  document.documentElement.lang=S.lang==='ur'?'ur':'en';
  document.body.className=S.lang;
  if(S.lock){$('#view').innerHTML=lockView();$('#nav').style.display='none';return}
  $('#nav').style.display='flex';
  $('#view').innerHTML=hdr()+V[S.tab]();
  const x=t();
  $('#nav').innerHTML=['today','sale','stock','acc','more'].map(k=>`<button class="${S.tab===k||(k==='more'&&S.tab==='udhaar')?'on':''}" onclick="go('${k}')">${ic(k)}<span>${x[k]}</span></button>`).join('');
}
let tmr;
function toast(m,ms){const e=$('#toast');e.textContent=m;e.style.display='block';clearTimeout(tmr);tmr=setTimeout(()=>e.style.display='none',ms||2000)}
function errCode(e){return String((e&&(e.code||e.message))||e||'unknown').slice(0,80)}
function showErr(e){const c=errCode(e);DIAG.err=c;toast(t().authErr+' ('+c+')',7000)}
function modal(h){$('#modal').innerHTML='<div>'+h+'</div>';$('#modal').style.display='block'}
function closeM(){$('#modal').style.display='none'}
function go(k){S.tab=k;S.q='';S.cat='';render();scrollTo(0,0)}
function setQ(v){S.q=v;$('#list').innerHTML=plist(S.tab==='sale')}
function setCat(c){S.cat=c;render()}
function pin(k){
  if(k==='<')S.buf=S.buf.slice(0,-1);else S.buf+=k;
  if(S.buf.length===4){
    const b=S.buf;S.buf='';
    if(S.lock==='enter'){if(b===localStorage.pin)S.lock='';else toast(t().pinBad)}
    else if(S.lock==='set1'){S.tmp=b;S.lock='set2'}
    else{if(b===S.tmp){localStorage.pin=b;S.lock=''}else{toast(t().pinBad);S.lock='set1'}}
  }
  render();
}
function lockNow(){S.buf='';S.lock=localStorage.pin?'enter':'set1';render()}
function changePin(){S.buf='';S.lock='set1';render()}
function addCart(id){
  const p=P.find(z=>z.id===id);
  if(p.com){
    modal(`<h1>${p.n}</h1><input id=cm type=number inputmode=numeric placeholder="${t().comAsk}"><div class=seg><button class="btn alt" onclick="closeM()">${t().cancel}</button><button class=btn onclick="addCom('${id}')">${t().ok}</button></div>`);
    return;
  }
  const l=S.cart.find(z=>z.p.id===id&&!z.p.com),q=l?l.q:0;
  if(!p.svc&&q+1>p.s){toast(t().warn);return}
  if(l)l.q++;else S.cart.push({k:id,p:p,q:1,pr:p.p});
  render();
}
function addCom(id){
  const a=+$('#cm').value;
  if(!a)return;
  S.cart.push({k:String(Date.now()),p:P.find(z=>z.id===id),q:1,pr:a});
  closeM();render();
}
function chg(k,d){
  const l=S.cart.find(z=>z.k===k);
  if(d>0&&!l.p.svc&&!l.p.com&&l.q+1>l.p.s){toast(t().warn);return}
  l.q+=d;if(l.q<=0)S.cart=S.cart.filter(z=>z!==l);
  render();
}
function payBtn(u){
  if(S.saving||!S.cart.length)return;
  if(u){modal(`<h1>${t().ukhata}</h1><input id=un placeholder="${t().cust}"><input id=up type=tel inputmode=tel placeholder="${t().phone}"><div class=seg><button class="btn alt" onclick="closeM()">${t().cancel}</button><button class=btn onclick="udSave()">${t().ok}</button></div>`);return}
  finish('');
}
function udSave(){
  const n=$('#un').value.trim();
  if(!n){toast(t().cust);return}
  finish(n,$('#up').value);
}
function addBal(n,a,ph,en){
  let c=C.find(z=>z.n.toLowerCase()===n.toLowerCase());
  if(!c){c={n:n,bal:0,ph:'',log:[]};C.push(c)}
  c.bal+=a;
  if(ph&&ph.trim())c.ph=ph.trim();
  if(en)c.log.push(en);
  return c;
}
function stamp(){const d=new Date();return d.toLocaleDateString('en-GB')+' '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}
function finish(name,phone){
  if(S.saving)return;
  S.saving=true;
  try{
    if(typeof DB==='undefined')throw new Error('DB-missing');
    if(!S.noReady){toast(t().wait);return}
    const L=S.cart.map(x=>{const ty=x.p.com?'commission':x.p.svc?'service':'item';return{x:x,ty:ty,amt:Math.round(x.pr*x.q),cost:ty==='commission'?0:(+x.p.c||0)}});
    if(!L.length)return;
    if(L.some(l=>l.ty==='item'&&l.x.q>l.x.p.s)){toast(t().warn);return}
    const sb=L.reduce((a,l)=>a+l.amt,0);
    const disc=Math.min(Math.max(0,Math.round(S.disc||0)),sb),tot=sb-disc;
    let left=disc;
    L.forEach((l,i)=>{const sh=i===L.length-1?left:Math.floor(disc*l.amt/(sb||1));l.sh=sh;left-=sh;l.profit=r2(l.amt-l.cost*l.x.q-sh)});
    const cost=r2(L.reduce((a,l)=>a+l.cost*l.x.q,0)),profit=r2(L.reduce((a,l)=>a+l.profit,0)),comm=r2(L.filter(l=>l.ty==='commission').reduce((a,l)=>a+l.profit,0));
    const no=S.no,ph=(phone||'').trim();
    const sale={billNo:no,items:L.map(l=>({productId:l.x.p.id,name:l.x.p.n,qty:l.x.q,price:l.x.pr,amount:l.amt,costAtSale:l.cost,profit:l.profit,type:l.ty})),subtotal:sb,discount:disc,total:tot,cost:cost,profit:profit,commission:comm,payment:name?'udhaar':'cash',customerName:name||'',customerPhone:ph};
    const pr=DB.sale(sale);
    S.no=no+1;
    const items=S.cart.map(x=>({n:x.p.n,q:x.q,pr:x.pr}));
    const R={no:no,date:stamp(),items:items,disc:disc,total:tot,name:name||'',phone:'',bal:0};
    if(name){const c=addBal(name,tot,ph,{no:R.no,date:R.date,items:items,total:tot});R.bal=c.bal;R.phone=c.ph}
    S.cart=[];S.disc=0;S.rc=R;
    render();showRc();
    pr.catch(showErr);
  }catch(e){showErr(e)}
  finally{S.saving=false}
}
function rcHtml(R){
  const x=t();
  return `<div id=rcpt class=rc><b>${S.shop}</b><div>#${R.no} - ${R.date}</div>${R.name?`<div>${R.name}${R.phone?' - '+R.phone:''}</div>`:''}<hr>${R.items.map(i=>`<div class=rl><span>${i.n} x${i.q}</span><span>${fmt(i.pr*i.q)}</span></div>`).join('')}<hr>${R.disc?`<div class=rl><span>${x.disc}</span><span>-${fmt(R.disc)}</span></div>`:''}<div class="rl big"><span>${x.total}</span><span>${fmt(R.total)}</span></div>${R.name?`<div class="rl big"><span>${x.rcBal}</span><span>${fmt(R.bal)}</span></div>`:''}<div>${x.thanks}</div></div>`;
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
  modal(`<h1>${x.newU}</h1><input id=nn placeholder="${x.cust}"><input id=np type=tel inputmode=tel placeholder="${x.phone}"><input id=na type=number inputmode=numeric placeholder="${x.amt}"><div class=seg><button class="btn alt" onclick="closeM()">${x.cancel}</button><button class=btn onclick="newUd()">${x.ok}</button></div>`);
}
function newUd(){
  const n=$('#nn').value.trim(),a=+$('#na').value;
  if(!n||!a)return;
  addBal(n,a,$('#np').value,{no:'-',date:stamp(),items:[],total:a});closeM();render();
}
function openPay(i){
  const c=C[i],x=t();
  modal(`<h1>${c.n}: ${fmt(c.bal)}</h1>${c.ph?`<p>${c.ph}</p>`:''}${c.log.map(g=>`<div class=row><span><small>${g.date}</small><br>${g.items.map(z=>z.n+' x'+z.q).join(', ')}</span><b>${fmt(g.total)}</b></div>`).join('')}<input id=pa type=number inputmode=numeric placeholder="${x.amt}"><div class=seg><button class="btn alt" onclick="closeM()">${x.cancel}</button><button class=btn onclick="payIn(${i})">${x.recv}</button></div><button class="btn alt" onclick="remind(${i})">${x.rcRem}</button>`);
}
function remind(i){
  const c=C[i],x=t(),l=c.log.map(g=>`${g.date}: ${g.items.length?g.items.map(z=>z.n+' x'+z.q).join(', ')+' = ':''}${fmt(g.total)}`).join('\n');
  window.open(waLink(c.ph,`*${S.shop}*\n${c.n}\n\n${l}\n\n${x.rcBal}: ${fmt(c.bal)}\n${x.rmd}\n${x.thanks}`),'_blank');
}
function payIn(i){
  const c=C[i],a=Math.min(+$('#pa').value,c.bal);
  if(!a)return;
  c.bal-=a;closeM();render();
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
const gv=id=>($('#'+id)||{}).value||'';
function cats(){return `<datalist id=cl>${[...new Set(P.map(p=>p.cat))].map(c=>`<option value="${c}">`).join('')}</datalist>`}
function openAdd(){
  const x=t();
  modal(`<h1>${x.add}</h1><input id=an placeholder="${x.name}"><input id=ap type=number inputmode=decimal placeholder="${x.price}"><input id=aq type=number inputmode=decimal placeholder="${x.qty}"><input id=af type=file accept="image/*" capture=environment>
  <button class="btn alt" onclick="$('#mf').style.display='block';this.remove()">${x.moreF}</button>
  <div id=mf style="display:none"><input id=ak list=cl placeholder="${x.cat}">${cats()}<input id=au placeholder="${x.unit}"><input id=ac type=number inputmode=decimal placeholder="${x.cost}"><input id=am2 type=number inputmode=numeric placeholder="${x.minStock}"><input id=ab placeholder="${x.barcode}"><select id=at><option value=item>${x.tItem}</option><option value=service>${x.svc}</option><option value=commission>${x.isCom}</option></select></div>
  <div class=seg style="margin-top:8px"><button class="btn alt" onclick="closeM()">${x.cancel}</button><button class=btn onclick="addP()">${x.add}</button></div>`);
}
async function addP(){
  if(S.busy)return;
  const n=clean(gv('an')),tp=gv('at')||'item',p=+gv('ap');
  if(!n||(tp!=='commission'&&!(p>0))){toast(t().name+' / '+t().price);return}
  S.busy=true;
  try{
    const f=$('#af').files[0];
    const ph=f?await Promise.race([shrink(f),new Promise(r=>setTimeout(()=>r({}),3000))]):{};
    const o={name:n,category:clean(gv('ak'))||'General',unit:clean(gv('au')),salePrice:tp==='commission'?0:p,cost:Math.max(0,+gv('ac')||0),stock:tp==='item'?Math.max(0,+gv('aq')||0):0,minStock:Math.max(0,+gv('am2')||0),barcode:clean(gv('ab')),type:tp,thumb:ph.th||'',full:ph.full||''};
    if(typeof DB==='undefined')throw new Error('DB-missing');
    const pr=DB.add(o);
    closeM();
    toast(t().added);
    pr.catch(showErr);
  }catch(e){showErr(e)}
  finally{S.busy=false}
}
function openProd(id){
  const p=P.find(z=>z.id===id),x=t(),ns=p.svc||p.com;
  modal(`<h1>${p.n}</h1><div id=pp></div><p>${p.com?'':fmt(p.p)}${ns?'':' - '+p.s+' '+p.unit}</p>
  ${ns?'':`<button class=btn onclick="openIn('${id}')">${x.stockIn}</button>`}
  <button class="btn alt" style="margin-top:8px" onclick="openEdit('${id}')">${x.edit}</button>
  <button class="btn alt" style="margin-top:8px" onclick="arch('${id}')">${x.del}</button>
  <button class="btn alt" style="margin-top:8px" onclick="closeM()">${x.done}</button>`);
  if(p.th)DB.photo(id).then(b=>{if(b&&$('#pp'))$('#pp').innerHTML=`<img class=big src="${b}" alt="">`}).catch(()=>{});
}
function openEdit(id){
  const p=P.find(z=>z.id===id),x=t();
  modal(`<h1>${x.edit}</h1><input id=an value="${p.n}"><input id=ak list=cl value="${p.cat}">${cats()}<input id=au value="${p.unit}" placeholder="${x.unit}"><input id=ap type=number inputmode=decimal value="${p.p}" placeholder="${x.price}"><input id=am2 type=number inputmode=numeric value="${p.m}" placeholder="${x.minStock}"><input id=ab value="${p.bc}" placeholder="${x.barcode}"><input id=af type=file accept="image/*" capture=environment>
  <div class=seg style="margin-top:8px"><button class="btn alt" onclick="closeM()">${x.cancel}</button><button class=btn onclick="editSave('${id}')">${x.ok}</button></div>`);
}
async function editSave(id){
  if(S.busy)return;
  const n=clean(gv('an'));
  if(!n){toast(t().name);return}
  S.busy=true;
  try{
    const f=$('#af').files[0];
    const ph=f?await Promise.race([shrink(f),new Promise(r=>setTimeout(()=>r({}),3000))]):{};
    const o={name:n,category:clean(gv('ak'))||'General',unit:clean(gv('au')),salePrice:Math.max(0,+gv('ap')||0),minStock:Math.max(0,+gv('am2')||0),barcode:clean(gv('ab'))};
    if(ph.th){o.thumb=ph.th;o.full=ph.full}
    if(typeof DB==='undefined')throw new Error('DB-missing');
    const pr=DB.edit(id,o);
    closeM();
    toast(t().updated);
    pr.catch(showErr);
  }catch(e){showErr(e)}
  finally{S.busy=false}
}
function arch(id){
  if(!confirm(t().sure))return;
  try{
    if(typeof DB==='undefined')throw new Error('DB-missing');
    const pr=DB.archive(id);
    closeM();
    toast(t().removed);
    pr.catch(showErr);
  }catch(e){showErr(e)}
}
function newAvg(p,q,uc){const o=Math.max(0,p.s),n=o+q;return n>0?Math.round((o*p.c+q*uc)/n*100)/100:uc}
function openIn(id){
  const p=P.find(z=>z.id===id),x=t();
  modal(`<h1>${p.n}</h1><p>${x.qty}: ${p.s} ${p.unit}</p><input id=iq type=number inputmode=decimal placeholder="${x.qty}" oninput="pvIn('${id}')"><input id=ic type=number inputmode=decimal value="${p.c||''}" placeholder="${x.cost}" oninput="pvIn('${id}')"><p id=pv></p>
  <div class=seg><button class="btn alt" onclick="closeM()">${x.cancel}</button><button class=btn onclick="inSave('${id}')">${x.ok}</button></div>`);
}
function pvIn(id){
  const p=P.find(z=>z.id===id),q=+gv('iq'),uc=+gv('ic');
  $('#pv').textContent=q>0&&uc>=0?t().newAvg+': '+fmt(newAvg(p,q,uc)):'';
}
function inSave(id){
  const p=P.find(z=>z.id===id),q=+gv('iq'),uc=+gv('ic');
  if(!(q>0)||gv('ic')===''||!(uc>=0)){toast(t().qtyBad);return}
  try{
    if(typeof DB==='undefined')throw new Error('DB-missing');
    const pr=DB.stockIn(p,q,uc,newAvg(p,q,uc));
    closeM();
    toast(t().stockAdded);
    pr.catch(showErr);
  }catch(e){showErr(e)}
}
function openBill(id){
  const b=B.find(z=>z.id===id);if(!b)return;
  const x=t();
  modal(`<h1>#${b.billNo}${b.status==='cancelled'?' - '+x.bCancelled:''}</h1>${b.customerName?`<p>${clean(b.customerName)}</p>`:''}${b.items.map(i=>`<div class=row><span>${clean(i.name)} x${i.qty}</span><b>${fmt(i.amount)}</b></div>`).join('')}${b.discount?`<div class=row><span>${x.disc}</span><b>-${fmt(b.discount)}</b></div>`:''}<div class=row><span>${x.total}</span><b>${fmt(b.total)}</b></div>${b.status==='active'?`<button class="btn alt" onclick="askCancel('${id}')">${x.bCancel}</button>`:''}<button class="btn alt" onclick="closeM()">${x.done}</button>`);
}
function askCancel(id){
  const b=B.find(z=>z.id===id);if(!b)return;
  const x=t();
  if(b.payment==='udhaar'){toast(x.bNoUd,5000);return}
  modal(`<h1>${x.bCancel} #${b.billNo}</h1><p>${x.bCancelAsk}</p><div class=seg><button class="btn alt" onclick="closeM()">${x.cancel}</button><button class=btn onclick="doCancel('${id}')">${x.ok}</button></div>`);
}
function doCancel(id){
  if(S.busy)return;
  S.busy=true;
  try{
    const b=B.find(z=>z.id===id);
    if(!b||b.status!=='active')return;
    if(b.payment==='udhaar'){toast(t().bNoUd,5000);return}
    if(typeof DB==='undefined')throw new Error('DB-missing');
    const pr=DB.cancel(b);
    closeM();
    toast(t().bDone);
    pr.catch(showErr);
  }catch(e){showErr(e)}
  finally{S.busy=false}
}
function openDiag(){
  const x=t(),u=window.UID,yn=v=>v?x.dYes:x.dNo;
  const r=(a,b)=>`<div class=row><span>${a}</span><b>${b}</b></div>`;
  modal(`<h1>${x.diag}</h1>${r(x.dLogin,yn(u))}${r(x.dUid,u?u.slice(0,6):'-')}${r(x.dItems,P.length)}${r(x.dDb,yn(typeof DB!=='undefined'))}${r(x.dListen,DIAG.listen+' / '+DIAG.snap)}${r(x.dNet,yn(navigator.onLine))}${r(x.dErr,clean(DIAG.err)||'-')}<button class="btn alt" onclick="closeM()">${x.done}</button>`);
}
function setShop(){const v=prompt(t().shop,S.shop);if(v&&v.trim()){S.shop=v.trim();localStorage.shop=S.shop;render()}}
function setLang(l){S.lang=l;localStorage.lang=l;render()}
function toggleHide(){S.hide=!S.hide;localStorage.hide=S.hide?'1':'0';render()}
render();
