/* =====================================================================
   Implant Product Register ↔ Field Sales app link
   1. Publishes the product list (MRP only — never purchase rates) to catalog/products
      and the company letterhead to catalog/company, whenever stock data changes.
   2. Adds "Sell Order → Field quotations": every quotation the field executives make.
   ===================================================================== */
(function () {
  "use strict";
  if (!window.__invFs) return;   // claude.ai copy: nothing to link
  const fsx = () => window.__invFs();
  let pubState = "Waiting for the stock data to load…", lastSig = null, remoteSig = null, pubTimer = null, fq = {}, fqStarted = false, fqFilt = { exec: "", st: "", q: "" };
  const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + "." + s.length; };

  /* ---------- 1. product list for the field app ---------- */
  function catalogList() {
    return (S.master || []).filter(m => m.mat && m.desc).map(m => ({
      mat: String(m.mat), desc: String(m.desc), hsn: String(m.hsn || ""), uom: String(m.uom || ""),
      mrp: Math.round((+m.mrp || 0) * 100) / 100, gst: +m.igstRate || 0,
      div: (m.divCodes || "").split(", ").filter(Boolean).map(c => divName(c)).join(", ")
    })).sort((a, b) => a.desc.localeCompare(b.desc));
  }
  // purchase rates for the field app's admin-only General quotations (rates/products – ADMIN + staff only)
  function rateList() {
    return (S.master || []).filter(m => m.mat && (+m.rate || +m.netRate)).map(m => ({ mat: String(m.mat), rate: Math.round((+m.rate || 0) * 100) / 100, netRate: Math.round((+m.netRate || 0) * 100) / 100 }));
  }
  function companyCard() {
    const c = S.company || {}; const o = {};
    for (const k of ["name", "tagline", "address", "gstin", "cin", "stateCode", "phone", "email", "termsQuote", "closing", "signatory", "logo"]) if (c[k] != null && c[k] !== "") o[k] = c[k];
    return o;
  }
  function schedulePublish() { clearTimeout(pubTimer); pubTimer = setTimeout(publish, 4000); }
  const setPub = t => { pubState = t; const st = document.getElementById("fqPub"); if (st) st.innerHTML = t; };
  async function publish(force) {
    if (!S.me || !fsx() || !S.db) return setPub("Waiting for sign-in…");
    if (!S.loaded) { setPub("Waiting for the stock data to load…"); return schedulePublish(); }
    const list = catalogList();
    if (!list.length) return setPub(`<b style="color:var(--bad)">No products to send yet.</b> Restore your backup (Admin panel → Export &amp; backup → Restore) or add supplier invoices first.`);
    const co = companyCard();
    const rates = rateList();
    const sig = hash(JSON.stringify(list) + "|" + JSON.stringify(co) + "|" + JSON.stringify(rates));
    if (!force && (sig === lastSig || sig === remoteSig)) { lastSig = sig; return setPub(`Product list in the field app is up to date: <b>${list.length}</b> products (MRP, GST, HSN only — purchase rates are never shared).`); }
    try {
      await fsx().doc("catalog/company").set({ ...co, updatedAt: new Date().toISOString() });
      await fsx().doc("catalog/products").set({ list, count: list.length, sig, updatedAt: new Date().toISOString(), by: S.myEmail || "" });
      let rateNote = "";
      try { await fsx().doc("rates/products").set({ list: rates, count: rates.length, updatedAt: new Date().toISOString() }); }
      catch (e) { rateNote = ` <b style="color:var(--bad)">Purchase rates for General quotations weren't sent (${esc(e.code || e.message)}) — update the Firestore rules.</b>`; }
      lastSig = sig; remoteSig = sig;
      setPub(`✅ Product list sent to the field app: <b>${list.length}</b> products (just now).` + rateNote);
    } catch (e) { setPub(`<b style="color:var(--bad)">Couldn't send the product list: ${esc(e.code || e.message || String(e))}.</b> ${/permission/i.test(e.code || e.message || "") ? "Update the Firestore rules (paste the new firestore.rules → Publish), then click Send product list now." : ""}`); msg($("globalmsg"), "bad", "Product list for the field app wasn't sent: " + (e.code || e.message)); }
  }
  const _rebuild = rebuild;
  rebuild = function () { const r = _rebuild.apply(this, arguments); schedulePublish(); return r; };
  const _saveCompany = typeof saveCompany === "function" ? saveCompany : null;
  if (_saveCompany) saveCompany = async function () { const r = await _saveCompany.apply(this, arguments); schedulePublish(); return r; };

  /* ---------- 2. Field quotations view ---------- */
  const sell = PANELS.find(p => p.key === "sellorder"); if (sell && !sell.subs.some(s => s[0] === "fieldq")) sell.subs.push(["fieldq", "Field quotations"]);
  VIEW_SECTIONS.fieldq = ["tab-fieldq"]; if (!ALL_SECTIONS.includes("tab-fieldq")) ALL_SECTIONS.push("tab-fieldq");
  const stl = document.createElement("style"); stl.textContent = "#tab-fieldq td,#tab-fieldq th{white-space:normal;vertical-align:top}#tab-fieldq table{width:100%}#tab-fieldq td.code{white-space:nowrap}"; document.head.appendChild(stl);
  const sec = document.createElement("section"); sec.id = "tab-fieldq"; sec.className = "hidden"; sec.style.cssText = "display:grid;gap:14px";
  (document.getElementById("tab-sales") || document.querySelector("main")).after(sec);
  const _renderOps = renderOps;
  renderOps = function () { if (S.tab === "fieldq") { renderFieldQ(); return true; } return _renderOps.apply(this, arguments); };

  function startFq() {
    if (fqStarted || !fsx() || !S.me) return; fqStarted = true;
    fsx().collection("fquotes").onSnapshot(s => { fq = {}; s.docs.forEach(d => fq[d.id] = d.data()); if (S.tab === "fieldq") renderFieldQ(); }, e => { fqStarted = false; const el = document.getElementById("tab-fieldq"); if (el && S.tab === "fieldq") el.innerHTML = `<div class="panel pad"><div class="msg bad">Can't read field quotations: ${esc(e.message || e.code)}. Check the Firestore rules.</div></div>`; });
    fsx().doc("catalog/products").onSnapshot(s => { remoteSig = s.exists ? s.data().sig : null; }, () => { });
  }
  setInterval(() => { if (S.me && !fqStarted) { startFq(); schedulePublish(); } }, 1500);

  const ST = { open: "Open", accepted: "Accepted", lost: "Lost", cancelled: "Cancelled" };
  const n2 = v => Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function renderFieldQ() {
    const el = document.getElementById("tab-fieldq"); if (!el) return;
    const all = Object.entries(fq).map(([id, d]) => ({ id, ...d })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const execs = [...new Map(all.map(q => [q.exec, q.execName || q.exec])).entries()];
    const q = fqFilt.q.toLowerCase();
    const rows = all.filter(d => (!fqFilt.exec || d.exec === fqFilt.exec) && (!fqFilt.st || d.status === fqFilt.st) &&
      (!q || [d.no, d.doctor, d.customer && d.customer.name, ...(d.lines || []).map(l => l.desc + " " + l.mat)].join(" ").toLowerCase().includes(q)));
    const sum = a => a.reduce((x, d) => x + (+(d.totals && d.totals.grand) || 0), 0);
    el.innerHTML = `<div class="panel pad"><h2 style="margin:0 0 4px">Field quotations</h2>
      <p class="note" style="margin:0">Quotations made by field executives in the Field Sales app. They use this register's product list and MRP, and print in the same format. They don't change stock. To bill, make a sales order, challan or invoice here as usual.</p>
      <div class="row" style="margin-top:8px;gap:10px;align-items:center"><button class="btn" id="fqSend">Send product list now</button><span class="note" id="fqPub">${pubState}</span></div></div>
    <div class="panel"><div class="toolbar">
      <select id="fqExec"><option value="">All executives</option>${execs.map(([id, nm]) => `<option value="${esc(id)}" ${fqFilt.exec === id ? "selected" : ""}>${esc(id)} · ${esc(nm)}</option>`).join("")}</select>
      <select id="fqSt"><option value="">All status</option>${Object.entries(ST).map(([k, l]) => `<option value="${k}" ${fqFilt.st === k ? "selected" : ""}>${l}</option>`).join("")}</select>
      <input type="search" id="fqQ" placeholder="Search number, doctor, hospital, product…" value="${esc(fqFilt.q)}">
      <span class="note">${rows.length} quotation${rows.length === 1 ? "" : "s"} · ₹ ${n2(sum(rows))}</span></div>
      <div class="tablewrap"><table><thead><tr><th>Quotation no.</th><th>Date</th><th>Executive</th><th>Doctor / hospital</th><th>Products</th><th style="text-align:right">Grand total (₹)</th><th>Status / PDF</th></tr></thead><tbody>
      ${rows.length ? rows.map(d => `<tr><td class="code" style="font-size:11.5px">${esc(d.no)}</td><td>${esc(dmy(d.date))}</td><td>${esc(d.execName || "")} <span class="code">${esc(d.exec)}</span></td>
        <td><b>${esc(d.doctor || "")}</b><br><span class="note">${esc((d.customer && d.customer.name) || "")}</span></td>
        <td style="max-width:320px">${(d.lines || []).map(l => `${esc(l.qty)} × ${esc(l.desc)}`).join("<br>")}</td><td style="text-align:right">${n2(d.totals && d.totals.grand)}</td>
        <td><div style="display:grid;gap:4px;width:112px"><select data-fqst="${esc(d.id)}">${Object.entries(ST).map(([k, l]) => `<option value="${k}" ${d.status === k ? "selected" : ""}>${l}</option>`).join("")}</select><button class="btn" data-fqpdf="${esc(d.id)}">⬇ PDF</button></div></td></tr>`).join("") : `<tr><td colspan="7" class="empty">No field quotations yet.</td></tr>`}
      </tbody></table></div></div>`;
    document.getElementById("fqSend").onclick = () => { setPub("Sending…"); publish(true); };
    document.getElementById("fqExec").onchange = e => { fqFilt.exec = e.target.value; renderFieldQ(); };
    document.getElementById("fqSt").onchange = e => { fqFilt.st = e.target.value; renderFieldQ(); };
    const qi = document.getElementById("fqQ"); qi.oninput = e => { fqFilt.q = e.target.value; clearTimeout(renderFieldQ._t); renderFieldQ._t = setTimeout(() => { renderFieldQ(); const x = document.getElementById("fqQ"); x.focus(); x.setSelectionRange(x.value.length, x.value.length); }, 250); };
    el.querySelectorAll("[data-fqpdf]").forEach(b => b.onclick = async () => {
      const d = JSON.parse(JSON.stringify(fq[b.dataset.fqpdf])); d.company = { ...DEFAULT_COMPANY, ...S.company, ...(d.company || {}) }; if (S.company && S.company.logo) d.company.logo = S.company.logo; d.codeLabel = "Product Code"; d.exGst = true;
      try { const pdf = buildPdf(d); await save(d.no.replace(/\//g, "-") + ".pdf", new Uint8Array(pdf.output("arraybuffer"))); } catch (e) { msg($("globalmsg"), "bad", "Couldn't make the PDF: " + (e.message || e)); }
    });
    el.querySelectorAll("[data-fqst]").forEach(sl => sl.onchange = async () => {
      if (!canEditPanel("sellorder")) { msg($("globalmsg"), "bad", "You can view, but not change, sell orders."); renderFieldQ(); return; }
      const id = sl.dataset.fqst; try { await fsx().doc("fquotes/" + id).set({ ...fq[id], status: sl.value, statusAt: Date.now(), statusBy: S.myEmail || "" }); } catch (e) { msg($("globalmsg"), "bad", "Couldn't update: " + (e.message || e.code)); }
    });
  }
})();
