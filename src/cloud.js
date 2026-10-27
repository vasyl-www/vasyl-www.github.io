/* Хмарна частина: вхід через Google (Firebase Auth) і спільний контент (Firestore). Збирається esbuild у js/cloud.bundle.js.
   Конфіг Firebase береться з js/firebase-config.js. Це публічні ідентифікатори проєкту, не секрети: захист забезпечують правила Firestore й список дозволених доменів.
   Ключі API користувача сюди не передаються взагалі. */
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

const cfg = window.ORD_FIREBASE || {};
const enabled = !!(cfg.apiKey && cfg.projectId && cfg.authDomain && cfg.appId);
const listeners = [];
let cur = null, auth = null, db = null;

function pub(u) { return u ? { uid: u.uid, name: u.displayName || '', email: u.email || '', photo: u.photoURL || '' } : null; }

if (enabled) {
  const app = initializeApp({ apiKey: cfg.apiKey, authDomain: cfg.authDomain, projectId: cfg.projectId, appId: cfg.appId });
  auth = getAuth(app); db = getFirestore(app);
  onAuthStateChanged(auth, (u) => { cur = pub(u); listeners.forEach((f) => { try { f(cur); } catch (e) { /* ignore */ } }); });
  getRedirectResult(auth).catch(() => {});
}

const ORD_CLOUD = {
  enabled,
  user: () => cur,
  onAuth: (f) => { listeners.push(f); f(cur); },
  async signIn() {
    const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
    try { await signInWithPopup(auth, p); } catch (e) {
      if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) { await signInWithRedirect(auth, p); return; }
      throw e;
    }
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
