import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, deleteUser } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { resolveUserShop, joinShopByCode } from "./staff.js";

const box = document.createElement('div');
box.id = 'auth';
document.body.appendChild(box);
let mode = 'login', busy = false, creating = false;
let flash = '', keepMode = false, lastEmail = '';
const x = () => T[S.lang] || T.rm;
const val = id => (document.getElementById(id) || {}).value || '';
const setMsg = (m, ok) => {
  const e = document.getElementById('am');
  if (e) { e.textContent = m || ''; e.style.color = ok ? '#0B5D4B' : ''; }
};
const FP = {
  forgot: { ur: 'پاس ورڈ بھول گئے؟', rm: 'Password bhool gaye?', en: 'Forgot password?' },
  mail: { ur: 'پہلے ای میل لکھیں', rm: 'Pehle email likhein', en: 'Type your email first' },
  sent: { ur: 'ری سیٹ لنک آپ کی ای میل پر بھیج دیا گیا ہے', rm: 'Reset link aap ki email par bhej diya gaya hai', en: 'Reset link sent to your email' }
};
const fp = k => FP[k][S.lang] || FP[k].rm;

function wait() {
  box.style.display = 'flex';
  box.innerHTML = '<div class="ab"><p>' + x().wait + '</p></div>';
}

function draw() {
  const q = x();
  box.style.display = 'flex';
  box.innerHTML = `<div class="ab"><h1>Munafa Book</h1>
  <input id="ae" type="email" autocomplete="email" placeholder="${q.email}" value="${lastEmail.replace(/"/g, '&quot;')}">
  <input id="apw" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" placeholder="${q.pass}">
  ${mode === 'signup' ? `<input id="ash" placeholder="${q.shop}"><input id="ainv" placeholder="${q.inviteOpt}">` : ''}
  <p id="am" class="err"></p>
  <button class="btn" id="ago">${mode === 'login' ? q.login : q.signup}</button>
  <button class="btn alt" id="asw" style="margin-top:8px">${mode === 'login' ? q.toSignup : q.toLogin}</button>
  ${mode === 'login' ? `<button class="btn alt" id="afp" style="margin-top:8px">${fp('forgot')}</button>` : ''}
  <div class="seg" style="margin-top:16px"><button class="btn alt" data-l="ur">اردو</button><button class="btn alt" data-l="rm">Roman</button><button class="btn alt" data-l="en">English</button></div></div>`;
  document.getElementById('ago').onclick = submit;
  document.getElementById('asw').onclick = () => { lastEmail = val('ae').trim(); mode = mode === 'login' ? 'signup' : 'login'; draw(); };
  const f = document.getElementById('afp');
  if (f) f.onclick = forgot;
  box.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { lastEmail = val('ae').trim(); setLang(b.dataset.l); draw(); });
  if (flash) { setMsg(flash); flash = ''; }
}

function errText(c) {
  const q = x();
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(c)) return q.authBad;
  if (c === 'auth/email-already-in-use') return q.authUsed;
  if (c === 'auth/weak-password') return q.authWeak;
  if (c === 'auth/invalid-email') return q.authBadMail;
  if (c === 'auth/network-request-failed') return q.authNet;
  if (c === 'auth/too-many-requests') return q.authMany;
  if (c === 'invalid-code' || c === 'code-used' || c === 'code-required') return q.badInvite;
  return q.authErr + ' (' + c + ')';
}

async function forgot() {
  if (busy) return;
  const e = val('ae').trim();
  lastEmail = e;
  if (!e) { setMsg(fp('mail')); return; }
  busy = true;
  setMsg('');
  try {
    await sendPasswordResetEmail(auth, e);
    setMsg(fp('sent'), true);
  } catch (err) {
    setMsg(errText(err.code || err.message || 'unknown'));
  }
  busy = false;
}

async function submit() {
  if (busy) return;
  const e = val('ae').trim(), p = val('apw'), n = val('ash').trim(), inv = val('ainv').trim();
  lastEmail = e;
  if (!e || !p || (mode === 'signup' && !n && !inv)) { setMsg(x().authFill); return; }
  busy = true;
  const btn = document.getElementById('ago');
  btn.disabled = true;
  setMsg('');
  let created = null;
  try {
    if (mode === 'login') {
      await signInWithEmailAndPassword(auth, e, p);
    } else {
      creating = true;
      const c = await createUserWithEmailAndPassword(auth, e, p);
      created = c;
      if (inv) {
        const res = await joinShopByCode(c.user, inv, n || e);
        S.shopId = res.shopId; S.role = res.role;
        try {
          const ps = await getDoc(doc(db, 'shops', res.shopId, 'profile', 'main'));
          if (ps.exists() && ps.data().name) { S.shop = ps.data().name; localStorage.shop = S.shop; }
        } catch (e2) {}
      } else {
        const shopName = n || 'Meri Dukan';
        await setDoc(doc(db, 'shops', c.user.uid, 'profile', 'main'), { name: shopName, ownerUid: c.user.uid, createdAt: serverTimestamp() });
        await setDoc(doc(db, 'shops', c.user.uid, 'members', c.user.uid), { role: 'owner', name: shopName, active: true, createdAt: serverTimestamp() });
        await setDoc(doc(db, 'userShops', c.user.uid), { shopId: c.user.uid, role: 'owner', createdAt: serverTimestamp() });
        S.shopId = c.user.uid; S.role = 'owner';
        S.shop = shopName; localStorage.shop = shopName;
      }
      creating = false;
      if (window.initShopData) await window.initShopData(c.user);
      box.style.display = 'none';
      render();
    }
  } catch (err) {
    creating = false;
    const msg = errText(err.code || err.message || 'unknown');
    if (created) {
      flash = msg; keepMode = true;
      setTimeout(() => { flash = ''; }, 4000);
      try { await deleteUser(created.user); } catch (e3) { try { await signOut(auth); } catch (e4) {} }
    }
    setMsg(msg);
    const b2 = document.getElementById('ago');
    if (b2) b2.disabled = false;
  }
  busy = false;
}

onAuthStateChanged(auth, async u => {
  if (!u) {
    window.UID = null; S.shopId = null; S.role = 'owner';
    if (!keepMode) mode = 'login';
    keepMode = false;
    draw(); return;
  }
  window.UID = u.uid;
  if (creating) return;
  box.style.display = 'none';
  try {
    const info = await resolveUserShop(u);
    S.shopId = info.shopId;
    S.role = info.role;
    const ref = doc(db, 'shops', S.shopId, 'profile', 'main');
    const s = await getDoc(ref);
    if (s.exists() && s.data().name) {
      S.shop = s.data().name; localStorage.shop = S.shop; render();
    } else if (S.role === 'owner' && S.shopId === u.uid) {
      await setDoc(ref, { name: S.shop, ownerUid: u.uid, createdAt: serverTimestamp() }, { merge: true });
    }
  } catch (e) {}
});

window.doLogout = () => { if (confirm(x().sure)) signOut(auth); };
wait();
