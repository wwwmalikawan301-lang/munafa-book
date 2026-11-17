const $=s=>document.querySelector(s);
const fmt=n=>'Rs '+Math.round(n).toLocaleString('en-US');
const S={lang:localStorage.lang||'rm',hide:localStorage.hide==='1',tab:'today',q:'',cart:[],disc:0,saving:false,day:{sales:3200,cost:2300,exp:150,bills:14}};
const P=[
{id:1,n:'Pen Blue',p:20,c:14,s:120,m:20,sold:40},
{id:2,n:'Notebook 200p',p:150,c:110,s:8,m:10,sold:12},
{id:3,n:'A4 Paper Rim',p:1450,c:1300,s:12,m:5,sold:5},
{id:4,n:'Marker',p:60,c:42,s:3,m:6,sold:9},
{id:5,n:'Photocopy',p:5,c:1,svc:1,sold:300},
{id:6,n:'Lamination',p:40,c:15,svc:1,sold:20}
];
const W=[5200,6100,4800,7300,5900,6600];
const D=[['16 Nov',6600,1500],['15 Nov',5900,1300],['14 Nov',7300,1900],['13 Nov',4800,1000],['12 Nov',6100,1400],['11 Nov',5200,1200]];
const I={
today:'<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',
sale:'<path d="M3 4h3l2 11h10l2-8H7M9 20h.01M17 20h.01"/>',
stock:'<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/>',
acc:'<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
more:'<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
plus:'<path d="M12 5v14M5 12h14"/>'
};
const ic=k=>`<svg viewBox="0 0 24 24">${I[k]}</svg>`;
const t=()=>T[S.lang];
const hid=n=>S.hide?'Rs ****':fmt(n);
const card=(l,v)=>`<div class=card><span>${l}</span><b>${v}</b></div>`;
const sub=()=>S.cart.reduce((a,x)=>a+x.p.p*x.q,0);
const total=()=>Math.max(0,sub()-S.disc);

function plist(clickable){
  const q=S.q.toLowerCase(),a=P.filter(p=>p.n.toLowerCase().includes(q));
  if(!a.length)return `<p>${t().empty}</p>`;
  return a.map(p=>{
    const tag=p.svc?`<span class=tag>${t().svc}</span>`:(p.s<=0?`<span class="tag red">${t().out}</span>`:`<span class=tag>${p.s}</span>`);
    const body=`<span>${p.n}<br><small>${fmt(p.p)}</small></span>${tag}`;
    return clickable?`<button class=row onclick="addCart(${p.id})">${body}</button>`:`<div class=row>${body}</div>`;
  }).join('');
}
function cartHtml(){
  if(!S.cart.length)return `<p>${t().empty}</p>`;
  return S.cart.map(x=>`<div class=row><span>${x.p.n}<br><small>${fmt(x.p.p*x.q)}</small></span><span class=q><button onclick="chg(${x.p.id},-1)">-</button><b>${x.q}</b><button onclick="chg(${x.p.id},1)">+</button></span></div>`).join('');
}

