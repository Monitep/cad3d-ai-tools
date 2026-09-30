export const COLORS = [
  "#398c70",
  "#c7823a",
  "#688dc4",
  "#b96991",
  "#8573bb",
  "#53a8a6",
];
export function plot(canvas, curves, options = {}) {
  const dark = document.body.classList.contains("dark");
  const ink = dark ? "#9cb4a6" : "#7c9485",
    grid = dark ? "#2d473b" : "#e8eee6",
    axis = dark ? "#5d7c68" : "#a7bcaa",
    bg = dark ? "#1b302a" : "#fff";
  const rect = canvas.getBoundingClientRect(),
    w = Math.max(100, rect.width),
    h = Math.max(100, rect.height),
    dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const r = options.range || { xmin: -5, xmax: 5, ymin: -5, ymax: 5 },
    pad = { l: 43, r: 18, t: 20, b: 30 },
    pw = w - pad.l - pad.r,
    ph = h - pad.t - pad.b;
  const X = (x) => pad.l + ((x - r.xmin) / (r.xmax - r.xmin)) * pw,
    Y = (y) => pad.t + ((r.ymax - y) / (r.ymax - r.ymin)) * ph;
  const step = (v) => {
    const p = 10 ** Math.floor(Math.log10(v)),
      n = v / p;
    return (n < 2 ? 1 : n < 5 ? 2 : 5) * p;
  };
  function ticks(lo, hi, pixels) {
    const s = step((hi - lo) / (pixels / 70)),
      out = [];
    for (
      let v = Math.ceil(lo / s) * s;
      v <= hi + s * 1e-9 && out.length < 100;
      v += s
    )
      out.push(Math.abs(v) < s * 1e-9 ? 0 : Number(v.toPrecision(8)));
    return out;
  }
  ctx.font = "10px ui-monospace,Consolas,monospace";
  ctx.lineWidth = 1;
  for (const x of ticks(r.xmin, r.xmax, pw)) {
    ctx.strokeStyle = x === 0 ? axis : grid;
    ctx.beginPath();
    ctx.moveTo(X(x), pad.t);
    ctx.lineTo(X(x), h - pad.b);
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.fillText(String(x), X(x), h - 10);
  }
  for (const y of ticks(r.ymin, r.ymax, ph)) {
    ctx.strokeStyle = y === 0 ? axis : grid;
    ctx.beginPath();
    ctx.moveTo(pad.l, Y(y));
    ctx.lineTo(w - pad.r, Y(y));
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.textAlign = "right";
    ctx.fillText(String(y), pad.l - 8, Y(y) + 3);
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(pad.l, pad.t, pw, ph);
  ctx.clip();
  curves.forEach((c, j) => {
    const color = c.color || COLORS[j % COLORS.length];
    ctx.strokeStyle = color;
    ctx.lineWidth = c.width || 2;
    ctx.beginPath();
    let prev = null;
    for (const p of c.points) {
      if (!p || p.some((v) => !Number.isFinite(v))) {
        prev = null;
        continue;
      }
      const x = X(p[0]),
        y = Y(p[1]);
      if (!prev || Math.abs(y - prev[1]) > ph * 1.5) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      prev = [x, y];
    }
    if (c.width !== 0) ctx.stroke();
    if (c.type === "above" || c.type === "below") {
      ctx.fillStyle = color + "18";
      for (let k = 1; k < c.points.length; k++) {
        const a = c.points[k - 1],
          b = c.points[k];
        if (!a || !b || Math.abs(Y(a[1]) - Y(b[1])) > ph) continue;
        ctx.beginPath();
        ctx.moveTo(X(a[0]), Y(a[1]));
        ctx.lineTo(X(b[0]), Y(b[1]));
        ctx.lineTo(X(b[0]), c.type === "above" ? pad.t : h - pad.b);
        ctx.lineTo(X(a[0]), c.type === "above" ? pad.t : h - pad.b);
        ctx.closePath();
        ctx.fill();
      }
    }
    if (c.dots) {
      for (const p of c.points) {
        if (!p) continue;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(X(p[0]), Y(p[1]), 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  ctx.restore();
  if (options.trace) {
    const [x, y] = options.trace;
    ctx.strokeStyle = axis;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(X(x), pad.t);
    ctx.lineTo(X(x), h - pad.b);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COLORS[0];
    ctx.beginPath();
    ctx.arc(X(x), Y(y), 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bg;
    ctx.fillRect(pad.l + 7, pad.t + 2, Math.min(240, pw - 14), 25);
    ctx.fillStyle = ink;
    ctx.textAlign = "left";
    ctx.fillText(
      `x = ${x.toPrecision(5)}   y = ${y.toPrecision(5)}`,
      pad.l + 14,
      pad.t + 19,
    );
  }
  return {
    range: r,
    fromPixel: (x, y) => [
      r.xmin + ((x - pad.l) / pw) * (r.xmax - r.xmin),
      r.ymax - ((y - pad.t) / ph) * (r.ymax - r.ymin),
    ],
  };
}
export function interactivePlot(canvas, curves, range, onRange) {
  let trace = null,
    drag = null,
    view = plot(canvas, curves, { range });
  const draw = () => {
    view = plot(canvas, curves, { range, trace });
  };
  canvas.onpointerdown = (e) => {
    const q = canvas.getBoundingClientRect();
    drag = { x: e.clientX, y: e.clientY, range: { ...range } };
    canvas.setPointerCapture(e.pointerId);
  };
  canvas.onpointermove = (e) => {
    const q = canvas.getBoundingClientRect();
    if (drag) {
      const dx =
          ((e.clientX - drag.x) / Math.max(1, q.width - 61)) *
          (drag.range.xmax - drag.range.xmin),
        dy =
          ((e.clientY - drag.y) / Math.max(1, q.height - 50)) *
          (drag.range.ymax - drag.range.ymin);
      range = {
        xmin: drag.range.xmin - dx,
        xmax: drag.range.xmax - dx,
        ymin: drag.range.ymin + dy,
        ymax: drag.range.ymax + dy,
      };
      trace = null;
    } else {
      const [x] = view.fromPixel(e.clientX - q.left, e.clientY - q.top);
      const pts = curves[0]?.points.filter(Boolean) || [];
      let nearest = null;
      for (const p of pts)
        if (!nearest || Math.abs(p[0] - x) < Math.abs(nearest[0] - x))
          nearest = p;
      trace = nearest;
    }
    draw();
  };
  canvas.onpointerup = (e) => {
    if (drag) {
      const moved =
        Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 3;
      drag = null;
      if (moved && onRange) onRange(range);
    }
  };
  canvas.onpointercancel = () => {
    drag = null;
  };
  canvas.onpointerleave = () => {
    if (!drag) {
      trace = null;
      draw();
    }
  };
  canvas.onwheel = (e) => {
    e.preventDefault();
    const q = canvas.getBoundingClientRect(),
      [x, y] = view.fromPixel(e.clientX - q.left, e.clientY - q.top),
      s = e.deltaY > 0 ? 1.2 : 0.8;
    range = {
      xmin: x + (range.xmin - x) * s,
      xmax: x + (range.xmax - x) * s,
      ymin: y + (range.ymin - y) * s,
      ymax: y + (range.ymax - y) * s,
    };
    trace = null;
    draw();
    onRange?.(range);
  };
  return { redraw: draw };
}
export function surface(canvas, lines, range, rotation = { x: 0.55, z: 0.65 }) {
  const q = canvas.getBoundingClientRect(),
    w = q.width,
    h = q.height,
    dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const c = canvas.getContext("2d");
  c.scale(dpr, dpr);
  const dark = document.body.classList.contains("dark");
  c.fillStyle = dark ? "#1b302a" : "#fff";
  c.fillRect(0, 0, w, h);
  const scale = Math.min(w, h) / (range * 4.5),
    cx = Math.cos(rotation.x),
    sx = Math.sin(rotation.x),
    cz = Math.cos(rotation.z),
    sz = Math.sin(rotation.z);
  const project = ([x, y, z]) => {
    const u = x * cz - y * sz,
      v = x * sz + y * cz;
    return [w / 2 + u * scale, h / 2 + (v * sx - z * cx) * scale];
  };
  c.lineWidth = 0.8;
  for (let j = 0; j < lines.length; j++) {
    c.strokeStyle =
      j < lines.length / 2
        ? dark
          ? "#94d59688"
          : "#398c7090"
        : dark
          ? "#bddea988"
          : "#88ab7290";
    c.beginPath();
    let start = true;
    for (const p of lines[j]) {
      if (!p) {
        start = true;
        continue;
      }
      const [x, y] = project(p);
      if (start) c.moveTo(x, y);
      else c.lineTo(x, y);
      start = false;
    }
    c.stroke();
  }
  c.lineWidth = 1.5;
  c.font = "12px ui-monospace";
  for (const [j, color] of ["#bb655e", "#5f8cae", "#8f8a50"].entries()) {
    const a = [0, 0, 0],
      b = [0, 0, 0];
    a[j] = -range * 1.3;
    b[j] = range * 1.3;
    c.strokeStyle = color;
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(...project(a));
    c.lineTo(...project(b));
    c.stroke();
    const [x, y] = project(b);
    c.fillText("xyz"[j], x + 4, y);
  }
  return project;
}
export function bars(canvas, values, labels) {
  const q = canvas.getBoundingClientRect(),
    w = q.width,
    h = q.height,
    dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const c = canvas.getContext("2d");
  c.scale(dpr, dpr);
  const dark = document.body.classList.contains("dark");
  c.fillStyle = dark ? "#1b302a" : "#fff";
  c.fillRect(0, 0, w, h);
  const max = Math.max(...values, 1),
    gap = 20,
    bw = (w - 60) / values.length;
  c.font = "11px ui-monospace";
  c.textAlign = "center";
  values.forEach((v, j) => {
    const x = 30 + j * bw,
      bh = ((h - 65) * v) / max;
    c.fillStyle = COLORS[j % COLORS.length];
    c.fillRect(x + gap / 2, h - 35 - bh, Math.max(3, bw - gap), bh);
    c.fillStyle = dark ? "#adc6b7" : "#6a8071";
    c.fillText(String(labels?.[j] ?? j + 1), x + bw / 2, h - 14);
    c.fillText(v.toPrecision(4), x + bw / 2, h - 42 - bh);
  });
}
export function autoRange(curves) {
  const points = curves
    .flatMap((c) => c.points)
    .filter((p) => p && p.every(Number.isFinite));
  if (!points.length) return { xmin: -5, xmax: 5, ymin: -5, ymax: 5 };
  const x = points.map((p) => p[0]),
    y = points.map((p) => p[1]).sort((a, b) => a - b);
  let xmin = Math.min(...x),
    xmax = Math.max(...x),
    ymin = y[Math.floor(y.length * 0.02)],
    ymax = y[Math.ceil(y.length * 0.98) - 1];
  if (xmin === xmax) {
    xmin--;
    xmax++;
  }
  if (ymin === ymax) {
    ymin--;
    ymax++;
  }
  const xp = (xmax - xmin) * 0.06,
    yp = (ymax - ymin) * 0.12;
  return { xmin: xmin - xp, xmax: xmax + xp, ymin: ymin - yp, ymax: ymax + yp };
}
