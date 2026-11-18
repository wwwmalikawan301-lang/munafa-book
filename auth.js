import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const box = document.createElement('div');
box.id = 'auth';
document.body.appendChild(box);
let mode = 'login', busy = false, creating = false;
const x = () => T[S.lang];
const val = id => (document.getElementById(id) || {}).value || '';
const setMsg = m => { const e = document.getElementById('am'); if (e) e.textContent = m || ''; };

function wait() {
  box.style.display = 'flex';
  box.innerHTML = '<div class="ab"><p>' + x().wait + '</p></div>';
}
function draw() {
  const q = x();
  box.style.display = 'flex';
  box.innerHTML = `<div class="ab"><h1>Munafa Book</h1>
  <input id="ae" type="email" autocomplete="email" placeholder="${q.email}">
  <input id="apw" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" placeholder="${q.pass}">
  ${mode === 'signup' ? `<input id="ash" placeholder="${q.shop}">` : ''}
  <p id="am" class="err"></p>
  <button class="btn" id="ago">${mode === 'login' ? q.login : q.signup}</button>
  <button class="btn alt" id="asw" style="margin-top:8px">${mode === 'login' ? q.toSignup : q.toLogin}</button>
  <div class="seg" style="margin-top:16px"><button class="btn alt" data-l="ur">اردو</button><button class="btn alt" data-l="rm">Roman</button><button class="btn alt" data-l="en">English</button></div></div>`;
  document.getElementById('ago').onclick = submit;
  document.getElementById('asw').onclick = () => { mode = mode === 'login' ? 'signup' : 'login'; draw(); };
  box.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { setLang(b.dataset.l); draw(); });
}
function errText(c) {
  const q = x();
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(c)) return q.authBad;
  if (c === 'auth/email-already-in-use') return q.authUsed;
  if (c === 'auth/weak-password') return q.authWeak;
  if (c === 'auth/invalid-email') return q.authBadMail;
  if (c === 'auth/network-request-failed') return q.authNet;
  if (c === 'auth/too-many-requests') return q.authMany;
  return q.authErr + ' (' + c + ')';
}
async function submit() {
  if (busy) return;
  const e = val('ae').trim(), p = val('apw'), n = val('ash').trim();
  if (!e || !p || (mode === 'signup' && !n)) { setMsg(x().authFill); return; }
  busy = true;
  const btn = document.getElementById('ago');
  btn.disabled = true;
  setMsg('');
  try {
    if (mode === 'login') {
      await signInWithEmailAndPassword(auth, e, p);
    } else {
      creating = true;
      const c = await createUserWithEmailAndPassword(auth, e, p);
      await setDoc(doc(db, 'shops', c.user.uid, 'profile', 'main'), { name: n, ownerUid: c.user.uid, createdAt: serverTimestamp() });
      S.shop = n; localStorage.shop = n; render();
      creating = false;
    }
  } catch (err) {
    creating = false;
    setMsg(errText(err.code || 'unknown'));
    btn.disabled = false;
  }
  busy = false;
}

onAuthStateChanged(auth, async u => {
  if (!u) { window.UID = null; mode = 'login'; draw(); return; }
  window.UID = u.uid;
  box.style.display = 'none';
  if (creating) return;
  try {
    const ref = doc(db, 'shops', u.uid, 'profile', 'main');
    const s = await getDoc(ref);
    if (s.exists()) { S.shop = s.data().name; localStorage.shop = S.shop; render(); }
    else await setDoc(ref, { name: S.shop, ownerUid: u.uid, createdAt: serverTimestamp() });
  } catch (e) { }
});
window.doLogout = () => { if (confirm(x().sure)) signOut(auth); };
wait();
