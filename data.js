import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, doc, query, where, onSnapshot, writeBatch, increment, serverTimestamp, getDoc, getDocs, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { resolveUserShop, createInvite, listMembers, toggleMember } from "./staff.js";

let unsubs = [];
let lastDaily = [];
let billsUnsub = null, billsKey = '';
let activeShopId = null;

function shopId() {
  if (typeof S !== 'undefined' && S.shopId) return S.shopId;
  if (auth.currentUser) return auth.currentUser.uid;
  throw new Error('no-login');
}
const col = n => { if (!auth.currentUser) throw new Error('no-login'); return collection(db, 'shops', shopId(), n); };

function dayKey() {
  const startStr = (typeof S !== 'undefined' && S.cfg && S.cfg.dayStart) || '00:00';
  const parts = startStr.split(':');
  const sh = Math.min(23, Math.max(0, parseInt(parts[0], 10) || 0));
  const sm = Math.min(59, Math.max(0, parseInt(parts[1], 10) || 0));
  const now = new Date();
  const dt = new Date(now.getTime() - ((sh * 60 + sm) * 60000));
  return dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
}
const ts = () => serverTimestamp();
const keyDays = (k, n) => { const d = new Date(k + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
const lbl = k => new Date(k + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const g = (x, k) => +(x && x[k]) || 0;

function applyDaily() {
  const tk = dayKey(), m = {};
  lastDaily.forEach(x => { m[x.id] = x; });
  const t0 = m[tk];
  S.day = {
    sales: g(t0, 'sales'),
    cash: g(t0, 'cashIn'),
    cashOut: g(t0, 'cashOut'),
    ud: g(t0, 'udhaar'),
    com: g(t0, 'commission'),
    cost: g(t0, 'cost'),
    exp: g(t0, 'expenses'),
    bills: g(t0, 'bills'),
    closed: !!(t0 && t0.closed),
    countedCash: g(t0, 'countedCash')
  };
  W.length = 0;
  for (let i = 6; i >= 1; i--) W.push(g(m[keyDays(tk, i)], 'sales'));
  D.length = 0;
  lastDaily.slice().sort((a, b) => (a.id < b.id ? 1 : -1)).filter(x => x.id < tk).forEach(x => D.push([lbl(x.id), g(x, 'sales'), g(x, 'sales') - g(x, 'cost') - g(x, 'expenses')]));
}

function subBills(sid) {
  if (billsUnsub) { billsUnsub(); billsUnsub = null; }
  billsKey = dayKey();
  billsUnsub = onSnapshot(query(collection(db, 'shops', sid, 'sales'), where('dayKey', '==', billsKey)), s => {
    B.length = 0;
    s.docs.forEach(x => B.push(Object.assign({ id: x.id }, x.data({ serverTimestamps: 'estimate' }))));
    B.sort((a, b) => (b.billNo || 0) - (a.billNo || 0));
    render();
  }, e => { showErr({ code: 'bills-' + errCode(e) }); });
}

async function attachListeners(u) {
  unsubs.forEach(f => f());
  unsubs = [];
  if (billsUnsub) { billsUnsub(); billsUnsub = null; }
  B.length = 0; P.length = 0; C.length = 0;
  if (typeof WAL !== 'undefined') WAL.length = 0;
  if (typeof SUP !== 'undefined') SUP.length = 0;
  lastDaily = [];
  S.no = 1; S.noReady = false; S.loading = !!u;
  DIAG.listen = u ? 'wait' : '-';
  applyDaily(); render();
  if (!u) return;

  const info = await resolveUserShop(u);
  S.shopId = info.shopId; S.role = info.role;
  activeShopId = info.shopId;

  try {
    const sDoc = await getDoc(doc(db, 'shops', activeShopId, 'settings', 'main'));
    if (sDoc.exists()) {
      const sd = sDoc.data();
      S.cfg = {
        dayStart: sd.dayStart || '00:00',
        allowNegativeStock: !!sd.allowNegativeStock,
        billFooter: sd.billFooter || '',
        lowStockDefault: +sd.lowStockDefault || 0
      };
    }
  } catch (e) {}

  subBills(activeShopId);
  setTimeout(() => { if (auth.currentUser && auth.currentUser.uid === u.uid) S.noReady = true; }, 3000);

  unsubs.push(onSnapshot(query(collection(db, 'shops', activeShopId, 'products'), where('active', '==', true)), s => {
    P.length = 0;
    s.forEach(d => {
      const x = d.data();
      P.push({
        id: d.id, n: x.name || '', cat: x.category || 'General', unit: x.unit || '',
        p: x.salePrice || 0, c: x.avgCost || 0, s: x.stock || 0, m: x.minStock || 0,
        bc: x.barcode || '', svc: x.type === 'service' ? 1 : 0, com: x.type === 'commission' ? 1 : 0,
        sold: x.sold || 0, th: x.thumb || ''
      });
    });
    P.sort((a, b) => a.n.localeCompare(b.n));
    S.cart = S.cart.filter(l => { const p = P.find(z => z.id === l.p.id); if (p) l.p = p; return !!p; });
    S.loading = false;
    DIAG.snap++; DIAG.listen = 'ok';
    render();
  }, e => { S.loading = false; DIAG.listen = 'error'; showErr(e); render(); }));

  unsubs.push(onSnapshot(query(collection(db, 'shops', activeShopId, 'customers'), where('active', '==', true)), s => {
    C.length = 0;
    s.forEach(d => C.push(Object.assign({ id: d.id }, d.data())));
    C.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    render();
  }, e => { showErr({ code: 'cust-' + errCode(e) }); }));

  unsubs.push(onSnapshot(query(collection(db, 'shops', activeShopId, 'daily'), where('dayKey', '>=', keyDays(dayKey(), 45))), s => {
    lastDaily = s.docs.map(d => Object.assign({ id: d.id }, d.data()));
    applyDaily();
    render();
  }, e => { showErr({ code: 'daily-' + errCode(e) }); }));

  unsubs.push(onSnapshot(doc(db, 'shops', activeShopId, 'meta', 'counter'), s => {
    const n = ((s.exists() && s.data().billNo) || 0) + 1;
    if (n > S.no) S.no = n;
    S.noReady = true;
  }, e => { showErr({ code: 'counter-' + errCode(e) }); }));

  if (S.role === 'owner') {
    unsubs.push(onSnapshot(query(collection(db, 'shops', activeShopId, 'wallets'), where('active', '==', true)), s => {
      if (typeof WAL !== 'undefined') {
        WAL.length = 0;
        s.forEach(d => WAL.push(Object.assign({ id: d.id }, d.data())));
        render();
      }
    }, e => { showErr({ code: 'wal-' + errCode(e) }); }));

    unsubs.push(onSnapshot(query(collection(db, 'shops', activeShopId, 'suppliers'), where('active', '==', true)), s => {
      if (typeof SUP !== 'undefined') {
        SUP.length = 0;
        s.forEach(d => SUP.push(Object.assign({ id: d.id }, d.data())));
        render();
      }
    }, e => { showErr({ code: 'sup-' + errCode(e) }); }));
  }
}

window.initShopData = attachListeners;
onAuthStateChanged(auth, u => { attachListeners(u); });

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && auth.currentUser && activeShopId) {
    if (billsKey !== dayKey()) subBills(activeShopId);
    applyDaily(); render();
  }
});

async function commitBatches(ops) {
  for (let i = 0; i < ops.length; i += 400) {
    const chunk = ops.slice(i, i + 400);
    const b = writeBatch(db);
    chunk.forEach(op => {
      if (op.type === 'set') b.set(op.ref,
