const $=s=>document.querySelector(s);
const fmt=n=>'Rs '+Math.round(n).toLocaleString('en-US');
const S={shop:localStorage.shop||'Meri Dukan',rc:null,lang:localStorage.lang||'rm',hide:localStorage.hide==='1',tab:'today',q:'',cat:'',cart:[],disc:0,saving:false,no:15,buf:'',tmp:'',lock:localStorage.pin?'enter':'set1',day:{sales:3200,cash:2800,ud:400,com:350,cost:2300,exp:150,bills:14}};
const P=[
{id:1,n:'Pen Blue',cat:'Stationery',p:20,c:14,s:120,m:20,sold:40},
{id:2,n:'Notebook 200p',cat:'Stationery',p:150,c:110,s:8,m:10,sold:12},
{id:3,n:'A4 Paper Rim',cat:'Stationery',p:1450,c:1300,s:12,m:5,sold:5},
{id:4,n:'Charger Cable',cat:'Mobile',p:350,c:250,s:15,m:5,sold:6},
{id:5,n:'Earphones',cat:'Mobile',p:600,c:420,s:4,m:5,sold:3},
{id:6,n:'Chips',cat:'Food',p:50,c:38,s:40,m:10,sold:25},
{id:7,n:'Cold Drink',cat:'Food',p:120,c:95,s:24,m:8,sold:18},
{id:8,n:'Photocopy',cat:'Services',p:5,c:1,svc:1,sold:300},
{id:9,n:'Lamination',cat:'Services',p:40,c:15,svc:1,sold:20},
{id:10,n:'JazzCash',cat:'Services',p:0,c:0,com:1,sold:30},
{id:11,n:'Easypaisa',cat:'Services',p:0,c:0,com:1,sold:22}
];
const C=[{n:'Ali',bal:1200,ph:'',log:[]},{n:'Sara',bal:450,ph:'',log:[]}];
const W=[5200,6100,4800,7300,5900,6600];
const D=[['16 Nov',6600,1500],['15 Nov',5900,1300],['14 Nov',7300,1900],['13 Nov',4800,1000],['12 Nov',6100,1400],['11 Nov',5200,1200]];
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
const sub=()=>S.cart.reduce((a,x)=>a+x.pr*x.q,0);
const total=()=>Math.max(0,sub()-S.disc);
const hdr=()=>`<div class=top><b>Munafa Book</b><span><button class=ib onclick="toggleHide()" aria-label="hide">${ic(S.hide?'eyeoff':'eye')}</button><button class=ib onclick="lockNow()" aria-label="lock">${ic('lock')}</button></span></div>`;

function chips(){
  const cs=[...new Set(P.map(p=>p.cat))];
  return `<div class=chips><button class="chip ${S.cat?'':'on'}" onclick="setCat('')">${t().all}</button>${cs.map(c=>`<button class="chip ${S.cat===c?'on':''}" onclick="setCat('${c}')">${c}</button>`).join('')}</div>`;
}
function plist(clickable){
  const q=S.q.toLowerCase(),a=P.filter(p=>p.n.toLowerCase().includes(q)&&(!S.cat||p.cat===S.cat));
  if(!a.length)return `<p>${t().empty}</p>`;
  return a.map(p=>{
    const tag=p.com?`<span class=tag>${t().comTag}</span>`:p.svc?`<span class=tag>${t().svc}</span>`:(p.s<=0?`<span class="tag red">${t().out}</span>`:`<span class=tag>${p.s}</span>`);
    const body=`<span>${p.n}<br><small>${p.com?'':fmt(p.p)}</small></span>${tag}`;
    return clickable?`<button class=row onclick="addCart(${p.id})">${body}</button>`:`<div class=row>${body}</div>`;
  }).join('');
}
function cartHtml(){
  if(!S.cart.length)return `<p>${t().empty}</p>`;
  return S.cart.map(x=>`<div class=row><span>${x.p.n}<br><small>${fmt(x.pr*x.q)}</small></span><span class=q><button onclick="chg(${x.k},-1)">-</button><b>${x.q}</b><button onclick="chg(${x.k},1)">+</button></span></div>`).join('');
}
function lockView(){
  const x=t(),m=S.lock,msg=m==='enter'?x.pin1:m==='set1'?x.pin2:x.pin3;
  return `<div class=lockbox><h1>${msg}</h1><div class=dots>${[0,1,2,3].map(i=>`<i class="${i<S.buf.length?'f':''}"></i>`).join('')}</div><div class=pad>${[1,2,3,4,5,6,7,8,9,'',0,'<'].map(k=>k===''?'<span></span>':`<button onclick="pin('${k}')">${k==='<'?'&lt;':k}</button>`).join('')}</div></div>`;
}

