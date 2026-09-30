import {
  plot,
  interactivePlot,
  surface,
  bars,
  autoRange,
  COLORS,
} from "./charts.js";
import { helpTopics, coverage } from "./help.js";

const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)],
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const load = (key, fallback) => {
  try {
    const value = localStorage.getItem("cg50." + key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};
const save = (key, value) => {
  try {
    localStorage.setItem("cg50." + key, JSON.stringify(value));
  } catch {
    toast(
      L(
        "Salvataggio locale non disponibile. Puoi esportare i dati.",
        "Local storage unavailable. You can export your data.",
      ),
    );
  }
};
let lang = load("lang", "it");
if (!["it", "en"].includes(lang)) lang = "it";
const L = (it, en) => (lang === "it" ? it : en);
const modes = [
  [
    "calc",
    "⌗",
    "Calcolo scientifico",
    "Scientific calculator",
    "RUN · MATRIX",
    0,
  ],
  ["graph", "∿", "Grafici 2D", "2D graphs", "GRAPH · DYNA", 0],
  ["graph3d", "◇", "Grafici 3D", "3D graphs", "3D GRAPH", 0],
  ["equations", "𝑥", "Equazioni", "Equations", "EQUATION · SOLVE", 0],
  [
    "matrix",
    "▦",
    "Matrici e vettori",
    "Matrices & vectors",
    "MATRIX · VECTOR",
    0,
  ],
  ["stats", "▥", "Statistica", "Statistics", "STATISTICS", 1],
  ["distribution", "⌒", "Distribuzioni", "Distributions", "DISTRIBUTION", 1],
  ["finance", "%", "Finanza", "Finance", "FINANCIAL", 1],
  ["table", "≡", "Tabelle", "Tables", "TABLE", 1],
  ["recursion", "↻", "Successioni", "Sequences", "RECURSION", 1],
  ["conic", "◯", "Coniche", "Conics", "CONICS", 2],
  ["geometry", "△", "Geometria", "Geometry", "GEOMETRY", 2],
  ["units", "⇄", "Unità e basi", "Units & bases", "CONVERSION · BASE-N", 2],
  ["sheet", "▤", "Foglio di calcolo", "Spreadsheet", "SPREADSHEET", 2],
  ["simulation", "⚄", "Simulazioni", "Simulations", "PROBABILITY", 2],
  ["python", ">_", "Python", "Python", "PYTHON", 2],
  ["notes", "✎", "Quaderno", "Notebook", "NOTES", 2],
];
let mode = modes.some((m) => m[0] === location.hash.slice(1))
    ? location.hash.slice(1)
    : "calc",
  fields = load("fields", {});
let history = load("history", []);
if (!Array.isArray(history)) history = [];
history = history.slice(0, 80);
let angle = load("angle", "DEG");
if (!["DEG", "RAD", "GRA"].includes(angle)) angle = "DEG";
let variables = load("variables", {}),
  ans = load("ans", 0),
  expression = load("expression", ""),
  lastResult = null,
  shift = false,
  finished = false,
  format = load("format", "NORM");
let worker,
  id = 0,
  pending = new Map(),
  chartState = null,
  resizeTimer,
  graphTimer,
  animation = null,
  graphVersion = 0,
  pyWorker = null,
  pyBusy = false,
  pyTimer = null;
function makeWorker() {
  worker = new Worker("worker.js");
  worker.onmessage = ({ data }) => {
    const job = pending.get(data.id);
    if (!job) return;
    clearTimeout(job.timer);
    pending.delete(data.id);
    data.error ? job.reject(new Error(data.error)) : job.resolve(data.result);
  };
  worker.onerror = () =>
    restartWorker(
      L(
        "Errore del motore di calcolo. Riprova.",
        "Calculation engine failed. Please retry.",
      ),
    );
}
function restartWorker(reason) {
  worker?.terminate();
  for (const p of pending.values()) {
    clearTimeout(p.timer);
    p.reject(new Error(reason));
  }
  pending.clear();
  makeWorker();
}
function request(payload) {
  return new Promise((resolve, reject) => {
    const key = ++id;
    pending.set(key, {
      resolve,
      reject,
      timer: setTimeout(
        () =>
          restartWorker(
            L(
              "Calcolo interrotto dopo 6 secondi. Riduci la complessità.",
              "Calculation stopped after 6 seconds. Reduce complexity.",
            ),
          ),
        6000,
      ),
    });
    worker.postMessage({ id: key, payload: { angle, ...payload } });
  });
}
makeWorker();
const defaults = {
  calc: {},
  graph: {
    f1: "x^2-4",
    f2: "",
    f3: "",
    type1: "cartesian",
    type2: "cartesian",
    type3: "cartesian",
    second1: "sin(t)",
    second2: "sin(t)",
    second3: "sin(t)",
    min: -5,
    max: 5,
    ymin: -5,
    ymax: 8,
    a: 1,
  },
  graph3d: { type: "surface", expr: "0.3*(x^2-y^2)", range: 3 },
  equations: {
    type: "polynomial",
    coefficients: "1, -3, 2",
    expr: "x^2-2",
    min: 0,
    max: 3,
    A: "[2,1;1,-1]",
    b: "5,1",
  },
  matrix: {
    type: "matrix",
    A: "[1,2;3,4]",
    B: "[2,0;0,2]",
    op: "det",
    power: 2,
    vA: "1,2,3",
    vB: "4,5,6",
    vop: "dot",
  },
  stats: {
    type: "summary",
    data: "2, 4, 4, 4, 5, 5, 7, 9",
    x: "1,2,3,4,5",
    y: "2,4,5,4,5",
    regression: "linear",
    degree: 2,
    mu: 5,
    sd: 2,
    level: 0.95,
    test: "t",
    chart: "histogram",
  },
  distribution: {
    type: "normal",
    op: "cdf",
    x: 1.96,
    upper: 2,
    mu: 0,
    sd: 1,
    n: 10,
    p: 0.5,
    lambda: 3,
    df: 10,
    df2: 12,
  },
  finance: {
    type: "tvm",
    pv: 100000,
    fv: 0,
    pmt: 0,
    n: 240,
    rate: 3.5,
    frequency: 12,
    begin: "end",
    days: 365,
    basis: 365,
    cash: "-1000,300,400,500",
    cost: 1000,
    price: 1500,
    start: "2026-01-01",
    end: "2026-12-31",
    salvage: 100,
    life: 5,
  },
  table: { f1: "x^2", f2: "sin(x)", start: -5, end: 5, step: 1 },
  recursion: { expr: "a+b", second: "a", a0: 0, b0: 1, count: 15 },
  conic: { type: "ellipse", a: 3, b: 2, h: 0, k: 0 },
  geometry: { points: "0,0; 4,0; 4,3", shape: "polygon" },
  units: {
    type: "units",
    value: 1,
    from: "m",
    to: "cm",
    baseValue: "255",
    fromBase: 10,
    toBase: 16,
    category: "length",
  },
  sheet: {},
  simulation: { type: "dice", trials: 1000 },
  python: {
    code: "from math import sqrt\n\nfor n in range(1, 11):\n    print(n, round(sqrt(n), 6))",
  },
  notes: { text: "" },
};
function get(k) {
  return fields[mode]?.[k] ?? defaults[mode]?.[k] ?? "";
}
function set(k, v) {
  fields[mode] ??= {};
  fields[mode][k] = v;
  save("fields", fields);
}
function num(k) {
  const s = String(get(k)).trim();
  if (!s)
    throw Error(
      L("Compila tutti i campi numerici.", "Fill in all numeric fields."),
    );
  const v = Number(s);
  if (!Number.isFinite(v))
    throw Error(
      L("Valore numerico non valido: ", "Invalid numeric value: ") + k,
    );
  return v;
}
function field(k, label, type = "text", full = false) {
  const v = get(k);
  return `<label class="field ${full ? "full" : ""}"><span>${label}</span>${type === "textarea" ? `<textarea data-field="${k}" spellcheck="false">${esc(v)}</textarea>` : `<input data-field="${k}" type="${type}" value="${esc(v)}" ${type === "number" ? 'step="any"' : ""} autocomplete="off" spellcheck="false">`}</label>`;
}
function select(k, label, options, full = false) {
  if (!options.some(([v]) => String(v) === String(get(k))))
    set(k, options[0][0]);
  return `<label class="field ${full ? "full" : ""}"><span>${label}</span><select data-field="${k}" data-render="true">${options.map(([v, t]) => `<option value="${v}" ${String(get(k)) === String(v) ? "selected" : ""}>${t}</option>`).join("")}</select></label>`;
}
const btn = (id, label, secondary = false) =>
  `<button class="button ${secondary ? "secondary" : ""}" id="${id}">${label}</button>`;
const notice = (text) => `<div class="notice">${text}</div>`;
const card = (title, body) =>
  `<section class="card"><div class="card-head"><h2>${title}</h2></div>${body}</section>`;
const output = '<div id="output" class="output" aria-live="polite"></div>';
const chart = (id = "chart", preview = false) =>
  `<div class="chart-wrap ${preview ? "preview" : ""}"><canvas id="${id}" role="img" aria-label="${L("Grafico matematico", "Mathematical graph")}"></canvas><span class="chart-tip">${L("Trascina · zoom con rotella", "Drag · scroll to zoom")}</span></div>`;
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("#toast").classList.remove("show"), 3200);
}
function error(err) {
  const messages = {
    "A finite real number is required": "Occorre un numero reale finito",
    "Undefined or infinite result": "Risultato indefinito o infinito",
    "Expression is empty or too long (max 2000 characters)":
      "Espressione vuota o troppo lunga (massimo 2000 caratteri)",
    "Expression is too complex": "Espressione troppo complessa",
    "Unsupported expression structure":
      "Struttura dell’espressione non supportata",
    "Only A…Z variable assignments are allowed":
      "Puoi assegnare valori solo alle variabili A…Z",
    "Square matrix required": "Occorre una matrice quadrata",
    "Polynomial roots did not converge":
      "Le radici del polinomio non sono convergenti",
    "Enter at least one function": "Inserisci almeno una funzione",
    "Integral did not converge; split the interval":
      "L’integrale non converge; suddividi l’intervallo",
    "min < max": "Il minimo deve essere inferiore al massimo",
    "Minimum must be less than maximum":
      "Il minimo deve essere inferiore al massimo",
    "Valid step required, max 2001 rows":
      "Passo non valido: massimo 2001 righe",
    "At least 2 observations required": "Occorrono almeno 2 osservazioni",
  };
  let text = err.message || String(err);
  if (lang === "it")
    text =
      messages[text] ||
      text
        .replace("Unknown variable: ", "Variabile sconosciuta: ")
        .replace("Unsupported function: ", "Funzione non supportata: ")
        .replace("Circular reference: ", "Riferimento circolare: ");
  return text;
}
function nice(v) {
  if (v === null || v === undefined) return L("n/d", "n/a");
  if (typeof v === "number")
    return Number(v.toPrecision(12)).toLocaleString(
      lang === "it" ? "it-IT" : "en-US",
      { maximumSignificantDigits: 12 },
    );
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
function tableHTML(rows, headers) {
  return `<div class="table-scroll"><table class="data-table"><thead><tr>${headers.map((v) => `<th>${esc(v)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v) => `<td>${esc(nice(v))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
const labels = () => ({
  sum: L("Somma", "Sum"),
  sumSquares: "Σx²",
  mean: L("Media", "Mean"),
  median: L("Mediana", "Median"),
  min: "Min",
  max: "Max",
  sigma: "σx",
  sampleSD: "sx",
  variance: L("Varianza campionaria", "Sample variance"),
  payment: L("Rata", "Payment"),
  futureValue: L("Valore futuro", "Future value"),
  periodicRate: L("Tasso per periodo", "Periodic rate"),
  interest: L("Interessi", "Interest"),
  total: L("Totale", "Total"),
  IRRPercent: "IRR %",
  effectivePercent: L("Tasso effettivo %", "Effective rate %"),
  nominalPercent: L("Tasso nominale %", "Nominal rate %"),
  profit: L("Utile", "Profit"),
  marginPercent: L("Margine %", "Margin %"),
  markupPercent: L("Ricarico %", "Markup %"),
  days: L("Giorni", "Days"),
  annualStraightLine: L("Quota annua lineare", "Annual straight-line charge"),
  totalInterest: L("Interessi totali", "Total interest"),
  statistic: L("Statistica test", "Test statistic"),
  pTwoSided: L("p bilaterale", "Two-sided p"),
  pLess: L("p sinistra", "Left-tail p"),
  pGreater: L("p destra", "Right-tail p"),
  confidence: L("Confidenza", "Confidence"),
  lower: L("Limite inferiore", "Lower bound"),
  upper: L("Limite superiore", "Upper bound"),
  integral: L("Integrale", "Integral"),
  slope: L("Pendenza", "Slope"),
  roots: L("Radici", "Roots"),
  minimum: L("Minimo", "Minimum"),
  maximum: L("Massimo", "Maximum"),
  distanceAB: L("Distanza AB", "Distance AB"),
  midpointAB: L("Punto medio AB", "Midpoint AB"),
  slopeAB: L("Pendenza AB", "Slope AB"),
  perimeter: L("Perimetro", "Perimeter"),
  area: L("Area", "Area"),
});
function renderOutput(result, target = $("#output")) {
  if (!target) return;
  const label = (k) => ({ it: {}, en: {} })[lang]?.[k] || labels()[k] || k;
  if (typeof result === "number" || typeof result === "string")
    target.innerHTML = `<div class="result-big mono">${esc(nice(result))}</div>`;
  else if (Array.isArray(result)) {
    target.innerHTML = Array.isArray(result[0])
      ? tableHTML(
          result,
          result[0].map((_, j) => j + 1),
        )
      : `<div class="metrics">${result.map((v, j) => `<div class="metric"><span>x${j + 1}</span><strong>${esc(nice(v))}</strong></div>`).join("")}</div>`;
  } else {
    const metrics = Object.entries(result).filter(
      ([k, v]) => !["schedule", "x", "y", "fitted", "coefficients"].includes(k),
    );
    target.innerHTML = `<div class="metrics">${metrics.map(([k, v]) => `<div class="metric"><span>${esc(label(k))}</span><strong>${esc(typeof v === "object" ? JSON.stringify(v) : nice(v))}</strong></div>`).join("")}</div>`;
    if (result.schedule)
      target.innerHTML += tableHTML(
        result.schedule.map((r) => Object.values(r)),
        Object.keys(result.schedule[0]),
      );
  }
}
async function run(payload, render = renderOutput, button = $("#run")) {
  const activeMode = mode;
  if (button) button.disabled = true;
  try {
    const result = await request(payload);
    if (mode === activeMode) await render(result);
    return result;
  } catch (e) {
    if (mode === activeMode && $("#output"))
      $("#output").innerHTML =
        `<div class="error-box">${esc(L("Controlla i dati: ", "Check the data: ") + error(e))}</div>`;
    else toast(error(e));
    return null;
  } finally {
    if (button?.isConnected) button.disabled = false;
  }
}
function download(filename, text, type = "text/plain") {
  const blob = new Blob([text], { type }),
    a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function csv(rows) {
  return rows
    .map((r) =>
      r.map((v) => '"' + String(v ?? "").replace(/"/g, '""') + '"').join(","),
    )
    .join("\r\n");
}
function navigate(next) {
  mode = next;
  chartState = null;
  clearTimeout(graphTimer);
  clearInterval(animation);
  animation = null;
  graphVersion++;
  if (location.hash !== "#" + mode) historyReplace(mode);
  render();
  $("#sidebar").classList.remove("open");
  $("#menu").setAttribute("aria-expanded", "false");
  window.scrollTo({ top: 0 });
}
function historyReplace(next) {
  window.history.replaceState(null, "", "#" + next);
}
function render() {
  const m = modes.find((m) => m[0] === mode);
  document.documentElement.lang = lang;
  $("#language").innerHTML =
    lang === "it" ? "IT <span>/ EN</span>" : "EN <span>/ IT</span>";
  $("#nav-caption").textContent = L("ESPLORA LE MODALITÀ", "EXPLORE THE MODES");
  $("#help-side").textContent = L("?  Guida e tutorial", "?  Help & tutorials");
  $("#help").ariaLabel = L("Apri guida", "Open help");
  $("#theme").ariaLabel = L("Cambia tema", "Change theme");
  $("#eyebrow").textContent = m[4];
  $("#title").textContent = m[lang === "it" ? 2 : 3];
  $("#subtitle").textContent = subtitle();
  $("#example").textContent = L("↗ Carica esempio", "↗ Load example");
  $("#footnote").innerHTML =
    L(
      "Progetto indipendente ispirato alla Casio FX-CG50. Compatibilità e limiti nella guida. Calcoli numerici in doppia precisione.",
      "Independent project inspired by the Casio FX-CG50. See help for compatibility and limits. Double-precision numerical calculations.",
    ) +
    ' <button class="button-link" id="coverage">' +
    L("Vedi copertura", "View coverage") +
    "</button>";
  let previous = -1;
  $("#navigation").innerHTML = modes
    .map((m) => {
      let group = "";
      if (m[5] !== previous) {
        previous = m[5];
        group = `<div class="nav-group">${[L("CALCOLO E GRAFICI", "CALCULATE & GRAPH"), L("ANALISI E DATI", "ANALYSIS & DATA"), L("STRUMENTI", "TOOLS")][m[5]]}</div>`;
      }
      return (
        group +
        `<button class="nav-item ${m[0] === mode ? "active" : ""}" data-mode="${m[0]}" title="${m[lang === "it" ? 2 : 3]}" ${m[0] === mode ? 'aria-current="page"' : ""}><span class="nav-icon">${m[1]}</span><span class="nav-text">${m[lang === "it" ? 2 : 3]}</span></button>`
      );
    })
    .join("");
  $("#content").innerHTML = {
    calc: calcUI,
    graph: graphUI,
    graph3d: surfaceUI,
    equations: equationUI,
    matrix: matrixUI,
    stats: statsUI,
    distribution: distributionUI,
    finance: financeUI,
    table: tableUI,
    recursion: recursionUI,
    conic: conicUI,
    geometry: geometryUI,
    units: unitsUI,
    sheet: sheetUI,
    simulation: simulationUI,
    python: pythonUI,
    notes: notesUI,
  }[mode]();
  $$("[data-mode]").forEach(
    (b) => (b.onclick = () => navigate(b.dataset.mode)),
  );
  $$("[data-field]").forEach((el) => {
    el.oninput = () => {
      set(el.dataset.field, el.value);
      if ($("#output") && !["graph", "graph3d"].includes(mode))
        $("#output").innerHTML = "";
    };
    el.onchange = () => {
      set(el.dataset.field, el.value);
      if (el.dataset.render) render();
    };
  });
  $("#coverage").onclick = () => openHelp("coverage");
  $("#example").onclick = () => loadExample(mode);
  wire();
}
function subtitle() {
  return {
    calc: L(
      "Le formule prendono forma. Dal primo calcolo all’analisi avanzata.",
      "Bring formulas to life. From your first calculation to advanced analysis.",
    ),
    graph: L(
      "Disegna, esplora e analizza le tue funzioni.",
      "Plot, explore and analyze your functions.",
    ),
    graph3d: L(
      "Superfici, sfere e cilindri da esplorare nello spazio.",
      "Explore surfaces, spheres and cylinders in space.",
    ),
    equations: L(
      "Polinomi, sistemi lineari e soluzioni numeriche.",
      "Polynomials, linear systems and numerical solutions.",
    ),
    matrix: L(
      "Algebra lineare, una riga alla volta.",
      "Linear algebra, one row at a time.",
    ),
    stats: L(
      "Trasforma i dati in risultati leggibili.",
      "Turn your data into readable results.",
    ),
    distribution: L(
      "Densità, probabilità e quantili.",
      "Density, probability and quantiles.",
    ),
    finance: L(
      "Tassi, flussi di cassa e piani di ammortamento.",
      "Rates, cash flows and amortization schedules.",
    ),
    table: L(
      "Esplora come cambiano i valori di una funzione.",
      "Explore how the values of a function change.",
    ),
    recursion: L(
      "Dalle formule ricorsive alle successioni.",
      "From recursive formulas to sequences.",
    ),
    conic: L(
      "Ellissi, parabole e iperboli con parametri modificabili.",
      "Ellipses, parabolas and hyperbolas with editable parameters.",
    ),
    geometry: L(
      "Coordinate, misure e poligoni.",
      "Coordinates, measurements and polygons.",
    ),
    units: L(
      "Conversioni di unità e numeri in basi diverse.",
      "Unit conversions and numbers in different bases.",
    ),
    sheet: L(
      "Un foglio essenziale, con formule e riferimenti alle celle.",
      "A compact sheet with formulas and cell references.",
    ),
    simulation: L(
      "Esperimenti casuali con monete e dadi.",
      "Random experiments with coins and dice.",
    ),
    python: L(
      "Scrivi ed esegui Python direttamente nel browser.",
      "Write and run Python right in your browser.",
    ),
    notes: L(
      "Appunti ed esercizi salvati sul tuo dispositivo.",
      "Notes and exercises saved on your device.",
    ),
  }[mode];
}

const keyRows = [
  [
    ["SHIFT", "shift"],
    ["OPTN", "catalog"],
    ["←", "left"],
    ["→", "right"],
    ["DEL", "delete"],
  ],
  [
    ["x²", "^2", "sqrt("],
    ["xʸ", "^", "nthRoot("],
    ["√", "sqrt(", "cbrt("],
    ["log", "log(", "10^("],
    ["ln", "ln(", "exp("],
  ],
  [
    ["sin", "sin(", "asin("],
    ["cos", "cos(", "acos("],
    ["tan", "tan(", "atan("],
    ["(", "("],
    [")", ")"],
  ],
  [
    ["π", "pi", "e"],
    ["x", "x", "i"],
    ["a b/c", "fraction(", "dms("],
    ["x⁻¹", "^(-1)", "!"],
    ["AC", "clear"],
  ],
  [
    ["7", "7"],
    ["8", "8"],
    ["9", "9"],
    ["÷", "/"],
    ["nCr", "nCr(", "nPr("],
  ],
  [
    ["4", "4"],
    ["5", "5"],
    ["6", "6"],
    ["×", "*"],
    ["|x|", "abs(", "conj("],
  ],
  [
    ["1", "1"],
    ["2", "2"],
    ["3", "3"],
    ["−", "-"],
    ["Ans", "Ans"],
  ],
  [
    ["0", "0"],
    [".", "."],
    ["(−)", "-"],
    ["+", "+"],
    ["EXE", "execute"],
  ],
];
function calcUI() {
  return `<div class="calc-layout"><div><section class="calculator" aria-label="${L("Calcolatrice scientifica", "Scientific calculator")}"><div class="device-brand">CG50 <small>SCIENTIFIC · GRAPHING</small></div><div class="display"><div class="display-top"><span id="display-mode">${angle} · ${format}</span><span>RUN · ${L("PRONTO", "READY")}</span></div><label class="sr-label" for="expression" hidden>${L("Espressione", "Expression")}</label><textarea id="expression" class="expression" spellcheck="false" autocomplete="off" aria-label="${L("Espressione matematica", "Mathematical expression")}" placeholder="${L("Scrivi una formula…", "Enter an expression…")}">${esc(expression)}</textarea><div id="calc-result" class="result" aria-live="polite">${lastResult ? esc(lastResult.text) : "0"}</div><div class="display-sub" id="calc-detail">${L("Invio o EXE per calcolare", "Enter or EXE to calculate")}</div></div><div class="calc-toolbar"><select id="angle" aria-label="${L("Unità angolare", "Angle unit")}">${["DEG", "RAD", "GRA"].map((v) => `<option ${angle === v ? "selected" : ""}>${v}</option>`).join("")}</select><select id="format" aria-label="${L("Formato risultato", "Result format")}">${["NORM", "FIX", "SCI", "ENG"].map((v) => `<option ${format === v ? "selected" : ""}>${v}</option>`).join("")}</select><button class="mini" id="fraction-toggle" title="${L("Decimale / frazione", "Decimal / fraction")}">S ⇄ D</button><button class="mini" id="store-A">STO A</button><button class="mini" id="copy-result">${L("Copia", "Copy")}</button></div><div class="keys">${keyRows
    .flat()
    .map(
      ([label, value, alt]) =>
        `<button class="key ${/^[0-9.]$/.test(value) ? "number" : ""} ${value === "execute" ? "exe" : ""} ${["clear", "delete"].includes(value) ? "action" : ""} ${value === "shift" ? "shift" : ""}" data-key="${esc(value)}" ${alt ? `data-alt="${esc(alt)}"` : ""} title="${esc(alt ? label + " · SHIFT: " + alt : label)}">${alt ? `<small>${esc(alt.replace("(", "").replace("^", ""))}</small>` : ""}${label}</button>`,
    )
    .join(
      "",
    )}</div><div class="calc-bottom"><span>CAD3D.EXPERT</span><span>MATHEMATICS, EVERYWHERE.</span></div></section><div class="shortcut"><kbd>Enter</kbd> ${L("calcola", "calculate")} &nbsp; <kbd>Esc</kbd> ${L("pulisci", "clear")}</div><div id="catalog-panel" hidden>${card(L("Catalogo funzioni", "Function catalog"), `<p class="muted">${L("Tocca una funzione per inserirla. Nella guida trovi sintassi ed esempi.", "Tap a function to insert it. Syntax and examples are in the help.")}</p><div class="catalog">${["asin(", "acos(", "atan(", "sinh(", "cosh(", "tanh(", "asinh(", "acosh(", "atanh(", "exp(", "log2(", "abs(", "arg(", "re(", "im(", "conj(", "complex(", "gcd(", "lcm(", "round(", "floor(", "ceil(", "mod(", "random()", "randomInt(", "nCr(", "nPr(", "!", 'intg("x^2",0,1)', 'diff("x^2",2)', 'sigma("n^2",1,10)', "Pol(", "Rec(", "dms(", "toDMS(", "sum(", "mean(", "median(", "std(", "variance(", "sort(", "det(", "inv(", "transpose(", "dot(", "cross(", "norm(", "bitAnd(", "bitOr(", "bitXor(", "bitNot(", "normalPDF(", "normalCDF(", "normalInv(", "binomialPDF(", "binomialCDF(", "poissonPDF(", "poissonCDF(", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((v) => `<button data-insert="${esc(v)}">${esc(v)}</button>`).join("")}</div>`)}</div></div><div class="stack"><section class="card"><div class="card-head"><h2>${L("Ogni formula, una scoperta", "Every formula, a discovery")}</h2><span class="mode-badge">GRAPH</span></div>${chart("preview", true)}<div class="chart-caption"><span><i class="swatch" style="background:${COLORS[0]}"></i>y = x² − 4</span><button class="button-link" data-mode="graph">${L("Esplora il grafico ↗", "Explore the graph ↗")}</button></div></section><section class="card"><div class="card-head"><h2>${L("Cronologia", "History")}</h2><div class="history-tools"><button id="export-history" class="button-link">CSV ↓</button><button id="clear-history" class="button-link">${L("Svuota", "Clear")}</button></div></div><div class="history" id="history"></div></section><section class="card"><div class="card-head"><h2>${L("Prova qualcosa di nuovo", "Try something new")}</h2></div><div class="examples">${[
    ["trig", "∠", L("Trigonometria", "Trigonometry"), "sin(30) + cos(60)"],
    [
      "complex",
      "i",
      L("Numeri complessi", "Complex numbers"),
      "(2 + 3i) × (1 − i)",
    ],
    [
      "integral",
      "∫",
      L("Calcolo integrale", "Integral calculus"),
      "∫ x² dx, 0 → 3",
    ],
    [
      "architect",
      "△",
      L("Pendenza di una rampa", "Ramp slope"),
      "atan(0.30 / 3.00)",
    ],
  ]
    .map(
      ([id, s, title, sub]) =>
        `<button class="example-card" data-demo="${id}"><span class="symbol">${s}</span><span><strong>${title}</strong><span class="muted mono">${sub}</span></span></button>`,
    )
    .join(
      "",
    )}</div></section>${notice(L("Le funzioni trigonometriche rispettano DEG / RAD / GRA. Usa il punto per i decimali e la virgola per separare gli argomenti.", "Trigonometric functions follow DEG / RAD / GRA. Use a decimal point and commas between arguments."))}</div></div>`;
}
function renderHistory() {
  $("#history").innerHTML = history.length
    ? history
        .map(
          (v, j) =>
            `<button class="history-item" data-history="${j}"><span class="formula mono">${esc(v.expr)} <span class="tiny">[${v.angle}]</span></span><span class="answer mono">${esc(v.text)}</span></button>`,
        )
        .join("")
    : `<div class="empty">${L("I tuoi calcoli compariranno qui. Tocca una riga per riutilizzarla.", "Your calculations will appear here. Tap a row to reuse it.")}</div>`;
  $$("[data-history]").forEach(
    (b) =>
      (b.onclick = () => {
        const v = history[Number(b.dataset.history)];
        angle = v.angle;
        $("#angle").value = angle;
        setExpr(v.expr);
        updateDisplayMode();
      }),
  );
}
function updateDisplayMode() {
  $("#display-mode").textContent = angle + " · " + format;
}
function setExpr(value) {
  expression = value;
  save("expression", expression);
  if ($("#expression")) {
    $("#expression").value = value;
    $("#expression").focus();
  }
  finished = false;
}
function insert(text) {
  const el = $("#expression");
  if (!el) return;
  let start = el.selectionStart,
    end = el.selectionEnd;
  if (finished) {
    if (["+", "-", "*", "/", "^", "!"].includes(text)) {
      el.value = "Ans";
      start = end = 3;
    } else {
      el.value = "";
      start = end = 0;
    }
    finished = false;
  }
  el.value = el.value.slice(0, start) + text + el.value.slice(end);
  el.focus();
  el.setSelectionRange(start + text.length, start + text.length);
  expression = el.value;
  save("expression", expression);
}
async function calculate() {
  expression = $("#expression").value;
  save("expression", expression);
  if (!expression.trim()) return;
  const exe = $('[data-key="execute"]');
  exe.disabled = true;
  const activeExpr = expression;
  try {
    const result = await request({
      task: "calculate",
      expr: expression,
      scope: { ...variables, Ans: ans, ans },
      format,
      digits: 6,
    });
    ans = result.value;
    variables = result.variables;
    lastResult = result;
    save("ans", ans);
    save("variables", variables);
    history.unshift({
      expr: activeExpr,
      text: result.text,
      angle,
      value: result.value,
    });
    history = history.slice(0, 80);
    save("history", history);
    if (mode === "calc") {
      $("#calc-result").classList.remove("error");
      $("#calc-result").textContent = result.text;
      $("#calc-detail").textContent =
        result.fraction && result.fraction !== result.text
          ? `${L("Frazione", "Fraction")}: ${result.fraction}`
          : L("Risultato numerico", "Numerical result");
      renderHistory();
      finished = true;
    }
  } catch (e) {
    if (mode === "calc") {
      $("#calc-result").classList.add("error");
      $("#calc-result").textContent = error(e);
      $("#calc-detail").textContent = L(
        "Controlla parentesi, nomi e dominio.",
        "Check parentheses, names and domain.",
      );
    }
  } finally {
    if (exe?.isConnected) exe.disabled = false;
  }
}

function graphUI() {
  let rows = "";
  for (let j = 1; j <= 3; j++)
    rows += `<div class="graph-entry"><div class="row between"><span style="color:${COLORS[j - 1]}">Y${j}</span>${select(
      "type" + j,
      "",
      [
        ["cartesian", "y = f(x)"],
        ["polar", "r = f(t)"],
        ["parametric", L("Parametrico", "Parametric")],
        ["above", "y ≥ f(x)"],
        ["below", "y ≤ f(x)"],
      ],
    )}</div>${field("f" + j, get("type" + j) === "parametric" ? "x(t)" : get("type" + j) === "polar" ? "r(t)" : "f(x)")}${get("type" + j) === "parametric" ? field("second" + j, "y(t)") : ""}</div>`;
  return `<div class="two-col">${card(L("Funzioni", "Functions"), rows + `<div class="fields">${field("min", L("Da x / t", "From x / t"), "number")}${field("max", L("A x / t", "To x / t"), "number")}${field("ymin", "y min", "number")}${field("ymax", "y max", "number")}</div><div class="parameter">${field("a", L("Parametro a (grafico dinamico)", "Parameter a (dynamic graph)"), "number")}<input id="dynamic-a" type="range" min="-5" max="5" step="0.1" value="${esc(get("a"))}" aria-label="Parameter a"></div><div class="row">${btn("run", L("Disegna", "Plot"))}${btn("animate", L("▶ Anima a", "▶ Animate a"), true)}</div>`)}<div class="stack">${card(
    L("Piano cartesiano", "Coordinate plane"),
    chart() +
      `<div class="canvas-actions">${btn("zoom-in", "＋", true)}${btn("zoom-out", "−", true)}${btn("auto-range", L("Adatta", "Fit"), true)}${btn("reset-view", L("Ripristina", "Reset"), true)}${btn("png", "PNG ↓", true)}</div><div id="legend" class="chart-caption"></div><div class="fields">${select(
        "analysis",
        L("Analizza Y1 (cartesiana)", "Analyze Y1 (Cartesian)"),
        [
          ["roots", L("Radici", "Roots")],
          ["extrema", L("Minimo e massimo", "Minimum & maximum")],
          ["integral", L("Integrale definito", "Definite integral")],
          ["derivative", L("Derivata e tangente", "Derivative & tangent")],
          ["intersections", L("Intersezioni Y1/Y2", "Y1/Y2 intersections")],
        ],
      )}${field("traceX", L("Punto x (derivata)", "Point x (derivative)"), "number")}</div>${btn("analyze", L("Analizza nell’intervallo", "Analyze interval"), true)}${output}`,
  )}${notice(L("Usa x per grafici cartesiani e t per polari/parametrici. Il parametro a si modifica con il cursore. Le analisi sono numeriche nell’intervallo indicato.", "Use x for Cartesian plots and t for polar/parametric plots. Adjust parameter a with the slider. Analysis is numerical within the specified interval."))}</div></div>`;
}
function surfaceUI() {
  return `<div class="two-col">${card(
    L("Oggetto 3D", "3D object"),
    `<div class="fields single">${select("type", L("Tipo", "Type"), [
      ["surface", "z = f(x,y)"],
      ["sphere", L("Sfera", "Sphere")],
      ["cylinder", L("Cilindro", "Cylinder")],
    ])}${get("type") === "surface" ? field("expr", "z(x,y)") : ""}${field("range", get("type") === "surface" ? L("Semilato del dominio", "Domain half-width") : L("Raggio / estensione", "Radius / extent"), "number")}</div>${btn("run", L("Disegna in 3D", "Plot in 3D"))}<p class="muted">${L("Trascina per ruotare. Usa la rotella per ingrandire. Gli angoli della formula rispettano l’impostazione del calcolo scientifico.", "Drag to rotate. Scroll to zoom. Formula angles follow the scientific calculator setting.")}</p>`,
  )}${card(L("Vista nello spazio", "Space view"), chart() + `<div class="canvas-actions">${btn("reset-view", L("Vista iniziale", "Reset view"), true)}${btn("png", "PNG ↓", true)}</div>${output}`)}</div>`;
}
function equationUI() {
  const type = get("type");
  return card(
    L("Risolutore", "Solver"),
    `<div class="fields">${select(
      "type",
      L("Modalità", "Mode"),
      [
        ["polynomial", L("Polinomio, grado 2–6", "Polynomial, degree 2–6")],
        ["system", L("Sistema lineare", "Linear system")],
        ["solve", L("Equazione numerica f(x)=0", "Numerical equation f(x)=0")],
      ],
      true,
    )}${type === "polynomial" ? field("coefficients", L("Coefficienti dal grado più alto al termine noto", "Coefficients, highest degree to constant"), "textarea", true) : type === "system" ? field("A", L("Matrice dei coefficienti", "Coefficient matrix"), "textarea") + field("b", L("Termini noti (separati da virgole)", "Constants (comma-separated)"), "textarea") : field("expr", "f(x)", "text", true) + field("min", L("Limite inferiore", "Lower bound"), "number") + field("max", L("Limite superiore", "Upper bound"), "number")}</div>${btn("run", L("Risolvi", "Solve"))}${output}<p class="muted">${L("Matrici: [2,1;1,-1]. Nelle equazioni numeriche porta tutto a sinistra. La ricerca può non trovare tutte le radici; i sistemi singolari restituiscono un errore.", "Matrices: [2,1;1,-1]. For numerical equations, move everything to the left. A numerical search may not find every root; singular systems return an error.")}</p>`,
  );
}
function matrixUI() {
  const type = get("type");
  return card(
    L("Algebra lineare", "Linear algebra"),
    `<div class="fields">${select(
      "type",
      L("Modalità", "Mode"),
      [
        ["matrix", L("Matrici", "Matrices")],
        ["vector", L("Vettori", "Vectors")],
      ],
      true,
    )}${
      type === "matrix"
        ? field("A", "A", "textarea") +
          field("B", "B", "textarea") +
          select("op", L("Operazione", "Operation"), [
            ["det", "det(A)"],
            ["inv", "A⁻¹"],
            ["transpose", "Aᵀ"],
            ["trace", "tr(A)"],
            ["add", "A + B"],
            ["subtract", "A − B"],
            ["multiply", "A × B"],
            ["power", "A^n"],
          ]) +
          field("power", "n", "number")
        : field("vA", "A", "textarea") +
          field("vB", "B", "textarea") +
          select(
            "vop",
            L("Operazione", "Operation"),
            [
              ["dot", L("Prodotto scalare", "Dot product")],
              ["cross", L("Prodotto vettoriale (3D)", "Cross product (3D)")],
              ["norm", L("Norma euclidea", "Euclidean norm")],
            ],
            true,
          )
    }</div>${btn("run", L("Calcola", "Calculate"))}${output}<p class="muted">${L("Matrici fino a 20 × 20. Usa virgole tra colonne e ; tra righe: [1,2;3,4]. Vettori: 1,2,3. B serve solo alle operazioni con due argomenti.", "Matrices up to 20 × 20. Commas separate columns and ; separates rows: [1,2;3,4]. Vectors: 1,2,3. B is used only for two-argument operations.")}</p>`,
  );
}
function statsUI() {
  const type = get("type");
  return `<div class="two-col">${card(
    L("Dati e analisi", "Data & analysis"),
    `<div class="fields single">${select("type", L("Modalità", "Mode"), [
      ["summary", L("Una variabile", "One variable")],
      ["regression", L("Regressione", "Regression")],
      [
        "inference",
        L("Test e intervallo di confidenza", "Test & confidence interval"),
      ],
    ])}${
      type === "regression"
        ? field("x", "X", "textarea") +
          field("y", "Y", "textarea") +
          select("regression", L("Modello", "Model"), [
            ["linear", L("Lineare", "Linear")],
            ["polynomial", L("Polinomiale", "Polynomial")],
            ["log", L("Logaritmico", "Logarithmic")],
            ["exp", L("Esponenziale", "Exponential")],
            ["power", L("Potenza", "Power")],
          ]) +
          (get("regression") === "polynomial"
            ? field("degree", L("Grado 1–4", "Degree 1–4"), "number")
            : "")
        : field(
            "data",
            L(
              "Dati, separati da virgole o spazi",
              "Data, separated by commas or spaces",
            ),
            "textarea",
          )
    }${
      type === "inference"
        ? select("test", L("Test della media", "Mean test"), [
            ["t", L("t, σ sconosciuta", "t, unknown σ")],
            ["z", L("Z, σ nota", "Z, known σ")],
          ]) +
          field("mu", "μ₀", "number") +
          (get("test") === "z" ? field("sd", "σ", "number") : "") +
          field("level", L("Confidenza (0–1)", "Confidence (0–1)"), "number")
        : ""
    }</div>${btn("run", L("Analizza dati", "Analyze data"))}`,
  )}${card(L("Risultati", "Results"), chart() + output)}</div>`;
}
function distributionUI() {
  const type = get("type");
  return `<div class="two-col">${card(
    L("Distribuzione", "Distribution"),
    `<div class="fields">${select(
      "type",
      L("Famiglia", "Family"),
      [
        ["normal", L("Normale", "Normal")],
        ["binomial", L("Binomiale", "Binomial")],
        ["poisson", "Poisson"],
        ["geometric", L("Geometrica", "Geometric")],
        ["t", "Student t"],
        ["chi2", "χ²"],
        ["f", "F"],
      ],
      true,
    )}${select("op", L("Operazione", "Operation"), [["pdf", L("Densità / probabilità puntuale", "Density / point probability")], ["cdf", "P(X ≤ x)"], ...(type === "geometric" ? [] : [["range", L("Probabilità nell’intervallo", "Interval probability")]]), ...(["normal", "t", "chi2", "f"].includes(type) ? [["inv", L("Inversa: quantile", "Inverse: quantile")]] : [])], true)}${field("x", get("op") === "inv" ? "p" : "x", "number")}${get("op") === "range" ? field("upper", L("Limite superiore", "Upper bound"), "number") : ""}${type === "normal" ? field("mu", "μ", "number") + field("sd", "σ", "number") : type === "binomial" ? field("n", "n", "number") + field("p", "p", "number") : type === "poisson" ? field("lambda", "λ", "number") : type === "geometric" ? field("p", "p", "number") : field("df", type === "f" ? "df₁" : "df", "number") + (type === "f" ? field("df2", "df₂", "number") : "")}</div>${btn("run", L("Calcola probabilità", "Calculate probability"))}${output}`,
  )}${card(L("Come leggere il risultato", "Reading the result"), notice(L("CDF: probabilità fino a x. PDF: densità per variabili continue, probabilità puntuale per discrete. Inversa: il valore x corrispondente alla probabilità p. Per le discrete, l’intervallo include entrambi gli estremi.", "CDF: probability up to x. PDF: density for continuous variables, point probability for discrete variables. Inverse: the x value for probability p. Discrete intervals include both endpoints.")) + `<div class="tutorial-step" style="margin-top:25px"><strong>${L("Esempio: la normale standard", "Example: the standard normal")}</strong><p>μ = 0, σ = 1, x = 1.96</p><p>P(X ≤ 1.96) ≈ 0.975002</p></div><p class="muted">${L("Distribuzione geometrica: X conta le prove fino al primo successo e inizia da 1.", "Geometric distribution: X counts trials until the first success, starting at 1.")}</p>`)}</div>`;
}
function financeUI() {
  const type = get("type");
  let f = "";
  if (["tvm", "amortization"].includes(type))
    f =
      field("pv", L("Capitale / PV", "Principal / PV"), "number") +
      field(
        "rate",
        L("Tasso annuo nominale %", "Nominal annual rate %"),
        "number",
      ) +
      field("n", L("Numero di periodi", "Number of periods"), "number") +
      field("frequency", L("Periodi per anno", "Periods per year"), "number") +
      (type === "tvm"
        ? field("fv", L("Valore futuro FV", "Future value FV"), "number") +
          field(
            "pmt",
            L(
              "Rata PMT (per calcolare FV)",
              "Payment PMT (for calculating FV)",
            ),
            "number",
          ) +
          select(
            "begin",
            L("Pagamento", "Payment timing"),
            [
              ["end", L("Fine periodo", "End of period")],
              ["begin", L("Inizio periodo", "Beginning of period")],
            ],
            true,
          )
        : "");
  else if (type === "simple")
    f =
      field("pv", L("Capitale", "Principal"), "number") +
      field("rate", L("Tasso annuo %", "Annual rate %"), "number") +
      field("days", L("Giorni", "Days"), "number") +
      field(
        "basis",
        L("Base annua: 360 o 365", "Year basis: 360 or 365"),
        "number",
      );
  else if (type === "cash")
    f =
      field(
        "cash",
        L(
          "Flussi: t=0,1,2… (periodi uguali)",
          "Cash flows: t=0,1,2… (equal periods)",
        ),
        "textarea",
        true,
      ) +
      field("rate", L("Tasso per periodo %", "Rate per period %"), "number");
  else if (type === "rates")
    f =
      field("rate", L("Tasso input %", "Input rate %"), "number") +
      field(
        "frequency",
        L("Capitalizzazioni annue", "Compounding periods per year"),
        "number",
      );
  else if (type === "margin")
    f =
      field("cost", L("Costo", "Cost"), "number") +
      field("price", L("Prezzo di vendita", "Selling price"), "number");
  else if (type === "days")
    f =
      field("start", L("Data iniziale", "Start date"), "date") +
      field("end", L("Data finale", "End date"), "date");
  else
    f =
      field("cost", L("Costo iniziale", "Initial cost"), "number") +
      field("salvage", L("Valore residuo", "Salvage value"), "number") +
      field("life", L("Vita utile (anni)", "Useful life (years)"), "number");
  return card(
    L("Calcolo finanziario", "Financial calculation"),
    `<div class="fields">${select(
      "type",
      L("Strumento", "Tool"),
      [
        [
          "tvm",
          L("Interesse composto: PMT e FV", "Compound interest: PMT & FV"),
        ],
        ["amortization", L("Piano di ammortamento", "Amortization schedule")],
        ["simple", L("Interesse semplice", "Simple interest")],
        ["cash", L("Flussi di cassa: NPV e IRR", "Cash flow: NPV & IRR")],
        ["rates", L("Tassi nominale / effettivo", "Nominal / effective rates")],
        ["margin", L("Costo, prezzo e margine", "Cost, price & margin")],
        ["days", L("Giorni tra due date", "Days between dates")],
        [
          "depreciation",
          L("Ammortamento lineare del bene", "Straight-line depreciation"),
        ],
      ],
      true,
    )}${f}</div>${btn("run", L("Calcola", "Calculate"))} ${btn("export-finance", "CSV ↓", true)}${output}<p class="muted">${L("TVM: flussi entranti positivi, uscenti negativi. NPV include il flusso t=0. IRR: ricerca numerica tra −90% e 1000%, può restituire più tassi o non trovarne. I piani non includono spese e imposte.", "TVM: inflows positive, outflows negative. NPV includes t=0. IRR: numerical search from −90% to 1000%; multiple rates or none may be returned. Schedules exclude fees and taxes.")}</p>`,
  );
}
function tableUI() {
  return `<div class="two-col">${card(L("Imposta tabella", "Set up table"), `<div class="fields single">${field("f1", "Y1 = f(x)")}${field("f2", "Y2 = g(x)")}${field("start", L("Inizio", "Start"), "number")}${field("end", L("Fine", "End"), "number")}${field("step", L("Passo", "Step"), "number")}</div><div class="row">${btn("run", L("Genera", "Generate"))}${btn("export-table", "CSV ↓", true)}</div><p class="muted">${L("Massimo 2001 righe. I punti fuori dominio sono indicati come n/d.", "Maximum 2001 rows. Points outside the domain are marked n/a.")}</p>`)}${card(L("Tabella e grafico", "Table & graph"), chart() + output)}</div>`;
}
function recursionUI() {
  return `<div class="two-col">${card(L("Regola ricorsiva", "Recursion rule"), `<div class="fields single">${field("expr", "a(n+1) = f(n,a,b)")}${field("second", L("b(n+1), facoltativa", "b(n+1), optional"))}${field("a0", "a(0)", "number")}${field("b0", "b(0)", "number")}${field("count", L("Numero di passi (1–1000)", "Number of steps (1–1000)"), "number")}</div><div class="row">${btn("run", L("Genera", "Generate"))}${btn("export-table", "CSV ↓", true)}</div><p class="muted">${L("a e b rappresentano i valori al passo precedente. Le due formule vengono aggiornate simultaneamente.", "a and b are the previous-step values. Both formulas update simultaneously.")}</p>`)}${card(L("Successione", "Sequence"), chart() + output)}</div>`;
}
function conicUI() {
  return `<div class="two-col">${card(
    L("Parametri", "Parameters"),
    `<div class="fields">${select(
      "type",
      L("Conica", "Conic"),
      [
        ["ellipse", L("Ellisse", "Ellipse")],
        ["circle", L("Cerchio", "Circle")],
        ["parabola", L("Parabola", "Parabola")],
        ["hyperbola", L("Iperbole", "Hyperbola")],
      ],
      true,
    )}${field("a", get("type") === "circle" ? "r" : "a", "number")}${get("type") === "circle" ? "" : field("b", "b", "number")}${field("h", "h", "number")}${field("k", "k", "number")}</div>${btn("run", L("Disegna", "Plot"))}<p id="conic-formula" class="mono muted"></p>`,
  )}${card(L("Grafico della conica", "Conic graph"), chart() + output)}</div>`;
}
function geometryUI() {
  return `<div class="two-col">${card(L("Coordinate", "Coordinates"), `<div class="fields single">${field("points", L("Punti in ordine: x,y; x,y; …", "Ordered points: x,y; x,y; …"), "textarea")}</div>${btn("run", L("Disegna e misura", "Draw & measure"))}<p class="muted">${L("Due punti: segmento. Da tre punti: poligono chiuso. Trascina i vertici per modificarli. Area e perimetro sono calcolati nell’unità delle coordinate.", "Two points: segment. Three or more: closed polygon. Drag vertices to edit them. Area and perimeter use your coordinate units.")}</p>`)}${card(L("Disegno e misure", "Drawing & measurements"), chart() + output)}</div>`;
}
const unitOptions = {
  length: ["mm", "cm", "m", "km", "inch", "ft", "yd", "mile"],
  area: ["mm^2", "cm^2", "m^2", "km^2", "ha", "ft^2"],
  volume: ["ml", "l", "m^3", "gallon"],
  mass: ["mg", "g", "kg", "lb", "oz"],
  time: ["s", "minute", "hour", "day"],
  speed: ["m/s", "km/h", "mph"],
  temperature: ["degC", "degF", "K"],
  angle: ["deg", "rad", "grad"],
  pressure: ["Pa", "kPa", "bar", "atm", "psi"],
  energy: ["J", "kJ", "Wh", "kWh"],
  power: ["W", "kW", "hp"],
};
function unitsUI() {
  return card(
    L("Conversioni", "Conversions"),
    `<div class="fields">${select(
      "type",
      L("Modalità", "Mode"),
      [
        ["units", L("Unità di misura", "Measurement units")],
        ["base", L("Basi numeriche", "Number bases")],
      ],
      true,
    )}${
      get("type") === "base"
        ? field(
            "baseValue",
            L("Numero intero (massimo 53 bit)", "Integer (maximum 53 bits)"),
            "text",
            true,
          ) +
          select("fromBase", L("Da base", "From base"), [
            [2, "BIN · 2"],
            [8, "OCT · 8"],
            [10, "DEC · 10"],
            [16, "HEX · 16"],
          ]) +
          select("toBase", L("A base", "To base"), [
            [2, "BIN · 2"],
            [8, "OCT · 8"],
            [10, "DEC · 10"],
            [16, "HEX · 16"],
          ])
        : select(
            "category",
            L("Grandezza", "Quantity"),
            Object.keys(unitOptions).map((v, j) => [
              v,
              [
                L("Lunghezza", "Length"),
                L("Area", "Area"),
                L("Volume", "Volume"),
                L("Massa", "Mass"),
                L("Tempo", "Time"),
                L("Velocità", "Speed"),
                L("Temperatura", "Temperature"),
                L("Angolo", "Angle"),
                L("Pressione", "Pressure"),
                L("Energia", "Energy"),
                L("Potenza", "Power"),
              ][j],
            ]),
            true,
          ) +
          field("value", L("Valore", "Value"), "number", true) +
          select(
            "from",
            L("Da", "From"),
            unitOptions[get("category")].map((v) => [v, v]),
          ) +
          select(
            "to",
            L("A", "To"),
            unitOptions[get("category")].map((v) => [v, v]),
          )
    }</div>${btn("run", L("Converti", "Convert"))}${output}<p class="muted">${L("gallon = gallone USA. Per le basi negative si usa il segno meno, senza complemento a due. Operazioni bitwise disponibili nel catalogo scientifico.", "gallon = US gallon. Negative base numbers use a minus sign, without two’s complement. Bitwise operations are in the scientific catalog.")}</p>`,
  );
}
function initialCells() {
  const c = Array.from({ length: 12 }, () => Array(5).fill(""));
  c[0] = ["1", "2", "=A1+B1", "", ""];
  c[1] = ["3", "4", "=A2*B2", "", ""];
  c[2][2] = "=sum(C1:C2)";
  return c;
}
function sheetUI() {
  let cells = load("sheet", initialCells());
  if (!Array.isArray(cells) || cells.length !== 12) cells = initialCells();
  return card(
    L("Foglio A1:E12", "Sheet A1:E12"),
    `<div class="row between"><p class="muted">${L("Formule con =, riferimenti A1 e intervalli A1:A5. Esempio: =sum(A1:A5).", "Formulas start with =; use A1 references and A1:A5 ranges. Example: =sum(A1:A5).")}</p><div class="row">${btn("run", L("Ricalcola", "Recalculate"))}${btn("export-sheet", "CSV ↓", true)}${btn("reset-sheet", L("Svuota", "Clear"), true)}</div></div><div class="table-scroll"><table class="data-table sheet"><thead><tr><th></th>${"ABCDE"
      .split("")
      .map((v) => `<th>${v}</th>`)
      .join(
        "",
      )}</tr></thead><tbody>${cells.map((r, i) => `<tr><th>${i + 1}</th>${r.map((v, j) => `<td><input class="sheet-input" data-cell="${i},${j}" value="${esc(v)}" aria-label="${String.fromCharCode(65 + j)}${i + 1}" autocomplete="off"><div class="sheet-result" data-cell-result="${i},${j}"></div></td>`).join("")}</tr>`).join("")}</tbody></table></div>${output}`,
  );
}
function simulationUI() {
  return `<div class="two-col">${card(
    L("Esperimento", "Experiment"),
    `<div class="fields single">${select("type", L("Oggetto", "Object"), [
      ["dice", L("Dado a 6 facce", "6-sided die")],
      ["coin", L("Moneta equa", "Fair coin")],
    ])}${field("trials", L("Numero di lanci (1–100000)", "Number of trials (1–100000)"), "number")}</div>${btn("run", L("Lancia", "Simulate"))}<p class="muted">${L("Generatore pseudocasuale del browser. Ogni esecuzione produce un esperimento nuovo.", "Browser pseudorandom generator. Each run produces a new experiment.")}</p>`,
  )}${card(L("Frequenze osservate", "Observed frequencies"), chart() + output)}</div>`;
}
function pythonUI() {
  return card(
    L("Editor Python", "Python editor"),
    notice(
      L(
        "Python CPython via Pyodide, caricato da jsDelivr al primo avvio (serve internet). Non è il MicroPython Casio: casioplot, input interattivo e file .g3m non sono supportati. Usa print() per i risultati.",
        "CPython via Pyodide, loaded from jsDelivr on first run (internet required). This is not Casio MicroPython: casioplot, interactive input and .g3m files are unsupported. Use print() for results.",
      ),
    ) +
      `<label class="field" style="margin-top:18px"><span>${L("Codice", "Code")}</span><textarea id="python-code" class="code-editor" data-field="code" spellcheck="false">${esc(get("code"))}</textarea></label><div class="row controls-bottom">${btn("run", L("▶ Esegui", "▶ Run"))}${btn("stop-python", L("■ Interrompi", "■ Stop"), true)}${btn("export-python", ".py ↓", true)}<label class="button secondary">${L("Apri .py", "Open .py")}<input type="file" id="import-python" accept=".py" hidden></label><span id="py-status" class="py-status"></span></div><pre id="py-output" class="code-output" aria-live="polite">${L("Il risultato apparirà qui.", "Output will appear here.")}</pre>`,
  );
}
function notesUI() {
  return card(
    L("Il tuo quaderno", "Your notebook"),
    `<label class="field"><span>${L("Testo semplice, salvato automaticamente su questo browser.", "Plain text, saved automatically in this browser.")}</span><textarea class="text-area" data-field="text">${esc(get("text"))}</textarea></label><div class="row controls-bottom">${btn("export-notes", L("Esporta .txt", "Export .txt"))}${btn("print-notes", L("Stampa", "Print"), true)}</div><p class="muted">${L("Il quaderno non interpreta codice e non è compatibile con eActivity Casio.", "The notebook does not execute code and is not compatible with Casio eActivity.")}</p>`,
  );
}

let lastTable = null,
  lastFinance = null,
  sheetValues = null;
function bind(selector, fn) {
  const b = $(selector);
  if (b)
    b.onclick = () =>
      Promise.resolve()
        .then(fn)
        .catch((e) => {
          if ($("#output"))
            $("#output").innerHTML =
              `<div class="error-box">${esc(error(e))}</div>`;
          else toast(error(e));
        });
}
function drawCurrent() {
  if (!chartState || !$("#chart")) return;
  const c = $("#chart");
  if (chartState.kind === "surface")
    surface(c, chartState.lines, chartState.range, chartState.rotation);
  else if (chartState.kind === "bars")
    bars(c, chartState.values, chartState.labels);
  else plot(c, chartState.curves, { range: chartState.range });
}
function setPlot(curves, range, interactive = true, onRange) {
  const c = $("#chart");
  if (!c) return;
  chartState = { kind: "plot", curves, range: range || autoRange(curves) };
  if (interactive)
    interactivePlot(c, curves, chartState.range, (r) => {
      chartState.range = r;
      onRange?.(r);
    });
  else plot(c, curves, { range: chartState.range });
}
async function drawGraph() {
  const version = ++graphVersion,
    active = mode;
  const min = num("min"),
    max = num("max"),
    ymin = num("ymin"),
    ymax = num("ymax");
  if (min >= max || ymin >= ymax)
    throw Error(
      L(
        "Imposta min < max su entrambi gli assi.",
        "Set min < max for both axes.",
      ),
    );
  const rows = [1, 2, 3].map((j) => ({
    expr: get("f" + j),
    type: get("type" + j),
    second: get("second" + j),
  }));
  const curves = await run(
    { task: "graph", rows, min, max, a: num("a") },
    () => {},
  );
  if (!curves || mode !== active || version !== graphVersion) return;
  const range = { xmin: min, xmax: max, ymin, ymax };
  setPlot(curves, range, true, (r) => {
    for (const [k, v] of Object.entries({
      min: r.xmin,
      max: r.xmax,
      ymin: r.ymin,
      ymax: r.ymax,
    })) {
      set(k, Number(v.toPrecision(8)));
      const el = $(`[data-field="${k}"]`);
      if (el) el.value = get(k);
    }
    clearTimeout(graphTimer);
    graphTimer = setTimeout(
      () => drawGraph().catch((e) => toast(error(e))),
      100,
    );
  });
  $("#legend").innerHTML = curves
    .map(
      (c, j) =>
        `<span><i class="swatch" style="background:${COLORS[j]}"></i>${esc(c.expr)}</span>`,
    )
    .join("");
}
async function drawSurface() {
  const lines = await run(
    {
      task: "graph3d",
      type: get("type"),
      expr: get("expr"),
      range: num("range"),
    },
    () => {},
  );
  if (!lines || mode !== "graph3d") return;
  const canvas = $("#chart");
  chartState = {
    kind: "surface",
    lines,
    range: num("range"),
    rotation: { x: 0.55, z: 0.65 },
  };
  drawCurrent();
  let drag = null;
  canvas.onpointerdown = (e) => {
    drag = { x: e.clientX, y: e.clientY, rotation: { ...chartState.rotation } };
    canvas.setPointerCapture(e.pointerId);
  };
  canvas.onpointermove = (e) => {
    if (!drag) return;
    chartState.rotation = {
      x: Math.max(
        -1.5,
        Math.min(1.5, drag.rotation.x + (e.clientY - drag.y) * 0.01),
      ),
      z: drag.rotation.z + (e.clientX - drag.x) * 0.01,
    };
    drawCurrent();
  };
  canvas.onpointerup = canvas.onpointercancel = () => (drag = null);
  canvas.onwheel = (e) => {
    e.preventDefault();
    chartState.range = Math.max(
      0.001,
      Math.min(100000, chartState.range * (e.deltaY > 0 ? 1.15 : 0.85)),
    );
    drawCurrent();
  };
}
function wire() {
  bind("#png", () => {
    const c = $("#chart");
    if (!chartState)
      throw Error(L("Disegna prima un grafico.", "Draw a graph first."));
    c.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "cg50-" + mode + ".png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  });
  if (mode === "calc") {
    renderHistory();
    const previewPoints = Array.from({ length: 301 }, (_, j) => {
      const x = -4 + (8 * j) / 300;
      return [x, x * x - 4];
    });
    interactivePlot($("#preview"), [{ points: previewPoints }], {
      xmin: -4,
      xmax: 4,
      ymin: -5,
      ymax: 8,
    });
    $("#expression").oninput = () => {
      expression = $("#expression").value;
      save("expression", expression);
      finished = false;
    };
    $("#expression").onkeydown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        calculate();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setExpr("");
        $("#calc-result").textContent = "0";
        lastResult = null;
      }
    };
    $("#angle").onchange = (e) => {
      angle = e.target.value;
      save("angle", angle);
      updateDisplayMode();
    };
    $("#format").onchange = (e) => {
      format = e.target.value;
      save("format", format);
      updateDisplayMode();
      if (expression) calculate();
    };
    $$("[data-key]").forEach(
      (b) =>
        (b.onclick = () => {
          const key = b.dataset.key,
            el = $("#expression");
          if (key === "shift") {
            shift = !shift;
            b.classList.toggle("active", shift);
            b.setAttribute("aria-pressed", shift);
            return;
          }
          if (key === "execute") {
            calculate();
            return;
          }
          if (key === "catalog") {
            $("#catalog-panel").hidden = !$("#catalog-panel").hidden;
            return;
          }
          if (key === "clear") {
            setExpr("");
            $("#calc-result").textContent = "0";
            $("#calc-result").classList.remove("error");
            lastResult = null;
            return;
          }
          if (key === "left" || key === "right") {
            el.focus();
            const pos = Math.max(
              0,
              Math.min(
                el.value.length,
                el.selectionStart + (key === "left" ? -1 : 1),
              ),
            );
            el.setSelectionRange(pos, pos);
            finished = false;
            return;
          }
          if (key === "delete") {
            finished = false;
            const start = el.selectionStart,
              end = el.selectionEnd;
            el.value =
              el.value.slice(
                0,
                start === end ? Math.max(0, start - 1) : start,
              ) + el.value.slice(end);
            el.focus();
            el.setSelectionRange(
              Math.max(0, start - 1),
              Math.max(0, start - 1),
            );
            expression = el.value;
            save("expression", expression);
            return;
          }
          insert(shift && b.dataset.alt ? b.dataset.alt : key);
          if (shift) {
            shift = false;
            $('[data-key="shift"]').classList.remove("active");
          }
        }),
    );
    $$("[data-insert]").forEach(
      (b) => (b.onclick = () => insert(b.dataset.insert)),
    );
    $$("[data-demo]").forEach(
      (b) => (b.onclick = () => loadExample(b.dataset.demo)),
    );
    bind("#fraction-toggle", () => {
      if (!lastResult?.fraction) {
        toast(
          L(
            "La frazione è disponibile per risultati reali finiti.",
            "Fractions are available for finite real results.",
          ),
        );
        return;
      }
      const el = $("#calc-result");
      el.textContent =
        el.textContent === lastResult.text
          ? lastResult.fraction
          : lastResult.text;
    });
    bind("#store-A", async () => {
      const result = await request({
        task: "calculate",
        expr: "A=Ans",
        scope: { ...variables, Ans: ans },
      });
      variables = result.variables;
      save("variables", variables);
      toast(L("Risultato memorizzato in A", "Result stored in A"));
    });
    bind("#copy-result", async () => {
      if (!lastResult) return;
      await navigator.clipboard.writeText($("#calc-result").textContent);
      toast(L("Risultato copiato", "Result copied"));
    });
    bind("#clear-history", () => {
      history = [];
      save("history", history);
      renderHistory();
    });
    bind("#export-history", () =>
      download(
        "cg50-history.csv",
        csv([
          [
            L("Espressione", "Expression"),
            L("Risultato", "Result"),
            L("Angolo", "Angle"),
          ],
          ...history.map((r) => [r.expr, r.text, r.angle]),
        ]),
        "text/csv",
      ),
    );
  } else if (mode === "graph") {
    bind("#run", drawGraph);
    drawGraph().catch((e) => toast(error(e)));
    $("#dynamic-a").oninput = (e) => {
      set("a", e.target.value);
      $('[data-field="a"]').value = e.target.value;
      clearTimeout(graphTimer);
      graphTimer = setTimeout(
        () => drawGraph().catch((e) => toast(error(e))),
        100,
      );
    };
    bind("#animate", () => {
      if (animation) {
        clearInterval(animation);
        animation = null;
        $("#animate").textContent = L("▶ Anima a", "▶ Animate a");
        return;
      }
      let v = -5;
      $("#animate").textContent = L("■ Ferma", "■ Stop");
      animation = setInterval(() => {
        if (mode !== "graph") {
          clearInterval(animation);
          return;
        }
        v += 0.2;
        if (v > 5) v = -5;
        set("a", v.toFixed(1));
        $('[data-field="a"]').value = get("a");
        $("#dynamic-a").value = get("a");
        drawGraph().catch((e) => toast(error(e)));
      }, 350);
    });
    bind("#analyze", async () => {
      if (get("type1") !== "cartesian")
        throw Error(
          L(
            "L’analisi richiede Y1 cartesiana.",
            "Analysis requires Cartesian Y1.",
          ),
        );
      const op = get("analysis") || "roots",
        result = await run({
          task: "analyze",
          op,
          expr: get("f1"),
          second: get("f2"),
          min: num("min"),
          max: num("max"),
          a: num("a"),
          x: Number(get("traceX") || 0),
        });
      if (result && op === "derivative" && chartState) {
        const tangent = {
          expr: "tangent",
          points: [
            [num("min"), result.y + result.slope * (num("min") - result.x)],
            [num("max"), result.y + result.slope * (num("max") - result.x)],
          ],
          color: COLORS[3],
        };
        setPlot(
          [...chartState.curves.filter((c) => c.expr !== "tangent"), tangent],
          chartState.range,
        );
      }
    });
    for (const [sel, factor] of [
      ["#zoom-in", 0.7],
      ["#zoom-out", 1.4],
    ])
      bind(sel, () => {
        const min = num("min"),
          max = num("max"),
          yl = num("ymin"),
          yh = num("ymax"),
          cx = (min + max) / 2,
          cy = (yl + yh) / 2;
        set("min", cx + (min - cx) * factor);
        set("max", cx + (max - cx) * factor);
        set("ymin", cy + (yl - cy) * factor);
        set("ymax", cy + (yh - cy) * factor);
        render();
      });
    bind("#auto-range", () => {
      if (!chartState) return;
      const r = autoRange(chartState.curves);
      set("min", r.xmin);
      set("max", r.xmax);
      set("ymin", r.ymin);
      set("ymax", r.ymax);
      render();
    });
    bind("#reset-view", () => {
      for (const k of ["min", "max", "ymin", "ymax"]) set(k, defaults.graph[k]);
      render();
    });
  } else if (mode === "graph3d") {
    bind("#run", drawSurface);
    drawSurface();
    bind("#reset-view", () => {
      if (chartState) {
        chartState.rotation = { x: 0.55, z: 0.65 };
        chartState.range = num("range");
        drawCurrent();
      }
    });
  } else if (mode === "equations")
    bind("#run", () =>
      get("type") === "polynomial"
        ? run({ task: "polynomial", coefficients: get("coefficients") })
        : get("type") === "system"
          ? run({ task: "system", A: get("A"), b: get("b") })
          : run({
              task: "analyze",
              op: "roots",
              expr: get("expr"),
              min: num("min"),
              max: num("max"),
            }),
    );
  else if (mode === "matrix")
    bind("#run", () =>
      get("type") === "matrix"
        ? run({
            task: "matrix",
            A: get("A"),
            B: get("B"),
            op: get("op"),
            power: get("op") === "power" ? num("power") : 0,
          })
        : run({ task: "vector", A: get("vA"), B: get("vB"), op: get("vop") }),
    );
  else if (mode === "stats")
    bind("#run", async () => {
      const type = get("type");
      if (type === "regression") {
        await run(
          {
            task: "regression",
            x: get("x"),
            y: get("y"),
            type: get("regression"),
            degree: get("regression") === "polynomial" ? num("degree") : 1,
          },
          async (result) => {
            renderOutput(result);
            const pairs = result.x.map((x, j) => [x, result.y[j]]),
              scatter = { points: pairs, dots: true, width: 0 };
            const min = Math.min(...result.x),
              max = Math.max(...result.x);
            const curves = await request({
              task: "graph",
              angle: "RAD",
              rows: [{ expr: result.equation }],
              min,
              max,
            });
            setPlot([scatter, { ...curves[0], color: COLORS[1] }]);
          },
        );
      } else if (type === "inference")
        await run({
          task: "inference",
          data: get("data"),
          mu: num("mu"),
          sd: get("test") === "z" ? num("sd") : 1,
          level: num("level"),
          type: get("test"),
        });
      else
        await run({ task: "stats", data: get("data") }, (result) => {
          renderOutput(result);
          const values = get("data")
              .trim()
              .split(/[\s,;]+/)
              .filter(Boolean)
              .map(Number),
            lo = Math.min(...values),
            hi = Math.max(...values),
            nb = Math.min(12, Math.max(3, Math.ceil(Math.sqrt(values.length)))),
            counts = Array(nb).fill(0);
          for (const v of values)
            counts[
              Math.min(nb - 1, Math.floor(((v - lo) / (hi - lo || 1)) * nb))
            ]++;
          const labels = counts.map((_, j) =>
            Number((lo + ((hi - lo) * j) / nb).toPrecision(3)),
          );
          chartState = { kind: "bars", values: counts, labels };
          drawCurrent();
        });
    });
  else if (mode === "distribution")
    bind("#run", () => {
      const payload = {
        task: "distribution",
        type: get("type"),
        op: get("op"),
        x: num("x"),
      };
      for (const k of {
        normal: ["mu", "sd"],
        binomial: ["n", "p"],
        poisson: ["lambda"],
        geometric: ["p"],
        t: ["df"],
        chi2: ["df"],
        f: ["df", "df2"],
      }[get("type")])
        payload[k] = num(k);
      if (get("op") === "range") payload.upper = num("upper");
      return run(payload);
    });
  else if (mode === "finance") {
    bind("#run", async () => {
      const payload = {
        task: "finance",
        type: get("type"),
        cash: get("cash"),
        start: get("start"),
        end: get("end"),
        begin: get("begin") === "begin",
      };
      for (const k of {
        tvm: ["pv", "fv", "pmt", "n", "rate", "frequency"],
        amortization: ["pv", "n", "rate", "frequency"],
        simple: ["pv", "rate", "days", "basis"],
        cash: ["rate"],
        rates: ["rate", "frequency"],
        margin: ["cost", "price"],
        days: [],
        depreciation: ["cost", "salvage", "life"],
      }[get("type")])
        payload[k] = num(k);
      lastFinance = await run(payload);
    });
    bind("#export-finance", () => {
      if (!lastFinance)
        throw Error(
          L("Calcola prima il risultato.", "Calculate a result first."),
        );
      download(
        "cg50-finance.csv",
        csv(
          lastFinance.schedule
            ? [
                [...Object.keys(lastFinance.schedule[0])],
                ...lastFinance.schedule.map((v) => Object.values(v)),
              ]
            : Object.entries(lastFinance),
        ),
        "text/csv",
      );
    });
  } else if (mode === "table" || mode === "recursion") {
    bind("#run", async () => {
      const isTable = mode === "table",
        headers = isTable
          ? [
              "x",
              ...["f1", "f2"].filter((k) => get(k).trim()).map((k) => get(k)),
            ]
          : ["n", "a(n)", ...(get("second").trim() ? ["b(n)"] : [])];
      const payload = isTable
        ? {
            task: "table",
            expressions: [get("f1"), get("f2")],
            start: num("start"),
            end: num("end"),
            step: num("step"),
          }
        : {
            task: "recursion",
            expr: get("expr"),
            second: get("second"),
            a0: num("a0"),
            b0: num("b0"),
            count: num("count"),
          };
      await run(payload, (rows) => {
        lastTable = { rows, headers };
        $("#output").innerHTML = tableHTML(rows, headers);
        setPlot(
          headers
            .slice(1)
            .map((_, j) => ({
              points: rows.map((r) =>
                r[j + 1] === null ? null : [r[0], r[j + 1]],
              ),
              dots: !isTable,
            })),
        );
      });
    });
    bind("#export-table", () => {
      if (!lastTable)
        throw Error(L("Genera prima una tabella.", "Generate a table first."));
      download(
        "cg50-" + mode + ".csv",
        csv([lastTable.headers, ...lastTable.rows]),
        "text/csv",
      );
    });
  } else if (mode === "conic") {
    bind("#run", drawConic);
    drawConic().catch((e) => toast(error(e)));
  } else if (mode === "geometry") {
    bind("#run", drawGeometry);
    drawGeometry().catch((e) => toast(error(e)));
  } else if (mode === "units") {
    bind("#run", () =>
      get("type") === "base"
        ? run({
            task: "base",
            value: get("baseValue"),
            from: Number(get("fromBase")),
            to: Number(get("toBase")),
          })
        : run({
            task: "units",
            value: num("value"),
            from: get("from"),
            to: get("to"),
          }),
    );
    const el = $('[data-field="category"]');
    if (el)
      el.onchange = () => {
        set("category", el.value);
        set("from", unitOptions[el.value][0]);
        set("to", unitOptions[el.value][1]);
        render();
      };
  } else if (mode === "sheet") {
    $$("[data-cell]").forEach(
      (el) =>
        (el.oninput = () => {
          save("sheet", readSheet());
          $$("[data-cell-result]").forEach((v) => (v.textContent = ""));
          sheetValues = null;
        }),
    );
    bind("#run", async () => {
      await run({ task: "spreadsheet", cells: readSheet() }, (v) => {
        sheetValues = v;
        $$("[data-cell-result]").forEach((el) => {
          const [i, j] = el.dataset.cellResult.split(",").map(Number);
          el.textContent = nice(v[i][j]);
        });
        $("#output").innerHTML = notice(
          L(
            "Foglio ricalcolato. I risultati sono visualizzati sotto i valori o le formule.",
            "Sheet recalculated. Results appear below the values or formulas.",
          ),
        );
      });
    });
    bind("#reset-sheet", () => {
      save(
        "sheet",
        Array.from({ length: 12 }, () => Array(5).fill("")),
      );
      sheetValues = null;
      render();
    });
    bind("#export-sheet", () =>
      download("cg50-sheet.csv", csv(sheetValues || readSheet()), "text/csv"),
    );
  } else if (mode === "simulation")
    bind("#run", () =>
      run(
        { task: "simulation", type: get("type"), trials: num("trials") },
        (result) => {
          const labels =
            get("type") === "coin"
              ? [L("Testa", "Heads"), L("Croce", "Tails")]
              : [1, 2, 3, 4, 5, 6];
          $("#output").innerHTML = tableHTML(
            result.counts.map((v, j) => [labels[j], v, result.frequencies[j]]),
            [
              L("Esito", "Outcome"),
              L("Conteggio", "Count"),
              L("Frequenza", "Frequency"),
            ],
          );
          chartState = { kind: "bars", values: result.counts, labels };
          drawCurrent();
        },
      ),
    );
  else if (mode === "python") {
    bind("#run", runPython);
    bind("#stop-python", () =>
      stopPython(L("Esecuzione interrotta.", "Execution stopped.")),
    );
    bind("#export-python", () =>
      download("cg50-program.py", $("#python-code").value),
    );
    $("#import-python").onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 100000) {
        toast(L("Limite: 100 kB per script.", "Limit: 100 kB per script."));
        return;
      }
      set("code", await file.text());
      render();
    };
    $("#python-code").onkeydown = (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const el = e.target,
          pos = el.selectionStart;
        el.setRangeText("    ", pos, el.selectionEnd, "end");
        set("code", el.value);
      }
    };
  } else if (mode === "notes") {
    bind("#export-notes", () => download("cg50-notebook.txt", get("text")));
    bind("#print-notes", () => {
      const w = window.open("", "_blank");
      if (!w) {
        toast(L("Abilita i popup per stampare.", "Enable popups to print."));
        return;
      }
      w.document.title = "CG50 Notebook";
      const pre = w.document.createElement("pre");
      pre.style.whiteSpace = "pre-wrap";
      pre.style.font = "14px/1.7 sans-serif";
      pre.textContent = get("text");
      w.document.body.append(pre);
      w.print();
    });
  }
}
function readSheet() {
  const cells = Array.from({ length: 12 }, () => Array(5).fill(""));
  $$("[data-cell]").forEach((el) => {
    const [i, j] = el.dataset.cell.split(",").map(Number);
    cells[i][j] = el.value;
  });
  return cells;
}
async function drawConic() {
  const type = get("type"),
    a = num("a"),
    b = num("b"),
    h = num("h"),
    k = num("k");
  if (a <= 0 || (type !== "circle" && b <= 0))
    throw Error(
      L("a / r e b devono essere positivi.", "a / r and b must be positive."),
    );
  const curves = [];
  if (type === "circle" || type === "ellipse") {
    const points = Array.from({ length: 501 }, (_, j) => {
      const t = (2 * Math.PI * j) / 500;
      return [
        h + a * Math.cos(t),
        k + (type === "circle" ? a : b) * Math.sin(t),
      ];
    });
    curves.push({ points });
    $("#conic-formula").textContent =
      type === "circle" ? "(x-h)²+(y-k)²=r²" : "(x-h)²/a²+(y-k)²/b²=1";
  } else if (type === "parabola") {
    const points = Array.from({ length: 501 }, (_, j) => {
      const x = h - a * 2 + (a * 4 * j) / 500;
      return [x, k + (x - h) ** 2 / (4 * a)];
    });
    curves.push({ points });
    $("#conic-formula").textContent = "(x-h)²=4a(y-k)";
  } else {
    for (const sign of [-1, 1]) {
      const points = Array.from({ length: 501 }, (_, j) => {
        const t = -2 + (4 * j) / 500;
        return [h + sign * a * Math.cosh(t), k + b * Math.sinh(t)];
      });
      curves.push({ points });
    }
    $("#conic-formula").textContent = "(x-h)²/a²-(y-k)²/b²=1";
  }
  setPlot(curves);
  const metric =
    type === "circle"
      ? { radius: a, area: Math.PI * a * a, circumference: 2 * Math.PI * a }
      : type === "ellipse"
        ? {
            area: Math.PI * a * b,
            eccentricity: Math.sqrt(
              1 - Math.min(a, b) ** 2 / Math.max(a, b) ** 2,
            ),
          }
        : type === "hyperbola"
          ? { eccentricity: Math.sqrt(1 + (b * b) / (a * a)) }
          : { focus: [h, k + a], directrix: "y = " + (k - a) };
  renderOutput(metric);
}
function pointList() {
  const rows = String(get("points"))
    .trim()
    .split(";")
    .map((r) =>
      r
        .trim()
        .split(/[\s,]+/)
        .map(Number),
    );
  if (rows.some((r) => r.length !== 2 || r.some((v) => !Number.isFinite(v))))
    throw Error(
      L("Usa coppie x,y separate da ;", "Use x,y pairs separated by ;"),
    );
  return rows;
}
async function drawGeometry() {
  const pts = pointList();
  const result = await run({ task: "geometry", points: pts });
  if (!result || mode !== "geometry") return;
  const curves = [
      { points: pts.length > 2 ? [...pts, pts[0]] : pts, dots: true },
    ],
    range = chartState?.range || autoRange(curves);
  setPlot(curves, range, false);
  const canvas = $("#chart");
  let drag = -1,
    view = plot(canvas, curves, { range });
  canvas.onpointerdown = (e) => {
    const rect = canvas.getBoundingClientRect(),
      p = view.fromPixel(e.clientX - rect.left, e.clientY - rect.top);
    let best = Infinity;
    pts.forEach((v, j) => {
      const d = Math.hypot(
        (v[0] - p[0]) / (range.xmax - range.xmin),
        (v[1] - p[1]) / (range.ymax - range.ymin),
      );
      if (d < best && d < 0.07) {
        best = d;
        drag = j;
      }
    });
    if (drag >= 0) canvas.setPointerCapture(e.pointerId);
  };
  canvas.onpointermove = (e) => {
    if (drag < 0) return;
    const rect = canvas.getBoundingClientRect(),
      p = view.fromPixel(e.clientX - rect.left, e.clientY - rect.top);
    pts[drag] = p.map((v) => Number(v.toFixed(3)));
    curves[0].points = pts.length > 2 ? [...pts, pts[0]] : pts;
    chartState.curves = curves;
    view = plot(canvas, curves, { range });
  };
  canvas.onpointerup = async () => {
    if (drag < 0) return;
    drag = -1;
    set("points", pts.map((v) => v.join(",")).join("; "));
    $('[data-field="points"]').value = get("points");
    await run({ task: "geometry", points: pts });
  };
  canvas.onpointercancel = () => (drag = -1);
}

function stopPython(message) {
  pyWorker?.terminate();
  pyWorker = null;
  pyBusy = false;
  clearTimeout(pyTimer);
  if ($("#py-status")) $("#py-status").textContent = message;
  if (mode === "python") $("#run").disabled = false;
}
function runPython() {
  if (pyBusy) {
    toast(L("Python è già in esecuzione.", "Python is already running."));
    return;
  }
  const code = $("#python-code").value;
  if (code.length > 100000)
    throw Error(
      L("Script troppo lungo (max 100 kB).", "Script too long (max 100 kB)."),
    );
  set("code", code);
  pyBusy = true;
  $("#run").disabled = true;
  $("#py-output").textContent = "";
  $("#py-status").textContent = L(
    "Avvio runtime Python…",
    "Starting Python runtime…",
  );
  if (!pyWorker) {
    pyWorker = new Worker("python-worker.js");
    pyWorker.onmessage = ({ data }) => {
      if (mode === "python") {
        if (data.type === "output")
          $("#py-output").textContent = (
            $("#py-output").textContent +
            data.text +
            "\n"
          ).slice(-100000);
        if (data.type === "status")
          $("#py-status").textContent =
            data.text === "loading"
              ? L(
                  "Scaricamento Python, attendi…",
                  "Downloading Python, please wait…",
                )
              : L("Esecuzione…", "Running…");
        if (data.type === "error") $("#py-output").textContent += data.text;
      }
      if (data.type === "done" || data.type === "error") {
        pyBusy = false;
        clearTimeout(pyTimer);
        if (mode === "python") {
          $("#run").disabled = false;
          $("#py-status").textContent =
            data.type === "done"
              ? L("Completato", "Done")
              : L("Errore: vedi output", "Error: see output");
        }
      }
    };
    pyWorker.onerror = () =>
      stopPython(
        L(
          "Runtime non disponibile. Verifica la connessione.",
          "Runtime unavailable. Check your connection.",
        ),
      );
  }
  pyTimer = setTimeout(
    () =>
      stopPython(L("Interrotto dopo 90 secondi.", "Stopped after 90 seconds.")),
    90000,
  );
  pyWorker.postMessage({ code });
}

function loadExample(kind) {
  const demos = {
    trig: { expr: "sin(30)+cos(60)", angle: "DEG" },
    complex: { expr: "(2+3i)*(1-i)" },
    integral: { expr: 'intg("x^2",0,3)' },
    architect: { expr: "atan(0.30/3.00)", angle: "DEG" },
  };
  if (demos[kind]) {
    if (mode !== "calc") navigate("calc");
    const d = demos[kind];
    if (d.angle) {
      angle = d.angle;
      save("angle", angle);
      $("#angle").value = angle;
      updateDisplayMode();
    }
    setExpr(d.expr);
    calculate();
    return;
  }
  if (kind === "calc") {
    loadExample("trig");
    return;
  }
  if (!defaults[kind]) return;
  if (mode !== kind) navigate(kind);
  fields[kind] = structuredClone(defaults[kind]);
  if (kind === "graph") {
    angle = "RAD";
    save("angle", angle);
    fields.graph = {
      ...defaults.graph,
      f1: "a*sin(x)",
      f2: "cos(x)",
      min: -6.283185307,
      max: 6.283185307,
      ymin: -3,
      ymax: 3,
    };
  }
  if (kind === "table") {
    angle = "RAD";
    save("angle", angle);
  }
  if (kind === "sheet") save("sheet", initialCells());
  save("fields", fields);
  render();
  if (
    ![
      "graph",
      "graph3d",
      "conic",
      "geometry",
      "python",
      "notes",
      "calc",
    ].includes(kind)
  )
    $("#run")?.click();
  toast(
    L(
      "Esempio caricato. Puoi modificare i valori.",
      "Example loaded. You can edit the values.",
    ),
  );
}
function openHelp(topic) {
  $("#help-title").textContent = L(
    "Guida, esempi e tutorial",
    "Help, examples & tutorials",
  );
  $("#help-search").placeholder = L(
    "Cerca una funzione o una modalità…",
    "Search for a function or mode…",
  );
  $("#help-search").value = "";
  renderHelp();
  $("#help-dialog").showModal();
  if (topic) {
    const details = $(`[data-topic="${topic}"]`);
    if (details) {
      details.open = true;
      details.scrollIntoView({ block: "start" });
    }
  }
}
function renderHelp() {
  const query = $("#help-search").value.toLocaleLowerCase(),
    topics = helpTopics(lang);
  $("#help-content").innerHTML =
    `<div class="help-summary"><strong>${L("Una calcolatrice grafica per il web", "A graphing calculator for the web")}</strong><p>${L("CG50 Studio usa un motore indipendente. Tutte le modalità e i limiti di questa versione sono descritti qui.", "CG50 Studio uses an independent engine. All modes and limits of this release are documented here.")}</p></div>` +
    topics
      .filter((t) =>
        (t.title + " " + t.body.replace(/<[^>]*>/g, ""))
          .toLocaleLowerCase()
          .includes(query),
      )
      .map(
        (t) =>
          `<details data-topic="${t.id}" ${query ? "open" : ""}><summary>${t.title}</summary>${t.body}${t.mode ? `<div class="help-actions"><button class="button small" data-help-mode="${t.mode}">${L("Apri modalità", "Open mode")}</button><button class="button small secondary" data-help-demo="${t.mode}">${L("Prova esempio", "Try example")}</button></div>` : ""}</details>`,
      )
      .join("");
  $$("[data-help-mode]").forEach(
    (b) =>
      (b.onclick = () => {
        $("#help-dialog").close();
        navigate(b.dataset.helpMode);
      }),
  );
  $$("[data-help-demo]").forEach(
    (b) =>
      (b.onclick = () => {
        $("#help-dialog").close();
        loadExample(b.dataset.helpDemo);
      }),
  );
}
$("#help").onclick = $("#help-side").onclick = () => openHelp();
$("#close-help").onclick = () => $("#help-dialog").close();
$("#help-search").oninput = renderHelp;
$("#help-dialog").onclick = (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  if (
    e.target === e.currentTarget &&
    (e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom)
  )
    e.currentTarget.close();
};
$("#language").onclick = () => {
  lang = lang === "it" ? "en" : "it";
  save("lang", lang);
  clearInterval(animation);
  animation = null;
  render();
  if ($("#help-dialog").open) {
    $("#help-title").textContent = L(
      "Guida, esempi e tutorial",
      "Help, examples & tutorials",
    );
    renderHelp();
  }
};
$("#theme").onclick = () => {
  document.body.classList.toggle("dark");
  save("theme", document.body.classList.contains("dark") ? "dark" : "light");
  drawCurrent();
  if (mode === "calc") render();
};
if (load("theme", "light") === "dark") document.body.classList.add("dark");
$("#menu").onclick = () => {
  const open = $("#sidebar").classList.toggle("open");
  $("#menu").setAttribute("aria-expanded", open);
};
document.addEventListener("click", (e) => {
  if (!$("#sidebar").contains(e.target) && !$("#menu").contains(e.target)) {
    $("#sidebar").classList.remove("open");
    $("#menu").setAttribute("aria-expanded", "false");
  }
});
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    drawCurrent();
    if (mode === "calc" && $("#preview")) {
      const points = Array.from({ length: 201 }, (_, j) => {
        const x = -4 + (8 * j) / 200;
        return [x, x * x - 4];
      });
      plot($("#preview"), [{ points }], {
        range: { xmin: -4, xmax: 4, ymin: -5, ymax: 8 },
      });
    }
  }, 100);
});
window.addEventListener("hashchange", () => {
  const next = location.hash.slice(1);
  if (modes.some((m) => m[0] === next) && next !== mode) navigate(next);
});
render();
