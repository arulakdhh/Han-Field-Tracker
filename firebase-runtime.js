/* =====================================================================
   FIREBASE RUNTIME – Dr. Han Field Sales (GitHub Pages version)
   ---------------------------------------------------------------------
   Connects the app to YOUR Firebase project:
     • Firestore  = database (same structure as the claude.ai version)
     • Firebase Authentication = secure User ID + password login
   Loaded after the main app script; it replaces the claude.ai-specific
   parts (boot, login, passwords) and keeps every other feature as-is.
   Settings live in firebase-config.js.
   ===================================================================== */
const ADMIN_EMAIL=(window.HAN_ADMIN_EMAIL||"admin@hanfield.app").toLowerCase();
const EMAIL_DOMAIN=window.HAN_EMAIL_DOMAIN||"hanfield.app";
let fbUser=null, fs=null, fauth=null, pubNames={}, myAuth=null, myGen=0, authDocs={}, justLoggedIn=false;
const execEmail=(id,gen)=>`${String(id).toLowerCase()}.${gen}@${EMAIL_DOMAIN}`;

/* ---------- Firestore adapter (same API the app already uses) ---------- */
function fbErrMap(e){const m={"permission-denied":"invalid_argument","resource-exhausted":"resource_exhausted","unavailable":"unavailable","invalid-argument":"invalid_argument","not-found":"invalid_argument","unauthenticated":"invalid_argument"};return {code:m[e&&e.code]||"unavailable",message:(e&&e.message)||String(e)}}
const fbP=p=>p.catch(e=>{throw fbErrMap(e)});
const wSnap=s=>({id:s.id,exists:!!s.exists,data:()=>s.exists?s.data():undefined,metadata:{fromCache:!!s.metadata.fromCache,hasPendingWrites:!!s.metadata.hasPendingWrites}});
const wQS=q=>{const docs=q.docs.map(wSnap);return {docs,size:docs.length,empty:!docs.length,docChanges:()=>[],metadata:{fromCache:!!q.metadata.fromCache,hasPendingWrites:!!q.metadata.hasPendingWrites}}};
function wQuery(q){return {
  where:(f,o,v)=>wQuery(q.where(f,o,v)), orderBy:(f,d)=>wQuery(q.orderBy(f,d||"asc")), limit:n=>wQuery(q.limit(n)),
  get:()=>fbP(q.get().then(wQS)),
  onSnapshot:(next,err)=>q.onSnapshot(s=>next(wQS(s)),e=>err&&err(fbErrMap(e)))}}
function wColl(path){const c=fs.collection(path);return Object.assign(wQuery(c),{path,
  doc:id=>wDoc(id?path+"/"+id:c.doc().path),
  add:d=>fbP(c.add(d).then(r=>wDoc(r.path)))})}
function wDoc(path){const r=fs.doc(path);return {id:r.id,path,
  get:()=>fbP(r.get().then(wSnap)), set:d=>fbP(r.set(d)), update:d=>fbP(r.update(d)), delete:()=>fbP(r.delete()),
  onSnapshot:(next,err)=>r.onSnapshot(s=>next(wSnap(s)),e=>err&&err(fbErrMap(e))),
  collection:sub=>wColl(path+"/"+sub), acquire:async()=>({acquired:true})}}

