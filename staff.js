import { auth, db } from "./firebase-config.js";
import { doc, getDoc, setDoc, collection, getDocs, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function randCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function resolveUserShop(u) {
  const ref = doc(db, "userShops", u.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const d = snap.data();
    return { shopId: d.shopId || u.uid, role: d.role || "owner" };
  }
  const shopRef = doc(db, "shops", u.uid);
  const shopSnap = await getDoc(shopRef);
  if (shopSnap.exists()) {
    await setDoc(ref, { shopId: u.uid, role: "owner", updatedAt: serverTimestamp() }, { merge: true });
    return { shopId: u.uid, role: "owner" };
  }
  return { shopId: u.uid, role: "owner" };
}

export async function createInvite(shopId) {
  const code = randCode(8);
  const b = writeBatch(db);
  b.set(doc(db, "shops", shopId, "invites", code), {
    code, shopId, createdAt: serverTimestamp(), used: false, usedBy: ""
  });
  b.set(doc(db, "invites", code), {
    code, shopId, createdAt: serverTimestamp(), used: false, usedBy: ""
  });
  await b.commit();
  return code;
}

export async function joinShopByCode(u, codeRaw, staffName) {
  const code = String(codeRaw || "").trim().toUpperCase();
  if (!code) throw new Error("code-required");
  const topSnap = await getDoc(doc(db, "invites", code));
  if (!topSnap.exists()) throw new Error("invalid-code");
  const inv = topSnap.data();
  if (inv.used) throw new Error("code-used");
  const shopId = inv.shopId;
  const b = writeBatch(db);
  b.set(doc(db, "shops", shopId, "members", u.uid), {
    role: "cashier", name: staffName || u.email || "Cashier", active: true, createdAt: serverTimestamp()
  });
  b.set(doc(db, "userShops", u.uid), {
    shopId, role: "cashier", createdAt: serverTimestamp()
  });
  b.update(doc(db, "invites", code), {
    used: true, usedBy: u.uid, usedAt: serverTimestamp()
  });
  b.set(doc(db, "shops", shopId, "invites", code), {
    used: true, usedBy: u.uid, usedAt: serverTimestamp()
  }, { merge: true });
  await b.commit();
  return { shopId, role: "cashier" };
}

export async function listMembers(shopId) {
  const snap = await getDocs(collection(db, "shops", shopId, "members"));
  return snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
}

export async function toggleMember(shopId, memberId, active) {
  await setDoc(doc(db, "shops", shopId, "members", memberId), {
    active: !!active, updatedAt: serverTimestamp()
  }, { merge: true });
}