const V={
today(){
  const d=S.day,x=t(),low=P.filter(p=>!p.svc&&p.s<=p.m),top=[...P].sort((a,b)=>b.sold-a.sold).slice(0,5);
  const all=[...W,d.sales],mx=Math.max(...all,1);
  return `<h1>${x.today}</h1><div class=grid>${card(x.sales,fmt(d.sales))}${card(x.profit,hid(d.sales-d.cost))}${card(x.exp,fmt(d.exp))}${card(x.net,hid(d.sales-d.cost-d.exp))}${card(x.bills,d.bills)}</div>
  <h2>${x.week}</h2><div class=bars>${all.map(v=>`<i style="height:${Math.round(v/mx*100)}%"></i>`).join('')}</div>
  <h2>${x.low}</h2>${low.length?low.map(p=>`<div class=row><span>${p.n}</span><span class="tag red">${p.s}</span></div>`).join(''):`<p>${x.empty}</p>`}
  <h2>${x.top}</h2>${top.map(p=>`<div class=row><span>${p.n}</span><b>${p.sold}</b></div>`).join('')}`;
},
sale(){
  const x=t();
  return `<h1>${x.sale}</h1><input id=q placeholder="${x.search}" value="${S.q}" oninput="setQ(this.value)"><div id=list>${plist(1)}</div>
  <h2>${x.cart}</h2><div id=cart>${cartHtml()}</div>
  <input type=number inputmode=numeric placeholder="${x.disc}" value="${S.disc||''}" oninput="S.disc=+this.value||0;$('#tot').textContent=fmt(total())">
  <div class=row><span>${x.total}</span><b id=tot>${fmt(total())}</b></div>
  <button class=btn onclick="save()" ${S.cart.length?'':'disabled'}>${x.save}</button>`;
},
stock(){
  const x=t();
  return `<h1>${x.stock}</h1><input id=q placeholder="${x.search}" value="${S.q}" oninput="setQ(this.value)"><div id=list>${plist(0)}</div>
  <button class=fab onclick="openAdd()" aria-label="${x.add}">${ic('plus')}</button>`;
},
acc(){
  const x=t(),d=S.day;
  return `<h1>${x.acc}</h1><h2>${x.days}</h2>
  <div class=row><span>${x.today}<br><small>${fmt(d.sales)}</small></span><b>${hid(d.sales-d.cost-d.exp)}</b></div>
  ${D.map(r=>`<div class=row><span>${r[0]}<br><small>${fmt(r[1])}</small></span><b>${hid(r[2])}</b></div>`).join('')}`;
},
more(){
  const x=t();
  return `<h1>${x.more}</h1><h2>${x.lang}</h2>
  <div class=seg><button class="btn ${S.lang==='ur'?'':'alt'}" onclick="setLang('ur')">اردو</button><button class="btn ${S.lang==='rm'?'':'alt'}" onclick="setLang('rm')">Roman Urdu</button><button class="btn ${S.lang==='en'?'':'alt'}" onclick="setLang('en')">English</button></div>
  <button class=row onclick="toggleHide()"><span>${x.hide}</span><span class=tag>${S.hide?'ON':'OFF'}</span></button>
  <h2>${x.soon}</h2><p>${x.later}</p>`;
}
};

function render(){
  document.documentElement.dir=S.lang==='ur'?'rtl':'ltr';
  document.documentElement.lang=S.lang==='ur'?'ur':'en';
  document.body.className=S.lang;
  $('#view').innerHTML=V[S.tab]();
  const x=t();
  $('#nav').innerHTML=['today','sale','stock','acc','more'].map(k=>`<button class="${S.tab===k?'on':''}" onclick="go('${k}')">${ic(k)}<span>${x[k]}</span></button>`).join('');
}
function toast(m){const e=$('#toast');e.textContent=m;e.style.display='block';setTimeout(()=>e.style.display='none',2000)}
function go(k){S.tab=k;S.q='';render();scrollTo(0,0)}
function setQ(v){S.q=v;$('#list').innerHTML=plist(S.tab==='sale')}
function addCart(id){
  const p=P.find(z=>z.id===id),l=S.cart.find(z=>z.p.id===id),q=l?l.q:0;
  if(!p.svc&&q+1>p.s){toast(t().warn);return}
  if(l)l.q++;else S.cart.push({p,q:1});
  render();
}
function chg(id,d){
  const l=S.cart.find(z=>z.p.id===id);
  if(d>0&&!l.p.svc&&l.q+1>l.p.s){toast(t().warn);return}
  l.q+=d;if(l.q<=0)S.cart=S.cart.filter(z=>z!==l);
  render();
}
function save(){
  if(S.saving||!S.cart.length)return;
  S.saving=true;
  const tot=total();
  S.cart.forEach(x=>{if(!x.p.svc)x.p.s-=x.q;x.p.sold+=x.q;S.day.cost+=x.p.c*x.q});
  S.day.sales+=tot;S.day.bills++;
  S.cart=[];S.disc=0;S.saving=false;
  toast(t().saved);render();
}
function openAdd(){
  const x=t();
  $('#modal').innerHTML=`<div><h1>${x.add}</h1><input id=an placeholder="${x.name}"><input id=ap type=number inputmode=numeric placeholder="${x.price}"><input id=ac type=number inputmode=numeric placeholder="${x.cost}"><input id=aq type=number inputmode=numeric placeholder="${x.qty}"><div class=seg><button class="btn alt" onclick="closeM()">${x.cancel}</button><button class=btn onclick="addP()">${x.add}</button></div></div>`;
  $('#modal').style.display='block';
}
function closeM(){$('#modal').style.display='none'}
function addP(){
  const n=$('#an').value.trim(),p=+$('#ap').value;
  if(!n||!p){toast(t().name+' / '+t().price);return}
  P.push({id:Date.now(),n:n,p:p,c:+$('#ac').value||0,s:+$('#aq').value||0,m:5,sold:0});
  closeM();render();
}
function setLang(l){S.lang=l;localStorage.lang=l;render()}
function toggleHide(){S.hide=!S.hide;localStorage.hide=S.hide?'1':'0';render()}
render();