/* ---------- start-up ---------- */
async function boot(){
  render();
  const cfg=window.FIREBASE_CONFIG||{};
  if(!window.firebase||!cfg.apiKey||/PASTE/i.test(cfg.apiKey)){
    offlineNote="Setup needed: paste your Firebase settings into firebase-config.js (see SETUP_STEPS.md, step 6).";
    booted=masterLoaded=ownLoaded=visitsLoaded=true; render(); return;
  }
  firebase.initializeApp(cfg);
  fs=firebase.firestore(); try{fs.settings({ignoreUndefinedProperties:true})}catch(e){}
  fauth=firebase.auth();
  db={doc:wDoc,collection:wColl};
  user={isOwner:async()=>session==="ADMIN",canEdit:async()=>session==="ADMIN",can:async()=>true,id:async()=>uid,me:async()=>({id:uid}),profiles:async()=>({})};
  downloads={save:async({filename,data})=>{const b=data instanceof Blob?data:new Blob([data]);const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);return {status:"saved"}}};
  sample=null;   // AI key points run only on claude.ai; built-in tips are used here
  db.doc("public/names").onSnapshot(s=>{pubNames=(s.exists&&s.data().list)||{};const h=$("#lgId");if(h&&h.oninput)h.oninput()},()=>{});
  fauth.onAuthStateChanged(u=>{onAuth(u).catch(e=>{console.error(e);offlineNote="Login error: "+(e.message||e);render()})});
}
async function onAuth(u){
  if(!u){
    if(fbUser){location.reload();return}
    session="";uid=null;booted=true;masterLoaded=ownLoaded=visitsLoaded=true;render();return;
  }
  if(fbUser&&fbUser.uid===u.uid)return;
  fbUser=u;
  const em=(u.email||"").toLowerCase();
  if(em===ADMIN_EMAIL){session="ADMIN";uid="ADMIN";me="";realAdmin=true}
  else{const loc=em.split("@")[0],i=loc.lastIndexOf(".");session=loc.slice(0,i).toUpperCase();myGen=+loc.slice(i+1);uid=session;me=session;realAdmin=false}
  booted=true;masterLoaded=false;ownLoaded=false;visitsLoaded=false;$("#main").dataset.screen="";render();
  const clear=()=>{if(/load|reach/i.test(offlineNote))offlineNote=""};
  const onErr=e=>{offlineNote="Couldn't load data ("+e.code+"). Check the Firestore rules (SETUP_STEPS.md, step 4).";masterLoaded=visitsLoaded=true;render()};
  db.doc("config/master").onSnapshot(s=>{
    master=s.exists?{executives:[],...s.data()}:{executives:[]};
    masterLoaded=true;clear();if(!myTheme())applyTheme(master.theme||"classic");fixMe();render();
  },onErr);
  db.collection("plans").orderBy("date","desc").limit(1000).onSnapshot(s=>{plans=s.docs.map(d=>({id:d.id,...d.data()}));render()},()=>{});
  db.collection("assign").onSnapshot(s=>{const a={};s.docs.forEach(d=>a[d.id]=d.data());assign=a;render()},()=>{});
  db.collection("transfers").orderBy("at","desc").limit(500).onSnapshot(s=>{transfers=s.docs.map(d=>({id:d.id,...d.data()}));render()},()=>{});
  if(realAdmin){
    adminDoc={pwHash:"firebase"};ownLoaded=true;
    subs.ADMIN=watchVisits("ADMIN",clear,onErr);
    watchOrders("ADMIN"); db.collection("orders").onSnapshot(s=>{s.docs.forEach(d=>watchOrders(d.id))},()=>{});
    db.collection("visits").onSnapshot(s=>{
      const ids=s.docs.map(d=>d.id);
      for(const id of ids)if(!subs[id])subs[id]=watchVisits(id,clear,onErr);
      if(!ids.length)visitsLoaded=true; render();
    },onErr);
    db.collection("activity").onSnapshot(s=>{actUsers=s.docs.map(d=>d.id);if(view==="activity")render()},()=>{});
    db.collection("auth").onSnapshot(s=>{
      authDocs={};s.docs.forEach(d=>authDocs[d.id]=d.data());authIds=new Set(Object.keys(authDocs));
      accounts=Object.entries(authDocs).filter(([k,a])=>!a.mustChange).map(([k,a])=>({uid:k,execId:k,pwHash:"x",pwSetAt:a.pwSetAt||a.setAt}));
      render();
    },()=>{});
  }else{
    let parentDone=false;
    db.doc("auth/"+session).onSnapshot(s=>{
      myAuth=s.exists?s.data():null; ownLoaded=true;
      if(!myAuth||myAuth.gen!==myGen){kickOut();return}
      if(myAuth.mustChange){loginStage="setpw";pendingId=session}else if(loginStage==="setpw"){loginStage="login"}
      if(!parentDone){parentDone=true;db.doc("visits/"+session).set({execId:session,execName:execById(session)?.name||pubNames[session]?.name||"",updated:Date.now()}).catch(()=>{})}
      $("#main").dataset.screen="";render();
    },()=>kickOut());
    subs[session]=watchVisits(session,clear,onErr);
    watchOrders(session);
  }
  if(justLoggedIn){justLoggedIn=false;setTimeout(()=>logAct("login",(session==="ADMIN"?"Admin":(execById(session)?.name||pubNames[session]?.name||session))+" logged in"),1500)}
  route();
}
function kickOut(){try{sessionStorage.setItem("han_msg","Your password was reset by the admin. Log in with the new default password.")}catch(e){};fauth.signOut()}

