/* Хмарна частина: акаунти за ніком і паролем (Firebase Auth, email/password) і спільний контент (Firestore). Збирається esbuild у js/cloud.bundle.js.
   Конфіг Firebase береться з js/firebase-config.js. Це публічні ідентифікатори проєкту, не секрети: захист забезпечують правила Firestore й список дозволених доменів.
   Ключі API користувача сюди не передаються взагалі. */
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp, doc, setDoc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';

const cfg = window.ORD_FIREBASE || {};
const enabled = !!(cfg.apiKey && cfg.projectId && cfg.authDomain && cfg.appId);
const listeners = [];
let cur = null, auth = null, db = null;

function pub(u) { return u ? { uid: u.uid, name: u.displayName || (u.email || '').split('@')[0], email: '', photo: '' } : null; }
/* Нік → службова адреса для Firebase (справжня пошта не потрібна; відновлення пароля через пошту неможливе) */
function nickOk(n) { return /^[a-z0-9_]{3,20}$/.test(n); }
function mail(n) { return n + '@ord2.user'; }
let admin = false;

if (enabled) {
  const app = initializeApp({ apiKey: cfg.apiKey, authDomain: cfg.authDomain, projectId: cfg.projectId, appId: cfg.appId });
  auth = getAuth(app); db = getFirestore(app);
  onAuthStateChanged(auth, async (u) => { cur = pub(u); admin = false;
    if (u) { try { admin = (await getDoc(doc(db, 'admins', u.uid))).exists(); } catch (e) { /* не адмін */ } }
    listeners.forEach((f) => { try { f(cur); } catch (e) { /* ignore */ } }); });
}

const ORD_CLOUD = {
  enabled,
  user: () => cur,
  onAuth: (f) => { listeners.push(f); f(cur); },
  nickOk,
  isAdmin: () => admin,
  async signUp(nick, pass) {
    nick = String(nick || '').trim().toLowerCase(); if (!nickOk(nick)) throw new Error('Нік: 3–20 символів, латиниця, цифри або _');
    if (String(pass || '').length < 8) throw new Error('Пароль має містити щонайменше 8 символів');
    const c = await createUserWithEmailAndPassword(auth, mail(nick), pass);
    await updateProfile(c.user, { displayName: nick });
    cur = pub(c.user); cur.name = nick;
    try { await setDoc(doc(db, 'profiles', c.user.uid), { name: nick, created: serverTimestamp(), last: serverTimestamp() }); } catch (e) { /* профіль необов'язковий */ }
    listeners.forEach((f) => { try { f(cur); } catch (e) { /* ignore */ } });
  },
  async signIn(nick, pass) {
    nick = String(nick || '').trim().toLowerCase(); if (!nickOk(nick)) throw new Error('Невірний нік');
    const c = await signInWithEmailAndPassword(auth, mail(nick), pass);
    try { await updateDoc(doc(db, 'profiles', c.user.uid), { last: serverTimestamp() }); } catch (e) { /* ignore */ }
  },
  /* Лише для адміна (правила Firestore перевіряють це на сервері): список акаунтів, без паролів і без ключів ШІ */
  async adminUsers() {
    const s = await getDocs(query(collection(db, 'profiles'), limit(200))); const o = [];
    s.forEach((d) => { const x = d.data(); o.push({ uid: d.id, name: x.name || '', created: x.created && x.created.toMillis ? x.created.toMillis() : 0, last: x.last && x.last.toMillis ? x.last.toMillis() : 0 }); });
    return o.sort((a, b) => b.last - a.last);
  },
  async adminReports() {
    const s = await getDocs(query(collection(db, 'reports'), limit(100))); const o = [];
    s.forEach((d) => { const x = d.data(); o.push({ id: d.id, contentId: x.contentId, uid: x.uid }); }); return o;
  },
  signOut: () => fbSignOut(auth),
  /* Публікація: лише поля з білого списку; правила Firestore перевіряють це ще раз на сервері */
  async publish(d) {
    if (!cur) throw new Error('not signed in');
    const keys = ['kind', 'title', 'no', 'uk', 'explain', 'top', 'bottom', 'svg', 'q', 'sj', 'lvl', 'provider', 'model', 'tier', 'v'];
    const o = { uid: cur.uid, createdAt: serverTimestamp() };
    keys.forEach((k) => { if (d[k] !== undefined && d[k] !== '') o[k] = d[k]; });
    const r = await addDoc(collection(db, 'content'), o); return r.id;
  },
  async list({ tier, kind, max }) {
    const base = [where('tier', '==', tier)]; if (kind) base.push(where('kind', '==', kind));
    let snap;
    try { snap = await getDocs(query(collection(db, 'content'), ...base, orderBy('createdAt', 'desc'), limit(max || 40))); }
    catch (e) {   // немає складеного індексу: беремо без сортування й сортуємо на клієнті
      if (!e || (e.code !== 'failed-precondition' && !/index/i.test(e.message || ''))) throw e;
      snap = await getDocs(query(collection(db, 'content'), ...base, limit(max || 40)));
    }
    const out = []; snap.forEach((s) => { const x = s.data(); const t = x.createdAt && x.createdAt.toMillis ? x.createdAt.toMillis() : 0; out.push({ ...x, id: s.id, t, createdAt: undefined }); });
    out.sort((a, b) => b.t - a.t); return out;
  },
  async report(id) { if (!cur) throw new Error('not signed in'); await addDoc(collection(db, 'reports'), { uid: cur.uid, contentId: String(id).slice(0, 60), createdAt: serverTimestamp() }); },
  async remove(id) { await deleteDoc(doc(db, 'content', id)); },
  /* Синхронізація прогресу: один документ на користувача, читає й пише лише він */
  async pushState(str) { if (!cur) throw new Error('not signed in'); await setDoc(doc(db, 'users', cur.uid), { data: str, updated: serverTimestamp() }); },
  async pullState() {
    if (!cur) throw new Error('not signed in'); const s = await getDoc(doc(db, 'users', cur.uid)); if (!s.exists()) return null;
    const x = s.data(); return { data: String(x.data || ''), updated: x.updated && x.updated.toMillis ? x.updated.toMillis() : 0 };
  }
};
window.ORD_CLOUD = ORD_CLOUD;
