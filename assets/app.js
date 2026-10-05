/* CPW Job Pricer bundled */
/**
 * Calloway's Portable Welding — Job Pricing Calculator math.
 * Reproduces sheet tab "7. Job Pricing Calculator". Do not invent rates or formulas.
 */
const LABOR_ROWS = [
  {
    key: "aws",
    label: "AWS Certified Welder",
    hint: "Adjust rate based on job type.",
    defaultRate: 115,
  },
  {
    key: "awsDot",
    label: "AWS + DOT Certified Welder",
    hint: "Use for structural / DOT work.",
    defaultRate: 135,
  },
  {
    key: "helper",
    label: "Helper",
    hint: "",
    defaultRate: 55,
  },
  {
    key: "other",
    label: "Other Labor (owner, extra man, etc.)",
    hint: "Optional.",
    defaultRate: 100,
  },
];

const OTHER_COST_ROWS = [
  {
    key: "travel",
    label: "Mobilization / Travel / Truck fee",
    hint: "Common $75–$150 or include in labor",
  },
  {
    key: "consumables",
    label: "Consumables (wire, gas, discs, etc.)",
    hint: "Or use 5–10% of material cost",
  },
  {
    key: "equipment",
    label: "Equipment rental / specialty tools",
    hint: "",
  },
  {
    key: "permits",
    label: "Permits / inspections / other",
    hint: "",
  },
  {
    key: "contingency",
    label: "Contingency / miscellaneous",
    hint: "Optional buffer",
  },
];

const JOB_TYPES = ["Local", "Commercial", "Industrial", "DOT"];

const DEFAULT_SETTINGS = {
  rates: { aws: 115, awsDot: 135, helper: 55, other: 100 },
  markupPct: 0.25,
  taxRate: 0.0675,
};