/* ---------- roles ---------- */
function loggedIn(){
  if(!fbUser||!session)return false;
  if(session==="ADMIN")return true;
  return !!(myAuth&&myAuth.gen===myGen&&!myAuth.mustChange);
}
function syncRole(){canAdmin=!!fbUser&&session==="ADMIN";canWrite=true}
async function verifyAdminPw(p){
  try{await fbUser.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(fbUser.email,p));return true}catch(e){return false}
}
function fbErr(x){
  const c=(x&&x.code)||"";
  if(/wrong-password|invalid-credential|invalid-login|user-not-found|invalid-email/.test(c))return "Wrong User ID or password.";
  if(/too-many-requests/.test(c))return "Too many attempts. Please wait a few minutes and try again.";
  if(/network/.test(c))return "No internet connection. Check your network.";
  if(/weak-password/.test(c))return "Password must be at least 6 characters.";
  if(/requires-recent-login/.test(c))return "Please log out and log in again, then retry.";
  if(/operation-not-allowed/.test(c))return "Email/Password login is not enabled in Firebase (SETUP_STEPS.md, step 3).";
  return (x&&x.message)||String(x);
}

/* ---------- login page ---------- */
function vLogin(){
  const icon=$(".brand img").src;
  if(loginStage==="setpw"){
    const nm=execById(pendingId)?.name||pubNames[pendingId]?.name||pendingId;
    return `<div class="card login"><img class="lg-i" src="${icon}" alt=""><h3>Welcome, ${esc(nm)}</h3>
    <p class="small muted" style="margin:0">First login — please set your own password. You'll use it from now on.</p>
    <label class="f">New password</label><input type="password" id="np1" autocomplete="new-password" placeholder="At least 6 characters">
    <label class="f">Confirm new password</label><input type="password" id="np2" autocomplete="new-password">
    <button class="btn pri" id="npGo">Save password &amp; continue</button>
    <div class="err" id="lgErr"></div>
    <p class="small" style="text-align:center;margin:10px 0 0"><a href="#" id="lgBack" style="color:var(--muted)">← Back to login</a></p></div>`;
  }
  let msg="";try{msg=sessionStorage.getItem("han_msg")||"";sessionStorage.removeItem("han_msg")}catch(e){}
  return `<div class="card login"><img class="lg-i" src="${icon}" alt=""><h3>Login</h3>
    <p class="small muted" style="margin:0">Dr. Han Healthcare · Field Sales</p>
    <label class="f">User ID</label><input type="text" id="lgId" autocomplete="username" placeholder="e.g. DHH01" style="text-transform:uppercase">
    <div class="hello" id="lgName"></div>
    <label class="f" style="margin-top:6px">Password</label><input type="password" id="lgPw" autocomplete="current-password">
    <label class="small" style="display:flex;gap:6px;align-items:center;margin-top:12px"><input type="checkbox" id="lgRem" checked> Keep me logged in on this device</label>
    <button class="btn pri" id="lgGo">Login</button>
    <div class="err" id="lgErr">${esc(msg)}</div>
    <p class="small muted" style="margin:12px 0 0">Executives: first time, use the default password from your admin.<br>Forgot password? Ask your admin to reset it.</p></div>`;
}
function bindLogin(){
  const err=t=>{$("#lgErr").textContent=t};
  if(loginStage==="setpw"){
    $("#lgBack").onclick=e=>{e.preventDefault();fauth.signOut()};
    $("#npGo").onclick=async()=>{
      const a=$("#np1").value,b=$("#np2").value; err("");
      if(a.length<6)return err("Password must be at least 6 characters.");
      if(a!==b)return err("Passwords don't match.");
      const btn=$("#npGo"); btn.disabled=true; btn.textContent="Saving…";
      try{
        await fbUser.updatePassword(a);
        await db.doc("auth/"+session).update({mustChange:false,pwSetAt:Date.now()});
        loginStage="login"; celebrate(false); logAct("login","First login – password set"); toast("Password set ✓ Welcome!");
      }catch(x){btn.disabled=false;btn.textContent="Save password & continue";err(fbErr(x))}
    };
    return;
  }
  const idI=$("#lgId"), pwI=$("#lgPw");
  idI.oninput=()=>{const id=normId(idI.value);$("#lgName").textContent=id==="ADMIN"?"🔑 Admin":(pubNames[id]?"👤 "+pubNames[id].name:"")};
  pwI.onkeydown=e=>{if(e.key==="Enter")$("#lgGo").click()};
  $("#lgGo").onclick=async()=>{
    err(""); const id=normId(idI.value), pw=pwI.value, rem=$("#lgRem").checked;
    if(!id||!pw)return err("Enter your User ID and password.");
    let email;
    if(id==="ADMIN")email=ADMIN_EMAIL;
    else{const p=pubNames[id]; if(!p||!p.gen)return err("User ID not found, or no login created yet. Check with your admin."); email=execEmail(id,p.gen)}
    const btn=$("#lgGo"); btn.disabled=true; btn.textContent="Checking…";
    try{
      await fauth.setPersistence(rem?firebase.auth.Auth.Persistence.LOCAL:firebase.auth.Auth.Persistence.SESSION);
      justLoggedIn=true; await fauth.signInWithEmailAndPassword(email,pw);
    }catch(x){justLoggedIn=false;btn.disabled=false;btn.textContent="Login";err(fbErr(x))}
  };
  setTimeout(()=>idI.focus(),50);
}
function updateHeader(){
  const va=$("#viewAs"), mb=$("#meBox"); va.hidden=true;
  if(!loggedIn()){mb.hidden=true;mb.innerHTML="";mb.dataset.k="";return}
  const isA=session==="ADMIN", e=execById(session), k=session+"|"+(e?.name||"");
  mb.hidden=false; if(mb.dataset.k===k)return; mb.dataset.k=k;
  mb.innerHTML=(isA?`<span class="adm">Admin</span>`:`<b>${esc(e?.name||"")}</b><span class="idc">${esc(session)}</span>`)+
    `<button class="hb" id="chPw">Change password</button><button class="hb" id="lgOut">Logout</button>`;
  $("#lgOut").onclick=()=>fauth.signOut();
  $("#chPw").onclick=changePwForm;
}
function changePwForm(){
  $("#sheet").innerHTML=`<div class="sheet-h"><div style="font-weight:700;font-size:16px">Change ${session==="ADMIN"?"admin ":""}password</div><button class="x" id="cpx">×</button></div>
  <div class="sheet-b"><span class="lbl" style="margin-top:0">Current password</span><input type="password" id="cp0">
  <span class="lbl">New password</span><input type="password" id="cp1" placeholder="At least 6 characters">
  <span class="lbl">Confirm new password</span><input type="password" id="cp2">
  <div class="err" id="cpErr"></div><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" id="cpc">Cancel</button><button class="btn pri" id="cpGo">Change password</button></div></div>`;
  $("#ov").classList.add("on"); docOpen=true;
  const close=()=>{$("#ov").classList.remove("on");docOpen=false}; $("#cpx").onclick=$("#cpc").onclick=close;
  $("#cpGo").onclick=async()=>{
    const er=$("#cpErr"); er.textContent=""; const o=$("#cp0").value,a=$("#cp1").value,b=$("#cp2").value;
    if(a.length<6)return er.textContent="New password must be at least 6 characters.";
    if(a!==b)return er.textContent="Passwords don't match.";
    if(!(await verifyAdminPw(o)))return er.textContent="Current password is wrong.";
    try{await fbUser.updatePassword(a);close();toast("Password changed ✓")}catch(x){er.textContent=fbErr(x)}
  };
}

