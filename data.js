import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, doc, query, where, onSnapshot, writeBatch, increment, serverTimestamp, getDoc, getDocs, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let unsubs = [];
let lastDaily = [];
let billsUnsub = null, billsKey = '';
const col = n => { if (!auth.currentUser) throw new Error('no-login'); return collection(db, 'shops', auth.currentUser.uid, n); };

// Day key single source (Asia/Karachi + settings.dayStart HH:MM)
function dayKey() {
  const startStr = (typeof S !== 'undefined' && S.cfg && S.cfg.dayStart) || '00:00';
  const parts = startStr.split(':');
  const sh = Math.min(23, Math.max(0, parseInt(parts[0], 10) || 0));
  const sm = Math.min(59, Math.max(0, parseInt(parts[1], 10) || 0));
  const now = new Date();
  const kStr = now.toLocaleString('en-CA', { timeZone: 'Asia/Karachi', hour12: false });
  // Build adjusted timestamp shifted back by (sh hours + sm mins)
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

function subBills(uid) {
  if (billsUnsub) { billsUnsub(); billsUnsub = null; }
  billsKey = dayKey();
  billsUnsub = onSnapshot(query(collection(db, 'shops', uid, 'sales'), where('dayKey', '==', billsKey)), s => {
    B.length = 0;
    s.docs.forEach(x => B.push(Object.assign({ id: x.id }, x.data({ serverTimestamps: 'estimate' }))));
    B.sort((a, b) => (b.billNo || 0) - (a.billNo || 0));
    render();
  }, e => { showErr({ code: 'bills-' + errCode(e) }); });
}

onAuthStateChanged(auth, async u => {
  unsubs.forEach(f => f());
  unsubs = [];
  if (billsUnsub) { billsUnsub(); billsUnsub = null; }
  B.length = 0;
  P.length = 0;
  C.length = 0;
  lastDaily = [];
  S.no = 1;
  S.noReady = false;
  S.loading = !!u;
  DIAG.listen = u ? 'wait' : '-';
  applyDaily();
  render();
  if (!u) return;
  const uid = u.uid;

  try {
    const sDoc = await getDoc(doc(db, 'shops', uid, 'settings', 'main'));
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

  subBills(uid);
  setTimeout(() => { if (auth.currentUser && auth.currentUser.uid === uid) S.noReady = true; }, 3000);

  unsubs.push(onSnapshot(query(collection(db, 'shops', uid, 'products'), where('active', '==', true)), s => {
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

  unsubs.push(onSnapshot(query(collection(db, 'shops', uid, 'customers'), where('active', '==', true)), s => {
    C.length = 0;
    s.forEach(d => C.push(Object.assign({ id: d.id }, d.data())));
    C.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    render();
  }, e => { showErr({ code: 'cust-' + errCode(e) }); }));

  unsubs.push(onSnapshot(query(collection(db, 'shops', uid, 'daily'), where('dayKey', '>=', keyDays(dayKey(), 45))), s => {
    lastDaily = s.docs.map(d => Object.assign({ id: d.id }, d.data()));
    applyDaily();
    render();
  }, e => { showErr({ code: 'daily-' + errCode(e) }); }));

  unsubs.push(onSnapshot(doc(db, 'shops', uid, 'meta', 'counter'), s => {
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
  dayKey,
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
  async ensureCustomer(name, phone) {
    const low = name.trim().toLowerCase();
    const found = C.find(c => (c.name || '').trim().toLowerCase() === low);
    if (found) {
      if (phone && !found.phone) await setDoc(doc(col('customers'), found.id), { phone, updatedAt: ts() }, { merge: true });
      return found.id;
    }
    const r = doc(col('customers'));
    await setDoc(r, { name: name.trim(), phone: phone || '', balance: 0, active: true, createdAt: ts(), updatedAt: ts() });
    return r.id;
  },
  async addManualUdhaar(name, phone, amount) {
    const cid = await this.ensureCustomer(name, phone);
    const dk = dayKey(), b = writeBatch(db);
    b.update(doc(col('customers'), cid), { balance: increment(amount), updatedAt: ts() });
    b.set(doc(col('daily'), dk), { dayKey: dk, udhaar: increment(amount), updatedAt: ts() }, { merge: true });
    return b.commit();
  },
  async receivePayment(customerId, amount, note) {
    const dk = dayKey(), b = writeBatch(db), pref = doc(col('payments'));
    b.set(pref, { customerId, amount, dayKey: dk, createdAt: ts(), status: 'active', note: note || '' });
    b.update(doc(col('customers'), customerId), { balance: increment(-amount), updatedAt: ts() });
    b.set(doc(col('daily'), dk), { dayKey: dk, cashIn: increment(amount), collected: increment(amount), updatedAt: ts() }, { merge: true });
    return b.commit();
  },
  async reversePayment(paymentId) {
    const pSnap = await getDoc(doc(col('payments'), paymentId));
    if (!pSnap.exists()) return;
    const p = pSnap.data();
    if (p.status === 'cancelled') return;
    const dk = S.day.closed ? dayKey() : (p.dayKey || dayKey());
    const b = writeBatch(db);
    b.update(doc(col('payments'), paymentId), { status: 'cancelled', cancelledAt: ts() });
    if (p.customerId) b.update(doc(col('customers'), p.customerId), { balance: increment(p.amount || 0), updatedAt: ts() });
    b.set(doc(col('daily'), dk), { dayKey: dk, cashIn: increment(-(p.amount || 0)), collected: increment(-(p.amount || 0)), updatedAt: ts() }, { merge: true });
    return b.commit();
  },
  async customerHistory(customerId) {
    const [sSnap, pSnap] = await Promise.all([
      getDocs(query(col('sales'), where('customerId', '==', customerId))),
      getDocs(query(col('payments'), where('customerId', '==', customerId)))
    ]);
    return {
      sales: sSnap.docs.map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => (b.dayKey || '').localeCompare(a.dayKey || '')),
      payments: pSnap.docs.map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => (b.dayKey || '').localeCompare(a.dayKey || ''))
    };
  },
  async migrateOldUdhaar() {
    const snap = await getDocs(query(col('sales'), where('payment', '==', 'udhaar')));
    const byName = new Map();
    C.forEach(c => byName.set((c.name || '').trim().toLowerCase(), c));
    for (const d of snap.docs) {
      const sl = d.data();
      if (sl.status === 'cancelled' || sl.customerId) continue;
      const cn = (sl.customerName || '').trim();
      if (!cn) continue;
      const key = cn.toLowerCase();
      let cust = byName.get(key);
      if (!cust) {
        const nr = doc(col('customers'));
        const obj = { name: cn, phone: sl.customerPhone || '', balance: 0, active: true, createdAt: ts(), updatedAt: ts() };
        await setDoc(nr, obj);
        cust = Object.assign({ id: nr.id }, obj);
        byName.set(key, cust);
      }
      const amt = +(sl.total || 0);
      const b = writeBatch(db);
      b.update(doc(col('sales'), d.id), { customerId: cust.id });
      b.update(doc(col('customers'), cust.id), { balance: increment(amt), updatedAt: ts() });
      await b.commit();
      cust.balance = (cust.balance || 0) + amt;
    }
  },
  sale(o) {
    const b = writeBatch(db), dk = dayKey(), r = doc(col('sales'));
    b.set(r, {
      dayKey: dk, createdAt: ts(), billNo: o.billNo, items: o.items, subtotal: o.subtotal, discount: o.discount,
      total: o.total, cost: o.cost, profit: o.profit, commission: o.commission, payment: o.payment,
      customerName: o.customerName || '', customerPhone: o.customerPhone || '', customerId: o.customerId || '',
      status: 'active', note: ''
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
    if (o.payment === 'udhaar' && o.customerId) {
      b.update(doc(col('customers'), o.customerId), { balance: increment(o.total), updatedAt: ts() });
    }
    b.set(doc(col('meta'), 'counter'), { billNo: increment(1) }, { merge: true });
    return b.commit();
  },
  cancel(sl) {
    const b = writeBatch(db);
    const targetDay = (S.day.closed && sl.dayKey === dayKey()) ? dayKey() : (sl.dayKey || dayKey());
    b.update(doc(col('sales'), sl.id), { status: 'cancelled', cancelledAt: ts() });
    const m = {};
    (sl.items || []).forEach(i => { const a = m[i.productId] || (m[i.productId] = { q: 0, t: i.type }); a.q += i.qty; });
    Object.keys(m).forEach(id => {
      const a = m[id], f = { sold: increment(-a.q), updatedAt: ts() };
      if (a.t === 'item') f.stock = increment(a.q);
      b.update(doc(col('products'), id), f);
    });
    const cash = sl.payment === 'cash' ? (sl.total || 0) : 0;
    const ud = sl.payment === 'udhaar' ? (sl.total || 0) : 0;
    b.set(doc(col('daily'), targetDay), {
      dayKey: targetDay, sales: increment(-(sl.total || 0)), cost: increment(-(sl.cost || 0)),
      profit: increment(-(sl.profit || 0)), bills: increment(-1),
      cashIn: increment(-cash), udhaar: increment(-ud), commission: increment(-(sl.commission || 0)), updatedAt: ts()
    }, { merge: true });
    if (sl.payment === 'udhaar' && sl.customerId) {
      b.update(doc(col('customers'), sl.customerId), { balance: increment(-(sl.total || 0)), updatedAt: ts() });
    }
    return b.commit();
  },
  async returnSale(sl, retItems) {
    const b = writeBatch(db);
    const tk = dayKey();
    const isClosedBillDay = lastDaily.some(d => d.id === sl.dayKey && d.closed);
    const accDay = isClosedBillDay ? tk : (sl.dayKey || tk);
    const refundAmt = retItems.reduce((a, r) => a + Math.round(r.price * r.qty), 0);
    const retCost = Math.round(retItems.reduce((a, r) => a + ((r.costAtSale || 0) * r.qty), 0) * 100) / 100;
    const retProfit = Math.round((refundAmt - retCost) * 100) / 100;

    b.set(doc(col('returns')), {
      saleId: sl.id, dayKey: accDay, items: retItems, refund: refundAmt,
      mode: sl.payment === 'udhaar' ? 'udhaar' : 'cash', createdAt: ts()
    });
    retItems.forEach(r => {
      const f = { sold: increment(-r.qty), updatedAt: ts() };
      if (r.type === 'item') f.stock = increment(r.qty);
      b.update(doc(col('products'), r.productId), f);
    });
    const isCash = sl.payment !== 'udhaar';
    b.set(doc(col('daily'), accDay), {
      dayKey: accDay,
      sales: increment(-refundAmt),
      cost: increment(-retCost),
      profit: increment(-retProfit),
      refunds: increment(isCash ? refundAmt : 0),
      cashOut: increment(isCash ? refundAmt : 0),
      udhaar: increment(isCash ? 0 : -refundAmt),
      updatedAt: ts()
    }, { merge: true });
    if (!isCash && sl.customerId) {
      b.update(doc(col('customers'), sl.customerId), { balance: increment(-refundAmt), updatedAt: ts() });
    }
    return b.commit();
  },
  async salesByDay(dk) {
    const s = await getDocs(query(col('sales'), where('dayKey', '==', dk)));
    return s.docs.map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => (b.billNo || 0) - (a.billNo || 0));
  },
  async monthDaily(ym) {
    const start = ym + '-01';
    const [y, m] = ym.split('-').map(Number);
    const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
    const end = `${ny}-${String(nm).padStart(2, '0')}-01`;
    const s = await getDocs(query(col('daily'), where('dayKey', '>=', start)));
    return s.docs.map(d => d.data()).filter(x => x.dayKey && x.dayKey < end).sort((a, b) => a.dayKey.localeCompare(b.dayKey));
  },
  async addExpense(amount, category, note) {
    const dk = dayKey(), b = writeBatch(db);
    b.set(doc(col('expenses')), { dayKey: dk, amount, category, note: note || '', createdAt: ts(), status: 'active' });
    b.set(doc(col('daily'), dk), { dayKey: dk, expenses: increment(amount), cashOut: increment(amount), updatedAt: ts() }, { merge: true });
    return b.commit();
  },
  async expensesByDay(dk) {
    const s = await getDocs(query(col('expenses'), where('dayKey', '==', dk)));
    return s.docs.map(d => Object.assign({ id: d.id }, d.data()));
  },
  async cancelExpense(eid) {
    const snap = await getDoc(doc(col('expenses'), eid));
    if (!snap.exists()) return;
    const ex = snap.data();
    if (ex.status === 'cancelled') return;
    const dk = ex.dayKey || dayKey(), amt = +(ex.amount || 0), b = writeBatch(db);
    b.update(doc(col('expenses'), eid), { status: 'cancelled', cancelledAt: ts() });
    b.set(doc(col('daily'), dk), { dayKey: dk, expenses: increment(-amt), cashOut: increment(-amt), updatedAt: ts() }, { merge: true });
    return b.commit();
  },
  async closeDay(countedCash, diff, note) {
    const dk = dayKey();
    await setDoc(doc(col('daily'), dk), {
      dayKey: dk, closed: true, closedAt: ts(), countedCash, cashDiff: diff, closeNote: note || '', updatedAt: ts()
    }, { merge: true });
  },
  async saveSettings(cfg) {
    await setDoc(doc(col('settings'), 'main'), Object.assign({}, cfg, { updatedAt: ts() }), { merge: true });
  },
  async photo(id) {
    const s = await getDoc(doc(col('photos'), id));
    return s.exists() ? s.data().full : '';
  }
};
