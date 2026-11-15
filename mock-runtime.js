/* =====================================================================
   LOCAL TEST RUNTIME for Dr. Han Field Sales – Visit Tracker
   ---------------------------------------------------------------------
   On claude.ai the app gets its database, user info and downloads from
   the claude.ai platform (window.claude). This file imitates that
   platform inside your own browser so you can test everything offline:

   • Data is stored in this browser's localStorage (key "han_mockdb").
   • A small panel (bottom-left) lets you switch "device":
       Admin computer  → you, the owner (log in as ADMIN)
       Executive phone 1..5 → different executives' phones
   • "Reset test data" wipes everything.

   Not used in the live claude.ai version.
   ===================================================================== */
(function(){
  const KEY="han_mockdb", ROLE="han_mockrole";
  let store={}; try{store=JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){}
  const role=(()=>{try{return localStorage.getItem(ROLE)||"owner"}catch(e){return "owner"}})();
  const uid=role==="owner"?"OWNER":role;
  const subs=[];
  const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(store))}catch(e){}};
  const notify=()=>{persist();subs.forEach(f=>{try{f()}catch(e){console.error(e)}})};
  const clone=o=>JSON.parse(JSON.stringify(o));
  const segs=p=>p.split("/").length;
  // privacy rules similar to the live database
  function canRead(p){
    if(uid==="OWNER")return !p.startsWith("data/users/")||p.startsWith("data/users/OWNER/");
    if(p.startsWith("data/users/"))return p.startsWith("data/users/"+uid+"/");
    if(p.startsWith("visits/")||p.startsWith("activity/"))return p.split("/")[1]===uid;
    return true;
  }
  const snapDoc=p=>{const ok=canRead(p)&&(p in store);return {id:p.split("/").pop(),exists:ok,data:()=>ok?clone(store[p]):undefined,metadata:{fromCache:false,hasPendingWrites:false}}};
  function query(c,opts){
    const q={
      where:()=>q, limit:n=>query(c,{...opts,limit:n}), orderBy:(f,d)=>query(c,{...opts,order:[f,d||"asc"]}),
      get:async()=>build(),
      onSnapshot:(next)=>{const f=()=>next(build());subs.push(f);setTimeout(f,5);return()=>{const i=subs.indexOf(f);if(i>=0)subs.splice(i,1)}},
      doc:id=>docRef(c+"/"+(id||("m"+Math.random().toString(36).slice(2,10)))),
      add:async d=>{const r=docRef(c+"/m"+Math.random().toString(36).slice(2,10));await r.set(d);return r},
      path:c
    };
    function build(){
      let docs=Object.keys(store).filter(k=>k.startsWith(c+"/")&&segs(k)===segs(c)+1&&canRead(k)).map(snapDoc);
      if(opts.order){const [f,d]=opts.order;docs.sort((a,b)=>{const x=a.data()[f],y=b.data()[f];return (x>y?1:x<y?-1:0)*(d==="desc"?-1:1)})}
      if(opts.limit)docs=docs.slice(0,opts.limit);
      return {docs,size:docs.length,empty:!docs.length,docChanges:()=>[],metadata:{fromCache:false,hasPendingWrites:false}};
    }
    return q;
  }
  function docRef(p){return {id:p.split("/").pop(),path:p,
    get:async()=>snapDoc(p),
    set:async d=>{store[p]=clone(d);notify()},
    update:async d=>{if(!(p in store))throw {code:"invalid_argument",message:"missing"};store[p]={...store[p],...clone(d)};notify()},
    delete:async()=>{delete store[p];notify()},
    onSnapshot:next=>{const f=()=>next(snapDoc(p));subs.push(f);setTimeout(f,5);return()=>{}},
    collection:c=>query(p+"/"+c,{})}}
  const db={doc:docRef,collection:c=>query(c,{})};
  const user={isOwner:async()=>uid==="OWNER",canEdit:async()=>uid==="OWNER",can:async()=>true,id:async()=>uid,me:async()=>({id:uid}),profiles:async()=>({})};
  const downloads={save:async({filename,data})=>{const b=data instanceof Blob?data:new Blob([data]);const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);return{status:"saved"}}};
  const sample=async()=>({text:'["Recap the doctor\'s last concern and bring the answer in writing.","Show a side-by-side comparison with their current supplier.","Ask clearly for a decision date before leaving."]'});
  window.claude={use:async n=>({db,user,downloads,sample})[n]||null};

  // ---- test panel ----
  window.addEventListener("DOMContentLoaded",()=>{
    const roles=[["owner","🖥 Admin computer (owner)"],["PHONE1","📱 Executive phone 1"],["PHONE2","📱 Executive phone 2"],["PHONE3","📱 Executive phone 3"],["PHONE4","📱 Executive phone 4"],["PHONE5","📱 Executive phone 5"]];
    const box=document.createElement("div");
    box.style.cssText="position:fixed;left:10px;bottom:10px;z-index:15;opacity:.92;background:#111827;color:#fff;font:12px Inter,system-ui,sans-serif;padding:8px 10px;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.3);display:flex;gap:6px;align-items:center;flex-wrap:wrap;max-width:94vw";
    box.innerHTML=`<b style="color:#fbbf24">TEST MODE</b><select id="mockRole" style="font-size:12px;padding:3px;border-radius:6px">${roles.map(([v,l])=>`<option value="${v}" ${v===role?"selected":""}>${l}</option>`).join("")}</select><button id="mockReset" style="font-size:12px;padding:3px 8px;border-radius:6px;border:0;background:#ef4444;color:#fff;cursor:pointer">Reset test data</button>`;
    document.body.appendChild(box);
    box.querySelector("#mockRole").onchange=e=>{localStorage.setItem(ROLE,e.target.value);location.reload()};
    box.querySelector("#mockReset").onclick=()=>{if(window.confirm("Delete ALL local test data?")){Object.keys(localStorage).filter(k=>k.startsWith("han_")).forEach(k=>localStorage.removeItem(k));location.reload()}};
  });
})();
