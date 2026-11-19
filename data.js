import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, doc, query, where, onSnapshot, writeBatch, increment, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let unsub = null;
const col = n => { if (!auth.currentUser) throw new Error('no-login'); return collection(db, 'shops', auth.currentUser.uid, n); };
const dayKey = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
const ts = () => serverTimestamp();

onAuthStateChanged(auth, u => {
  if (unsub) { unsub(); unsub = null; }
  P.length = 0;
  S.loading = !!u;
  DIAG.listen = u ? 'wait' : '-';
  if (!u) { render(); return; }
  render();
  unsub = onSnapshot(query(collection(db, 'shops', u.uid, 'products'), where('active', '==', true)), s => {
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
  }, e => { S.loading = false; DIAG.listen = 'error'; showErr(e); render(); });
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
  async photo(id) {
    const s = await getDoc(doc(col('photos'), id));
    return s.exists() ? s.data().full : '';
  }
};