const V={
today(){
  const d=S.day,x=t(),low=P.filter(p=>!p.svc&&!p.com&&p.s<=p.m),tp=[...P].sort((a,b)=>b.sold-a.sold).slice(0,5);
  const all=[...W,d.sales],mx=Math.max(...all,1),pr=d.sales-d.cost;
  return `<h1>${x.today}</h1><div class=grid>${card(x.sales,fmt(d.sales))}${card(x.cash,fmt(d.cash))}${card(x.udg,fmt(d.ud))}${card(x.comm,fmt(d.com))}${card(x.profit,hid(pr))}${card(x.exp,fmt(d.exp))}${card(x.net,hid(pr-d.exp))}${card(x.bills,d.bills)}</div>
  <h2>${x.week}</h2><div class=bars>${all.map(v=>`<i style="height:${Math.round(v/mx*100)}%"></i>`).join('')}</div>
  <h2>${x.low}</h2>${low.length?low.map(p=>`<div class=row><span>${p.n}</span><span class="tag red">${p.s}</span></div>`).join(''):`<p>${x.empty}</p>`}
  <h2>${x.top}</h2>${tp.map(p=>`<div class=row><span>${p.n}</span><b>${p.sold}</b></div>`).join('')}`;
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
  return `<h1>${x.acc}</h1><h2>${x.days}</h2>
  <div class=row><span>${x.today}<br><small>${fmt(d.sales)}</small></span><b>${hid(d.sales-d.cost-d.exp)}</b></div>
  ${D.map(r=>`<div class=row><span>${r[0]}<br><small>${fmt(r[1])}</small></span><b>${hid(r[2])}</b></div>`).join('')}`;
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
function toast(m){const e=$('#toast');e.textContent=m;e.style.display='block';setTimeout(()=>e.style.display='none',2000)}
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
    modal(`<h1>${p.n}</h1><input id=cm type=number inputmode=numeric placeholder="${t().comAsk}"><div class=seg><button class="btn alt" onclick="closeM()">${t().cancel}</button><button class=btn onclick="addCom(${id})">${t().ok}</button></div>`);
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
  S.cart.push({k:Date.now(),p:P.find(z=>z.id===id),q:1,pr:a});
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
  const tot=total(),d=S.day,items=S.cart.map(x=>({n:x.p.n,q:x.q,pr:x.pr}));
  const R={no:S.no++,date:stamp(),items:items,disc:S.disc,total:tot,name:name||'',phone:'',bal:0};
  S.cart.forEach(x=>{
    if(!x.p.svc&&!x.p.com)x.p.s-=x.q;
    x.p.sold+=x.q;d.cost+=x.p.c*x.q;
    if(x.p.com)d.com+=x.pr*x.q;
  });
  d.sales+=tot;d.bills++;
  if(name){d.ud+=tot;const c=addBal(name,tot,phone,{no:R.no,date:R.date,items:items,total:tot});R.bal=c.bal;R.phone=c.ph}else d.cash+=tot;
  S.cart=[];S.disc=0;S.saving=false;S.rc=R;
  render();showRc();
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
  c.bal-=a;S.day.cash+=a;closeM();render();
}
function openAdd(){
  const x=t();
  modal(`<h1>${x.add}</h1><input id=an placeholder="${x.name}"><input id=ak placeholder="${x.cat}"><input id=ap type=number inputmode=numeric placeholder="${x.price}"><input id=ac type=number inputmode=numeric placeholder="${x.cost}"><input id=aq type=number inputmode=numeric placeholder="${x.qty}">
  <label class=row><span>${x.svc}</span><input id=as type=checkbox style="width:24px;min-height:24px;margin:0"></label>
  <label class=row><span>${x.isCom}</span><input id=am type=checkbox style="width:24px;min-height:24px;margin:0"></label>
  <div class=seg><button class="btn alt" onclick="closeM()">${x.cancel}</button><button class=btn onclick="addP()">${x.add}</button></div>`);
}
function addP(){
  const n=$('#an').value.trim(),p=+$('#ap').value,cm=$('#am').checked;
  if(!n||(!p&&!cm)){toast(t().name+' / '+t().price);return}
  P.push({id:Date.now(),n:n,cat:$('#ak').value.trim()||'General',p:p,c:+$('#ac').value||0,s:+$('#aq').value||0,m:5,sold:0,svc:$('#as').checked?1:0,com:cm?1:0});
  closeM();render();
}
function setShop(){const v=prompt(t().shop,S.shop);if(v&&v.trim()){S.shop=v.trim();localStorage.shop=S.shop;render()}}
function setLang(l){S.lang=l;localStorage.lang=l;render()}
function toggleHide(){S.hide=!S.hide;localStorage.hide=S.hide?'1':'0';render()}
render();
