import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, doc, query, where, orderBy, limit, documentId, onSnapshot, writeBatch, increment, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let unsubs = [];
let lastDaily = [];
let billsUnsub = null, billsKey = '';
const col = n => { if (!auth.currentUser) throw new Error('no-login'); return collection(db, 'shops', auth.currentUser.uid, n); };
const dayKey = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
const ts = () => serverTimestamp();

// ---daily-start
const keyDays = (k, n) => { const d = new Date(k + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
const lbl = k => new Date(k + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const g = (x, k) => +(x && x[k]) || 0;
function applyDaily() {
  const tk = dayKey(), m = {};
  lastDaily.forEach(x => { m[x.id] = x; });
  const t0 = m[tk];
  S.day = { sales: g(t0, 'sales'), cash: g(t0, 'cashIn'), ud: g(t0, 'udhaar'), com: g(t0, 'commission'), cost: g(t0, 'cost'), exp: g(t0, 'expenses'), bills: g(t0, 'bills') };
  W.length = 0;
  for (let i = 6; i >= 1; i--) W.push(g(m[keyDays(tk, i)], 'sales'));
  D.length = 0;
  lastDaily.slice().sort((a, b) => (a.id < b.id ? 1 : -1)).filter(x => x.id < tk).forEach(x => D.push([lbl(x.id), g(x, 'sales'), g(x, 'sales') - g(x, 'cost') - g(x, 'expenses')]));
}
// ---daily-end

function subBills(uid) {
  if (billsUnsub) { billsUnsub(); billsUnsub = null; }
  billsKey = dayKey();
  billsUnsub = onSnapshot(query(collection(db, 'shops', uid, 'sales'), where('dayKey', '==', billsKey)), s => {
    B.length = 0;
    s.docs.forEach(x => B.push(Object.assign({ id: x.id }, x.data({ serverTimestamps: 'estimate' }))));
    B.sort((a, b) => b.billNo - a.billNo);
    render();
  }, e => { showErr({ code: 'bills-' + errCode(e) }); });
}

onAuthStateChanged(auth, u => {
  unsubs.forEach(f => f());
  unsubs = [];
  if (billsUnsub) { billsUnsub(); billsUnsub = null; }
  B.length = 0;
  P.length = 0;
  lastDaily = [];
  S.no = 1;
  S.noReady = false;
  S.loading = !!u;
  DIAG.listen = u ? 'wait' : '-';
  applyDaily();
  render();
  if (!u) return;
  const uid = u.uid;
  subBills(uid);
  setTimeout(() => { if (auth.currentUser && auth.currentUser.uid === uid) S.noReady = true; }, 3000);
  unsubs.push(onSnapshot(query(collection(db, 'shops', u.uid, 'products'), where('active', '==', true)), s => {
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
  unsubs.push(onSnapshot(query(collection(db, 'shops', u.uid, 'daily'), where('dayKey', '>=', keyDays(dayKey(), 14))), s => {
    lastDaily = s.docs.map(d => Object.assign({ id: d.id }, d.data()));
    applyDaily();
    render();
  }, e => { showErr({ code: 'daily-' + errCode(e) }); }));
  unsubs.push(onSnapshot(doc(db, 'shops', u.uid, 'meta', 'counter'), s => {
    const n = ((s.exists() && s.data().billNo) || 0) + 1;
    if (n > S.no) S.no = n;
    S.noReady = true;
  }, e => { showErr({ code: 'counter-' + errCode(e) }); }));
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && auth.currentUser) {
    if (billsKey !== dayKey()) subBills(auth.currentUser.uid);
    applyDaily(); render();
  }
});

window.DB = {
  add(o) {
    const b = writeBatch(db), r = doc(col('products'));
    b.set(r, {
      name: o.name, category: o.category, unit: o.unit, salePrice: o.salePrice, avgCost: o.cost,
      stock: o.stock, minStock: o.minStock, barcode: o.barcode, type: o.type, thumb: o.thumb || '',
      hasPhoto: !!o.full, sold: 0, active: true, createdAt: ts(), updatedAt: ts()
    });
    if (o.full) b.set(doc(col('photos'), r.id), { full: o.full });
    if (o.stock > 0) b.set(doc(col('stockIns')), { productId: r.id, qty: o.stock, unitCost: o.cost, dayKey: dayKey(), createdAt: ts() });
    return b.commit();
  },
  edit(id, o) {
    const b = writeBatch(db), f = { name: o.name, category: o.category, unit: o.unit, salePrice: o.salePrice, minStock: o.minStock, barcode: o.barcode, updatedAt: ts() };
    if (o.full) { f.thumb = o.thumb || ''; f.hasPhoto = true; b.set(doc(col('photos'), id), { full: o.full }); }
    b.update(doc(col('products'), id), f);
    return b.commit();
  },
  archive(id) {
    const b = writeBatch(db);
    b.update(doc(col('products'), id), { active: false, updatedAt: ts() });
    return b.commit();
  },
  stockIn(p, q, uc, avg) {
    const b = writeBatch(db);
    b.update(doc(col('products'), p.id), { stock: increment(q), avgCost: avg, updatedAt: ts() });
    b.set(doc(col('stockIns')), { productId: p.id, qty: q, unitCost: uc, dayKey: dayKey(), createdAt: ts() });
    return b.commit();
  },
  // Asli bikri: sale document + stock kam + daily hisaab + bill number, sab ek hi batch mein
  sale(o) {
    const b = writeBatch(db), dk = dayKey(), r = doc(col('sales'));
    b.set(r, {
      dayKey: dk, createdAt: ts(), billNo: o.billNo, items: o.items, subtotal: o.subtotal, discount: o.discount,
      total: o.total, cost: o.cost, profit: o.profit, commission: o.commission, payment: o.payment,
      customerName: o.customerName, customerPhone: o.customerPhone, status: 'active', note: ''
    });
    const m = {};
    o.items.forEach(i => { const a = m[i.productId] || (m[i.productId] = { q: 0, t: i.type }); a.q += i.qty; });
    Object.keys(m).forEach(id => {
      const a = m[id], f = { sold: increment(a.q), updatedAt: ts() };
      if (a.t === 'item') f.stock = increment(-a.q);
      b.update(doc(col('products'), id), f);
    });
    const cash = o.payment === 'cash' ? o.total : 0, ud = o.payment === 'udhaar' ? o.total : 0;
    b.set(doc(col('daily'), dk), {
      dayKey: dk, sales: increment(o.total), cost: increment(o.cost), profit: increment(o.profit), bills: increment(1),
      cashIn: increment(cash), udhaar: increment(ud), commission: increment(o.commission), updatedAt: ts()
    }, { merge: true });
    b.set(doc(col('meta'), 'counter'), { billNo: increment(1) }, { merge: true });
    return b.commit();
  },
  // Bill cancel: sale ko "cancelled" likho (mitao nahi), stock wapas, daily hisaab ulta
  cancel(sl) {
    const b = writeBatch(db);
    b.update(doc(col('sales'), sl.id), { status: 'cancelled', cancelledAt: ts() });
    const m = {};
    sl.items.forEach(i => { const a = m[i.productId] || (m[i.productId] = { q: 0, t: i.type }); a.q += i.qty; });
    Object.keys(m).forEach(id => {
      const a = m[id], f = { sold: increment(-a.q), updatedAt: ts() };
      if (a.t === 'item') f.stock = increment(a.q);
      b.update(doc(col('products'), id), f);
    });
    const cash = sl.payment === 'cash' ? sl.total : 0, ud = sl.payment === 'udhaar' ? sl.total : 0;
    b.set(doc(col('daily'), sl.dayKey), {
      sales: increment(-sl.total), cost: increment(-(sl.cost || 0)), profit: increment(-(sl.profit || 0)), bills: increment(-1),
      cashIn: increment(-cash), udhaar: increment(-ud), commission: increment(-(sl.commission || 0)), updatedAt: ts()
    }, { merge: true });
    return b.commit();
  },
  async photo(id) {
    const s = await getDoc(doc(col('photos'), id));
    return s.exists() ? s.data().full : '';
  }
};