/* ---------- admin: executive logins ---------- */
async function writeNames(){
  const list={}; for(const e of master.executives)list[e.id]={name:e.name,gen:(authDocs[e.id]&&authDocs[e.id].gen)||0};
  await db.doc("public/names").set({list,updated:Date.now()});
}
async function saveMaster(msg){
  if(!db)return toast("Database unavailable");
  if(saving)return; saving=true;
  try{
    await db.doc("config/master").set({executives:master.executives,...(master.theme?{theme:master.theme}:{}),updated:Date.now()});
    await writeNames(); toast(msg||"Saved"); fixMe();
  }catch(e){toast(e.code==="invalid_argument"?"Only the admin can change the team list":"Couldn't save ("+e.code+")")}
  finally{saving=false;render()}
}
/* Creates (or re-creates) an executive's login with a default password.
   force=false → only for executives who have no login yet (Excel upload).
   force=true  → admin "Set default" = password reset. */
async function setDefaultPw(id,p,force){
  if(authDocs[id]&&!force)return;
  if(String(p).length<6){toast(id+": default password needs at least 6 characters (Firebase rule)");return}
  let gen=((authDocs[id]&&authDocs[id].gen)||0)+1;
  for(let t=0;t<25;t++,gen++){
    const sec=firebase.initializeApp(window.FIREBASE_CONFIG,"sec"+Date.now()+"_"+t);
    try{await sec.auth().createUserWithEmailAndPassword(execEmail(id,gen),p);await sec.auth().signOut().catch(()=>{});await sec.delete().catch(()=>{});break}
    catch(e){await sec.delete().catch(()=>{});if(e.code==="auth/email-already-in-use")continue;toast(id+": "+fbErr(e));throw e}
  }
  await db.doc("auth/"+id).set({gen,mustChange:true,setAt:Date.now()});
  authDocs[id]={gen,mustChange:true}; authIds.add(id);
  await writeNames();
}
async function resetPw(id){
  const e=execById(id);
  $("#sheet").innerHTML=`<div class="sheet-h"><div style="font-weight:700;font-size:16px">Reset password · ${esc(e?.name||id)}</div><button class="x" id="rpx">×</button></div>
  <div class="sheet-b"><p class="small muted" style="margin-top:0">Give a new default password (at least 6 characters). ${esc(e?.name||id)} will be logged out, log in with it, and set their own password again.</p>
  <span class="lbl">New default password</span><input type="text" id="rpPw">
  <div class="err" id="rpErr"></div><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" id="rpc">Cancel</button><button class="btn pri" id="rpGo">Reset password</button></div></div>`;
  $("#ov").classList.add("on"); docOpen=true;
  const close=()=>{$("#ov").classList.remove("on");docOpen=false}; $("#rpx").onclick=$("#rpc").onclick=close;
  $("#rpGo").onclick=async()=>{
    const p=$("#rpPw").value.trim(); if(p.length<6)return $("#rpErr").textContent="At least 6 characters.";
    $("#rpGo").disabled=true;
    try{await setDefaultPw(id,p,true);logAct("admin","Reset password for "+id);close();toast("Password reset ✓ — tell "+(e?.name||id)+" the new default password")}
    catch(x){$("#rpGo").disabled=false;$("#rpErr").textContent=fbErr(x)}
  };
}

/* ---------- go ---------- */
route(); boot();