function num(v) {
  if (v === "" || v === null || v === undefined) return 0;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v).replace(/[$,%\s,]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function calcLaborRow(men, hours, rate) {
  const m = num(men);
  const h = num(hours);
  const r = num(rate);
  const manHours = m * h;
  const laborDollars = manHours * r;
  return { men: m, hours: h, rate: r, manHours, laborDollars };
}

function calculate(input) {
  const laborIn = input.labor || [];
  const labor = LABOR_ROWS.map((meta, i) => {
    const row = laborIn[i] || {};
    const computed = calcLaborRow(
      row.men,
      row.hours,
      row.rate === undefined || row.rate === "" ? meta.defaultRate : row.rate
    );
    return { key: meta.key, label: meta.label, ...computed };
  });

  const totalManHours = labor.reduce((s, r) => s + r.manHours, 0);
  const totalLabor = labor.reduce((s, r) => s + r.laborDollars, 0);

  const materialCost = num(input.materialCost);
  const markupPct = num(input.markupPct);
  const materialsCharged = materialCost * (1 + markupPct);
  const grossOnMaterials = materialsCharged - materialCost;

  const otherIn = input.other || [];
  const other = OTHER_COST_ROWS.map((meta, i) => {
    const row = otherIn[i];
    let amount = 0;
    if (typeof row === "number" || typeof row === "string") amount = num(row);
    else if (row && typeof row === "object") amount = num(row.amount);
    return { key: meta.key, label: meta.label, amount };
  });
  const totalOther = other.reduce((s, r) => s + r.amount, 0);

  const subtotal = totalLabor + materialsCharged + totalOther;
  const taxRate = num(input.taxRate);
  const taxExempt = Boolean(input.taxExempt);
  const taxAmount = taxExempt ? 0 : subtotal * taxRate;
  const suggestedTotal = subtotal + taxAmount;

  const payrollLaborCost = num(input.payrollLaborCost);
  const payrollMissing = payrollLaborCost === 0;
  const totalYourCost = materialCost + payrollLaborCost + totalOther;
  const revenue = subtotal;
  const grossProfit = revenue - totalYourCost;
  const grossMarginPct = revenue === 0 ? 0 : grossProfit / revenue;

  return {
    labor,
    totalManHours,
    totalLabor,
    materialCost,
    markupPct,
    materialsCharged,
    grossOnMaterials,
    other,
    totalOther,
    subtotal,
    taxRate,
    taxExempt,
    taxAmount,
    suggestedTotal,
    payrollLaborCost,
    payrollMissing,
    totalYourCost,
    revenue,
    grossProfit,
    grossMarginPct,
  };
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function emptyJob(settings = DEFAULT_SETTINGS) {
  const rates = { ...DEFAULT_SETTINGS.rates, ...(settings.rates || {}) };
  return {
    id: null,
    name: "",
    customer: "",
    jobType: "",
    dateQuoted: todayISO(),
    estimatedDays: "",
    labor: LABOR_ROWS.map((r) => ({
      men: "",
      hours: "",
      rate: rates[r.key] ?? r.defaultRate,
      notes: "",
    })),
    materialCost: "",
    markupPct: settings.markupPct ?? DEFAULT_SETTINGS.markupPct,
    other: OTHER_COST_ROWS.map(() => ({ amount: "", notes: "" })),
    taxRate: settings.taxRate ?? DEFAULT_SETTINGS.taxRate,
    taxExempt: false,
    payrollLaborCost: "",
    updatedAt: null,
  };
}


function formatMoney(n) {
  const v = num(n);
  const abs = Math.abs(v);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return v < 0 ? "-$" + formatted : "$" + formatted;
}

function formatHours(n) {
  const v = num(n);
  const t = Math.round(v * 100) / 100;
  if (Number.isInteger(t)) return String(t);
  return String(t);
}

function formatPct(frac, digits = 1) {
  return (num(frac) * 100).toFixed(digits) + "%";
}

function jobTitle(job) {
  const name = (job.name || "").trim();
  const customer = (job.customer || "").trim();
  if (name && customer) return name + " — " + customer;
  return name || customer || "Untitled job";
}

function buildShareText(job, totals) {
  const customer = (job.customer || "").trim() || "—";
  const name = (job.name || "").trim() || "Untitled job";
  const type = (job.jobType || "").trim();
  const date = job.dateQuoted || "";
  const taxLine = totals.taxExempt
    ? formatMoney(totals.taxAmount) + " (exempt)"
    : formatMoney(totals.taxAmount);

  const lines = [
    "CALLOWAY'S PORTABLE WELDING",
    "Job Quote",
    "",
    "Customer: " + customer,
    "Job: " + name,
  ];
  if (type) lines.push("Type: " + type);
  if (date) lines.push("Date: " + date);
  lines.push(
    "",
    "Estimated labor: " + formatHours(totals.totalManHours) + " man-hours",
    "Labor: " + formatMoney(totals.totalLabor),
    "Materials: " + formatMoney(totals.materialsCharged),
    "Other costs: " + formatMoney(totals.totalOther),
    "Subtotal: " + formatMoney(totals.subtotal),
    "Sales tax: " + taxLine,
    "────────────────",
    "TOTAL: " + formatMoney(totals.suggestedTotal),
    "",
    "Thank you — Calloway's Portable Welding"
  );
  return lines.join("\n");
}

// Garnett's standalone copy: own localStorage namespace, never shared with any other copy.
const LS_PREFIX = "cpw-garnett-";
const LS_SETTINGS = LS_PREFIX + "v1.settings";
const LS_JOBS = LS_PREFIX + "v1.jobs";
const LS_CURRENT = LS_PREFIX + "v1.currentId";

const $ = (id) => document.getElementById(id);

function uid() {
  return "job-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function starterJob() {
  const j = emptyJob(settings);
  j.id = uid();
  j.updatedAt = new Date().toISOString();
  return j;
}

function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function storageSet(key, val) {
  try { localStorage.setItem(key, val); return true; } catch { return false; }
}

function loadSettings() {
  try {
    const raw = storageGet(LS_SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS, rates: { ...DEFAULT_SETTINGS.rates } };
    const parsed = JSON.parse(raw);
    return {
      rates: { ...DEFAULT_SETTINGS.rates, ...(parsed.rates || {}) },
      markupPct: parsed.markupPct ?? DEFAULT_SETTINGS.markupPct,
      taxRate: parsed.taxRate ?? DEFAULT_SETTINGS.taxRate,
    };
  } catch {
    return { ...DEFAULT_SETTINGS, rates: { ...DEFAULT_SETTINGS.rates } };
  }
}

function loadJobs() {
  try {
    const raw = storageGet(LS_JOBS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

let settings = { ...DEFAULT_SETTINGS, rates: { ...DEFAULT_SETTINGS.rates } };
let jobs = [starterJob()];
let current = jobs[0];
let currentId = current.id;

function persist() {
  try {
    current.updatedAt = new Date().toISOString();
    const idx = jobs.findIndex((j) => j.id === current.id);
    if (idx >= 0) jobs[idx] = current;
    else jobs.unshift(current);
    storageSet(LS_JOBS, JSON.stringify(jobs));
    storageSet(LS_CURRENT, current.id);
  } catch {
    /* keep jobs in memory for this session */
  }
}

function persistSettings() {
  try {
    storageSet(LS_SETTINGS, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

function displayPct(frac) {
  const n = num(frac) * 100;
  const t = Math.round(n * 10000) / 10000;
  if (Number.isInteger(t)) return String(t);
  return String(t);
}

function valOrEmpty(v) {
  if (v === "" || v === null || v === undefined) return "";
  return String(v);
}

function buildLabor() {
  const host = $("laborRows");
  if (!host) return;
  host.innerHTML = LABOR_ROWS.map((meta, i) => `
    <div class="labor-card" data-labor="${i}">
      <h3>${meta.label}</h3>
      ${meta.hint ? `<p class="hint">${meta.hint}</p>` : ""}
      <div class="grid-3">
        <label class="field"># of men
          <input data-f="men" inputmode="numeric" type="text" placeholder="0" />
        </label>
        <label class="field">Hours each
          <input data-f="hours" inputmode="decimal" type="text" placeholder="0" />
        </label>
        <label class="field">Rate $/hr
          <input data-f="rate" inputmode="decimal" type="text" placeholder="0" />
        </label>
      </div>
      <div class="labor-out">
        <span class="hrs"><span data-out="manHours">0</span> man-hours</span>
        <span class="dol" data-out="laborDollars">$0.00</span>
      </div>
    </div>
  `).join("") + `
    <div class="totals-row">
      <span class="lbl">TOTAL LABOR</span>
      <span><span id="outManHours">0</span> hrs · <span id="outLaborFooter">$0.00</span></span>
    </div>
  `;
}

function buildOther() {
  const host = $("otherRows");
  if (!host) return;
  host.innerHTML = OTHER_COST_ROWS.map((meta, i) => `
    <div class="other-row" data-other="${i}">
      <label class="field">${meta.label}
        ${meta.hint ? `<span class="sub">${meta.hint}</span>` : ""}
        <input data-f="amount" inputmode="decimal" type="text" placeholder="0.00" />
      </label>
    </div>
  `).join("") + `
    <div class="totals-row">
      <span class="lbl">TOTAL OTHER COSTS</span>
      <span id="outOtherFooter">$0.00</span>
    </div>
  `;
}

function readForm() {
  if ($("jobName")) current.name = $("jobName").value;
  if ($("customer")) current.customer = $("customer").value;
  if ($("jobType")) current.jobType = $("jobType").value;
  if ($("dateQuoted")) current.dateQuoted = $("dateQuoted").value;
  if ($("estimatedDays")) current.estimatedDays = $("estimatedDays").value;
  current.labor = LABOR_ROWS.map((_, i) => {
    const card = document.querySelector(`[data-labor="${i}"]`);
    const prev = (current.labor && current.labor[i]) || {};
    if (!card) return { men: prev.men || "", hours: prev.hours || "", rate: prev.rate || "", notes: prev.notes || "" };
    return {
      men: card.querySelector('[data-f="men"]').value,
      hours: card.querySelector('[data-f="hours"]').value,
      rate: card.querySelector('[data-f="rate"]').value,
      notes: prev.notes || "",
    };
  });
  if ($("materialCost")) current.materialCost = $("materialCost").value;
  if ($("markupPct")) current.markupPct = num($("markupPct").value) / 100;
  current.other = OTHER_COST_ROWS.map((_, i) => {
    const row = document.querySelector(`[data-other="${i}"]`);
    const prev = (current.other && current.other[i]) || {};
    if (!row) return { amount: prev.amount || "", notes: prev.notes || "" };
    return {
      amount: row.querySelector('[data-f="amount"]').value,
      notes: prev.notes || "",
    };
  });
  if ($("taxRate")) current.taxRate = num($("taxRate").value) / 100;
  if ($("taxExempt")) current.taxExempt = $("taxExempt").checked;
  if ($("payrollLaborCost")) current.payrollLaborCost = $("payrollLaborCost").value;
}

function writeForm() {
  if ($("jobName")) $("jobName").value = current.name || "";
  if ($("customer")) $("customer").value = current.customer || "";
  if ($("jobType")) $("jobType").value = current.jobType || "";
  if ($("dateQuoted")) $("dateQuoted").value = current.dateQuoted || "";
  if ($("estimatedDays")) $("estimatedDays").value = valOrEmpty(current.estimatedDays);
  LABOR_ROWS.forEach((_, i) => {
    const row = (current.labor && current.labor[i]) || {};
    const card = document.querySelector(`[data-labor="${i}"]`);
    if (!card) return;
    const men = card.querySelector('[data-f="men"]');
    const hours = card.querySelector('[data-f="hours"]');
    const rate = card.querySelector('[data-f="rate"]');
    if (men) men.value = valOrEmpty(row.men);
    if (hours) hours.value = valOrEmpty(row.hours);
    if (rate) rate.value = valOrEmpty(row.rate);
  });
  if ($("materialCost")) $("materialCost").value = valOrEmpty(current.materialCost);
  if ($("markupPct")) $("markupPct").value = displayPct(current.markupPct ?? settings.markupPct);
  OTHER_COST_ROWS.forEach((_, i) => {
    const row = (current.other && current.other[i]) || {};
    const el = document.querySelector(`[data-other="${i}"] [data-f="amount"]`);
    if (el) el.value = valOrEmpty(row.amount);
  });
  if ($("taxRate")) $("taxRate").value = displayPct(current.taxRate ?? settings.taxRate);
  if ($("taxExempt")) $("taxExempt").checked = Boolean(current.taxExempt);
  if ($("payrollLaborCost")) $("payrollLaborCost").value = valOrEmpty(current.payrollLaborCost);
  renderJobBar();
}

function renderTotals() {
  const t = calculate(current);
  t.labor.forEach((row, i) => {
    const card = document.querySelector(`[data-labor="${i}"]`);
    if (!card) return;
    const mh = card.querySelector('[data-out="manHours"]');
    const dol = card.querySelector('[data-out="laborDollars"]');
    if (mh) mh.textContent = formatHours(row.manHours);
    if (dol) dol.textContent = formatMoney(row.laborDollars);
  });
  const setTxt = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  setTxt("outManHours", formatHours(t.totalManHours));
  setTxt("outLaborFooter", formatMoney(t.totalLabor));
  setTxt("outMaterialsCharged", formatMoney(t.materialsCharged));
  setTxt("outGrossMaterials", formatMoney(t.grossOnMaterials));
  setTxt("outOtherFooter", formatMoney(t.totalOther));
  setTxt("outTotalLabor", formatMoney(t.totalLabor));
  setTxt("outSumMaterials", formatMoney(t.materialsCharged));
  setTxt("outSumOther", formatMoney(t.totalOther));
  setTxt("outSubtotal", formatMoney(t.subtotal));
  setTxt("outTax", formatMoney(t.taxAmount));
  setTxt("outSuggested", formatMoney(t.suggestedTotal));
  setTxt("dockPrice", formatMoney(t.suggestedTotal));
  const badge = $("exemptBadge");
  if (badge) badge.hidden = !t.taxExempt;
  setTxt("outYourMaterial", formatMoney(t.materialCost));
  setTxt("outYourOther", formatMoney(t.totalOther));
  setTxt("outYourCost", formatMoney(t.totalYourCost));
  setTxt("outRevenue", formatMoney(t.revenue));
  setTxt("outProfit", formatMoney(t.grossProfit));
  setTxt("outMargin", formatPct(t.grossMarginPct));
  const warn = $("marginWarn");
  if (warn) warn.hidden = !t.payrollMissing;
  const taxEl = $("taxRate");
  if (taxEl) taxEl.disabled = t.taxExempt;
  return t;
}

let saveTimer = null;
function onChange() {
  readForm();
  renderTotals();
  renderJobBar();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { persist(); } catch {} }, 120);
}

function renderJobBar() {
  const el = $("currentJobTitle");
  if (el) el.textContent = jobTitle(current);
}

function toast(msg) {
  const el = $("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2200);
}

function openSheet(id) {
  const el = $(id);
  if (!el) return;
  el.removeAttribute("hidden");
  el.classList.add("open");
}
function closeSheet(id) {
  const el = $(id);
  if (!el) return;
  el.classList.remove("open");
  el.setAttribute("hidden", "");
}

function scrollToLabor() {
  const labor = document.getElementById("laborSection");
  if (labor) labor.scrollIntoView({ behavior: "smooth", block: "start" });
  else window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderJobsList() {
  const host = $("jobsList");
  if (!host) return;
  const sorted = [...jobs].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  if (!sorted.length) {
    host.innerHTML = `<p class="muted">No saved jobs yet.</p>`;
    return;
  }
  host.innerHTML = sorted.map((j) => {
    const t = calculate(j);
    const active = j.id === current.id ? " active" : "";
    const when = j.updatedAt ? new Date(j.updatedAt).toLocaleDateString() : "";
    const currentTag = j.id === current.id ? `<span class="job-current-tag">Current job</span>` : "";
    return `
      <div class="job-item${active}" data-id="${j.id}">
        <h3>${escapeHtml(jobTitle(j))} ${currentTag}</h3>
        <p>${escapeHtml(j.jobType || "—")} · ${escapeHtml(j.dateQuoted || when)} · ${formatMoney(t.suggestedTotal)}</p>
        <div class="job-actions">
          <button class="btn navy" data-act="open" type="button">Open</button>
          <button class="btn" data-act="dup" type="button">Duplicate</button>
          <button class="btn danger" data-act="del" type="button">Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function writeSettingsForm() {
  const setVal = (id, v) => { const el = $(id); if (el) el.value = v; };
  setVal("setRateAws", settings.rates.aws);
  setVal("setRateDot", settings.rates.awsDot);
  setVal("setRateHelper", settings.rates.helper);
  setVal("setRateOther", settings.rates.other);
  setVal("setMarkup", displayPct(settings.markupPct));
  setVal("setTax", displayPct(settings.taxRate));
}

function newJob() {
  try { persist(); } catch {}
  const job = emptyJob(settings);
  job.id = uid();
  job.updatedAt = new Date().toISOString();
  jobs.unshift(job);
  current = job;
  currentId = job.id;
  try { persist(); } catch {}
  writeForm();
  renderTotals();
  closeSheet("jobsView");
  toast("New job");
  scrollToLabor();
}

function openJob(id) {
  try { persist(); } catch {}
  const job = jobs.find((j) => j.id === id);
  if (!job) return;
  current = job;
  currentId = job.id;
  try { persist(); } catch {}
  writeForm();
  renderTotals();
  closeSheet("jobsView");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function duplicateJob(id) {
  try { persist(); } catch {}
  const src = jobs.find((j) => j.id === id);
  if (!src) return;
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = uid();
  copy.name = (src.name || "Job") + " (copy)";
  copy.updatedAt = new Date().toISOString();
  jobs.unshift(copy);
  current = copy;
  currentId = copy.id;
  try { persist(); } catch {}
  writeForm();
  renderTotals();
  renderJobsList();
  toast("Duplicated");
}

function deleteJob(id) {
  const job = jobs.find((j) => j.id === id);
  if (!job) return;
  const ok = confirm("Delete \"" + jobTitle(job) + "\"? This cannot be undone.");
  if (!ok) return;
  jobs = jobs.filter((j) => j.id !== id);
  if (current.id === id) {
    if (!jobs.length) {
      const job2 = emptyJob(settings);
      job2.id = uid();
      jobs = [job2];
    }
    current = jobs[0];
    currentId = current.id;
    writeForm();
    renderTotals();
  }
  try { persist(); } catch {}
  renderJobsList();
  toast("Deleted");
}

async function shareQuote() {
  readForm();
  try { persist(); } catch {}
  const t = calculate(current);
  const text = buildShareText(current, t);
  const title = "CPW quote — " + jobTitle(current);
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast("Quote copied");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); toast("Quote copied"); }
    catch { prompt("Copy this quote:", text); }
    ta.remove();
  }
}

function saveSettingsFromForm() {
  settings.rates.aws = num($("setRateAws") && $("setRateAws").value) || DEFAULT_SETTINGS.rates.aws;
  settings.rates.awsDot = num($("setRateDot") && $("setRateDot").value) || DEFAULT_SETTINGS.rates.awsDot;
  settings.rates.helper = num($("setRateHelper") && $("setRateHelper").value) || DEFAULT_SETTINGS.rates.helper;
  settings.rates.other = num($("setRateOther") && $("setRateOther").value) || DEFAULT_SETTINGS.rates.other;
  const markupEl = $("setMarkup");
  settings.markupPct = num(markupEl && markupEl.value) / 100;
  if (!settings.markupPct && markupEl && markupEl.value !== "0") settings.markupPct = DEFAULT_SETTINGS.markupPct;
  settings.taxRate = num($("setTax") && $("setTax").value) / 100;
  persistSettings();
  closeSheet("settingsSheet");
  toast("Defaults saved");
}

function bind() {
  document.addEventListener("input", (e) => {
    if (e.target.closest("#settingsSheet") || e.target.closest("#jobsView")) return;
    if (e.target.closest(".app") || e.target.id === "taxExempt" || e.target.id === "payrollLaborCost") {
      onChange();
    }
  });
  document.addEventListener("change", (e) => {
    if (e.target && e.target.id === "taxExempt") onChange();
  });

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!t || !t.closest) return;

    const openJobs = t.closest(".js-open-jobs");
    if (openJobs) {
      e.preventDefault();
      renderJobsList();
      openSheet("jobsView");
      try { persist(); } catch {}
      return;
    }

    const newBtn = t.closest(".js-new-job");
    if (newBtn) {
      e.preventDefault();
      newJob();
      return;
    }

    const closeBtn = t.closest("[data-close]");
    if (closeBtn) {
      e.preventDefault();
      closeSheet(closeBtn.getAttribute("data-close"));
      return;
    }

    const actBtn = t.closest("[data-act]");
    if (actBtn) {
      e.preventDefault();
      const item = actBtn.closest(".job-item");
      if (!item) return;
      const id = item.getAttribute("data-id");
      const act = actBtn.getAttribute("data-act");
      if (act === "open") openJob(id);
      if (act === "dup") duplicateJob(id);
      if (act === "del") deleteJob(id);
      return;
    }

    if (t.closest("#btnSettings")) {
      writeSettingsForm();
      openSheet("settingsSheet");
      return;
    }
    if (t.closest("#btnSaveSettings")) {
      saveSettingsFromForm();
      return;
    }
    if (t.closest("#btnResetSettings")) {
      settings = { ...DEFAULT_SETTINGS, rates: { ...DEFAULT_SETTINGS.rates } };
      persistSettings();
      writeSettingsForm();
      toast("Shop defaults restored");
      return;
    }
    if (t.closest("#btnShare")) {
      shareQuote();
      return;
    }

    if (t.classList && t.classList.contains("sheet") && t.classList.contains("open")) {
      closeSheet(t.id);
    }
  });
}

try {
  settings = loadSettings();
  const loaded = loadJobs();
  if (loaded && loaded.length) {
    jobs = loaded;
  } else {
    jobs = [starterJob()];
    storageSet(LS_JOBS, JSON.stringify(jobs));
    storageSet(LS_CURRENT, jobs[0].id);
  }
  currentId = storageGet(LS_CURRENT) || jobs[0].id;
  current = jobs.find((j) => j.id === currentId) || jobs[0];
  currentId = current.id;
} catch {
  settings = { ...DEFAULT_SETTINGS, rates: { ...DEFAULT_SETTINGS.rates } };
  jobs = [starterJob()];
  current = jobs[0];
  currentId = current.id;
} finally {
  try { buildLabor(); } catch {}
  try { buildOther(); } catch {}
  try { writeForm(); } catch {}
  try { renderTotals(); } catch {}
  try { bind(); } catch {}
}

