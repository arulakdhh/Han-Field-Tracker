/* =====================================================================
   Implant Product Register – Firebase connector
   Runs the register on the same Firebase project as the Field Sales app.
   • Replaces the claude.ai database with Firestore (all register data under inv/main/…)
   • Sign-in: Google (office staff) or the field app's ADMIN password (owner)
   Settings come from ../firebase-config.js (the same file the field app uses).
   ===================================================================== */
(function(){
  "use strict";
  const ROOT = "inv/main/";
  const ADMIN_EMAIL = (window.HAN_ADMIN_EMAIL || "admin@hanfield.app").toLowerCase();
  const TAB = "t" + Math.random().toString(36).slice(2);
  let fs = null, auth = null, fbUser = null, resolveReady, ready = new Promise(r => resolveReady = r);

  /* ---------- adapter: same API the register already uses ---------- */
  const errMap = e => { const c = (e && e.code) || ""; const o = new Error((e && e.message) || String(e)); o.code = c.replace(/^firestore\//, ""); return o; };
  const P = p => p.catch(e => { throw errMap(e); });
  const wSnap = s => ({ id: s.id, exists: !!s.exists, data: () => s.exists ? s.data() : undefined, metadata: { fromCache: !!s.metadata.fromCache, hasPendingWrites: !!s.metadata.hasPendingWrites } });
  const wQS = q => { const docs = q.docs.map(wSnap); return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: { fromCache: !!q.metadata.fromCache, hasPendingWrites: !!q.metadata.hasPendingWrites } }; };
  function wQuery(q) { return {
    where: (f, o, v) => wQuery(q.where(f, o, v)), orderBy: (f, d) => wQuery(q.orderBy(f, d || "asc")), limit: n => wQuery(q.limit(n)),
    get: () => P(q.get().then(wQS)),
    onSnapshot: (next, err) => q.onSnapshot(s => next(wQS(s)), e => err && err(errMap(e))) }; }
  function wColl(path) { const c = fs.collection(ROOT + path); return Object.assign(wQuery(c), { path,
    doc: id => wDoc(path + "/" + (id || c.doc().id)), add: d => P(c.add(d).then(r => wDoc(path + "/" + r.id))) }); }
  function wDoc(path) { const r = fs.doc(ROOT + path); return { id: r.id, path,
    get: () => P(r.get().then(wSnap)), set: d => P(r.set(d)), update: d => P(r.update(d)), delete: () => P(r.delete()),
    onSnapshot: (next, err) => r.onSnapshot(s => next(wSnap(s)), e => err && err(errMap(e))),
    collection: sub => wColl(path + "/" + sub),
    // short lock so two devices never hand out the same number
    acquire: async ({ holder, ttlMs } = {}) => {
      const lr = fs.doc(ROOT + "leases/" + path.replace(/\//g, "__"));
      try { return await fs.runTransaction(async t => { const s = await t.get(lr); const now = Date.now();
        if (s.exists) { const d = s.data(); if (d.exp > now && d.tab !== TAB) return { acquired: false }; }
        t.set(lr, { tab: TAB, holder: holder || "", exp: now + (ttlMs || 60000) }); return { acquired: true }; }); }
      catch (e) { return { acquired: false }; } } }; }
  const dbApi = { doc: wDoc, collection: wColl };
  const userApi = {
    email: async () => ((fbUser && fbUser.email) || "").toLowerCase(),
    name: async () => (fbUser && (fbUser.displayName || (fbUser.email === ADMIN_EMAIL ? "Admin" : ""))) || "",
    can: async () => true, id: async () => fbUser && fbUser.uid,
  };
  const downloadsApi = { save: async ({ filename, data }) => {
    const b = data instanceof Blob ? data : new Blob([data]); const a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); } };
  window.claude = { use: async name => { await ready; return name === "db" ? dbApi : name === "user" ? userApi : name === "downloads" ? downloadsApi : null; } };
  window.__invFs = () => fs;          // raw Firestore for the add-on (catalog, field quotations)
  window.__invUser = () => fbUser;

  /* ---------- sign-in screen ---------- */
  const css = `#invGate{position:fixed;inset:0;z-index:999;background:linear-gradient(135deg,#0e2a47,#145a5c);display:flex;align-items:center;justify-content:center;padding:18px;font-family:"IBM Plex Sans",system-ui,sans-serif}
  #invGate .bx{background:#fff;color:#17232b;border-radius:14px;max-width:380px;width:100%;padding:26px 24px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
  #invGate h2{margin:6px 0 2px;font-size:21px}#invGate p{color:#5d6b74;font-size:13px;margin:0 0 16px}
  #invGate input{width:100%;box-sizing:border-box;border:1px solid #dde3e7;border-radius:8px;padding:10px;font:inherit;margin-bottom:8px}
  #invGate button{width:100%;border:0;border-radius:8px;padding:11px;font:inherit;font-weight:600;cursor:pointer}
  #invGate .g{background:#fff;border:1px solid #dde3e7;display:flex;gap:10px;align-items:center;justify-content:center}
  #invGate .a{background:#0b6e75;color:#fff}#invGate .or{display:flex;align-items:center;gap:10px;color:#93a3ab;font-size:12px;margin:14px 0}
  #invGate .or:before,#invGate .or:after{content:"";flex:1;border-top:1px solid #dde3e7}#invGate .er{color:#b42318;font-size:13px;min-height:18px;margin-top:8px}
  #invMe{display:inline-flex;gap:8px;align-items:center;font-size:12px;color:var(--muted)}#invMe button{border:1px solid var(--line);background:var(--surface);border-radius:6px;padding:3px 9px;cursor:pointer;font:inherit;font-size:12px}`;
  function gate(msg) {
    let g = document.getElementById("invGate");
    if (!g) { const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st); g = document.createElement("div"); g.id = "invGate"; document.body.appendChild(g); }
    g.innerHTML = `<div class="bx"><div style="font-size:30px">🦴</div><h2>Implant Product Register</h2><p>Dr. Han Healthcare · inventory &amp; sales</p>
      <button class="g" id="igG"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.8 6C6.6 42.6 14.6 48 24 48z"/></svg>Sign in with Google</button>
      <div class="or">or admin login</div>
      <input id="igId" placeholder="User ID (ADMIN)" autocomplete="username"><input id="igPw" type="password" placeholder="Password" autocomplete="current-password">
      <button class="a" id="igGo">Log in</button><div class="er" id="igEr">${msg || ""}</div>
      <p style="margin:14px 0 0;font-size:12px">Staff: sign in with Google, then ask the admin to add your email in <b>Admin panel → Users &amp; access</b>.</p></div>`;
    const er = t => { document.getElementById("igEr").textContent = t; };
    document.getElementById("igG").onclick = async () => { er(""); try { const p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" }); await auth.signInWithPopup(p); } catch (e) { er(nice(e)); } };
    const go = async () => { er(""); const id = document.getElementById("igId").value.trim(), pw = document.getElementById("igPw").value;
      if (!id || !pw) return er("Enter User ID and password.");
      const email = id.toUpperCase() === "ADMIN" ? ADMIN_EMAIL : id.includes("@") ? id.toLowerCase() : "";
      if (!email) return er("Only the ADMIN login works here. Staff: use Sign in with Google.");
      try { await auth.signInWithEmailAndPassword(email, pw); } catch (e) { er(nice(e)); } };
    document.getElementById("igGo").onclick = go; document.getElementById("igPw").onkeydown = e => { if (e.key === "Enter") go(); };
  }
  function nice(e) { const c = (e && e.code) || ""; if (/popup-closed|cancelled-popup/.test(c)) return "";
    if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(c)) return "Wrong User ID or password.";
    if (/unauthorized-domain/.test(c)) return "This website isn't allowed for Google sign-in yet (Firebase → Authentication → Settings → Authorized domains).";
    if (/operation-not-allowed/.test(c)) return "Google sign-in isn't switched on in Firebase (Authentication → Sign-in method → Google).";
    if (/popup-blocked/.test(c)) return "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.";
    if (/too-many/.test(c)) return "Too many attempts. Wait a few minutes."; return (e && e.message) || "Sign-in failed."; }
  function meBar() {
    if (document.getElementById("invMe")) return; const host = document.querySelector(".titlerow"); if (!host) return;
    const s = document.createElement("span"); s.id = "invMe";
    s.innerHTML = `<span>${(fbUser.email || "").replace(/</g, "&lt;")}</span><a href="../" style="color:var(--accent)">Field app</a><button id="invOut">Sign out</button>`;
    host.appendChild(s); document.getElementById("invOut").onclick = () => auth.signOut();
  }

  /* ---------- start ---------- */
  function start() {
    const cfg = window.FIREBASE_CONFIG || {};
    if (!window.firebase || !cfg.apiKey || /PASTE/i.test(cfg.apiKey)) { gate("Setup needed: firebase-config.js is missing or not filled in."); document.getElementById("igG").disabled = true; return; }
    const app = firebase.initializeApp(cfg, "inventory");   // own sign-in, separate from the field app
    fs = app.firestore(); try { fs.settings({ ignoreUndefinedProperties: true }); } catch (e) { }
    auth = app.auth();
    auth.onAuthStateChanged(u => {
      if (!u) { if (fbUser) { location.reload(); return; } gate(); return; }
      if (fbUser) return; fbUser = u;
      if (/\.\d+@/.test(u.email || "") && (u.email || "").toLowerCase() !== ADMIN_EMAIL) { auth.signOut(); return; }   // field executives can't use the register
      const g = document.getElementById("invGate"); if (g) g.remove();
      meBar(); resolveReady();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
