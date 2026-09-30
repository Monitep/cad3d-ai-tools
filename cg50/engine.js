/* CG50 Studio numerical engine. Local math.js + jStat, isolated in a worker. */
(function (root) {
  "use strict";
  const math = root.math || require("./vendor/math.js");
  const stat = root.jStat || require("./vendor/jstat.js").jStat;
  const m = math.create(math.all);
  const native = Object.fromEntries(
    [
      "sin",
      "cos",
      "tan",
      "asin",
      "acos",
      "atan",
      "atan2",
      "log",
      "factorial",
      "combinations",
      "permutations",
      "ones",
      "zeros",
      "identity",
      "random",
      "randomInt",
    ].map((k) => [k, m[k]]),
  );
  let angle = "RAD";
  const factor = () =>
    angle === "DEG" ? Math.PI / 180 : angle === "GRA" ? Math.PI / 200 : 1;
  const scalar = (v) => {
    if (typeof v !== "number" || !Number.isFinite(v))
      throw Error("A finite real number is required");
    return v;
  };
  const integer = (v, lo, hi) => {
    scalar(v);
    if (!Number.isInteger(v) || v < lo || v > hi)
      throw Error(`Integer required: ${lo}…${hi}`);
    return v;
  };
  const allowed = new Set(
    "sin cos tan asin acos atan atan2 sinh cosh tanh asinh acosh atanh sec csc cot sqrt cbrt nthRoot abs sign exp log ln log10 log2 pow round floor ceil fix mod gcd lcm factorial nCr nPr combinations permutations min max sum prod mean median std variance quantile sort size transpose det inv trace rank dot cross norm multiply add subtract identity zeros ones complex re im arg conj fraction number random randomInt intg diff sigma Pol Rec dms toDMS normalPDF normalCDF normalInv binomialPDF binomialCDF poissonPDF poissonCDF bitAnd bitOr bitXor bitNot leftShift rightArithShift".split(
      " ",
    ),
  );
  const variables = new Set([
    "pi",
    "e",
    "i",
    "Infinity",
    "true",
    "false",
    "Ans",
    "ans",
    "x",
    "y",
    "t",
    "n",
    "a",
    "b",
    ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  ]);
  function normalize(s) {
    return String(s)
      .replace(/π/g, "pi")
      .replace(/×/g, "*")
      .replace(/[÷]/g, "/")
      .replace(/[−–]/g, "-")
      .replace(/√\s*\(/g, "sqrt(");
  }
  function parse(expr, assignment = false) {
    expr = normalize(expr);
    if (!expr.trim() || expr.length > 2000)
      throw Error("Expression is empty or too long (max 2000 characters)");
    const node = m.parse(expr);
    let count = 0;
    node.traverse((n) => {
      if (++count > 400) throw Error("Expression is too complex");
      if (n.isFunctionNode && (!n.fn.isSymbolNode || !allowed.has(n.fn.name)))
        throw Error("Unsupported function: " + n.fn.toString());
      if (n.isSymbolNode && !variables.has(n.name) && !allowed.has(n.name))
        throw Error("Unknown variable: " + n.name);
      if (
        n.isAssignmentNode &&
        !(assignment && n.object.isSymbolNode && /^[A-Z]$/.test(n.object.name))
      )
        throw Error("Only A…Z variable assignments are allowed");
      if (
        n.isAccessorNode ||
        n.isIndexNode ||
        n.isFunctionAssignmentNode ||
        n.isBlockNode ||
        n.isRangeNode ||
        n.isObjectNode
      )
        throw Error("Unsupported expression structure");
      if (n.isArrayNode && n.items.length > 40) throw Error("Array too large");
    });
    return node.compile();
  }
  function scopeOf(scope = {}) {
    const out = {};
    for (const [k, v] of Object.entries(scope))
      if (variables.has(k))
        out[k] = v && v.mathjs === "Complex" ? m.complex(v.re, v.im) : v;
    return out;
  }
  function evaluate(expr, scope = {}, assignment = false) {
    return parse(expr, assignment).evaluate(scopeOf(scope));
  }
  function fn(expr, variable = "x", scope = {}) {
    const c = parse(expr);
    const s = scopeOf(scope);
    return (v) => {
      s[variable] = v;
      return scalar(c.evaluate(s));
    };
  }
  function derivative(f, x) {
    scalar(x);
    const h = 1e-4 * Math.max(1, Math.abs(x));
    return scalar(
      (f(x - 2 * h) - 8 * f(x - h) + 8 * f(x + h) - f(x + 2 * h)) / (12 * h),
    );
  }
  function integrate(f, a, b) {
    scalar(a);
    scalar(b);
    if (a === b) return 0;
    if (a > b) return -integrate(f, b, a);
    let calls = 0;
    const sample = (x) => {
      if (++calls > 16000) throw Error("Integral did not converge");
      return scalar(f(x));
    };
    const fa = sample(a),
      fb = sample(b),
      mid = (a + b) / 2,
      fm = sample(mid),
      whole = ((b - a) * (fa + 4 * fm + fb)) / 6;
    function recurse(a, b, fa, fm, fb, old, tol, depth) {
      const c = (a + b) / 2,
        fl = sample((a + c) / 2),
        fr = sample((c + b) / 2);
      const l = ((c - a) * (fa + 4 * fl + fm)) / 6,
        r = ((b - c) * (fm + 4 * fr + fb)) / 6,
        delta = l + r - old;
      if (Math.abs(delta) <= 15 * tol) return l + r + delta / 15;
      if (!depth) throw Error("Integral did not converge; split the interval");
      return (
        recurse(a, c, fa, fl, fm, l, tol / 2, depth - 1) +
        recurse(c, b, fm, fr, fb, r, tol / 2, depth - 1)
      );
    }
    return scalar(
      recurse(a, b, fa, fm, fb, whole, 1e-9 * Math.max(1, Math.abs(whole)), 20),
    );
  }
  m.import(
    {
      sin: (v) => native.sin(m.multiply(v, factor())),
      cos: (v) => native.cos(m.multiply(v, factor())),
      tan: (v) => native.tan(m.multiply(v, factor())),
      asin: (v) => m.divide(native.asin(v), factor()),
      acos: (v) => m.divide(native.acos(v), factor()),
      atan: (v) => m.divide(native.atan(v), factor()),
      atan2: (y, x) => native.atan2(y, x) / factor(),
      sec: (v) => m.divide(1, native.cos(m.multiply(v, factor()))),
      csc: (v) => m.divide(1, native.sin(m.multiply(v, factor()))),
      cot: (v) => m.divide(1, native.tan(m.multiply(v, factor()))),
      factorial: (v) => native.factorial(integer(v, 0, 170)),
      combinations: (n, r) =>
        native.combinations(integer(n, 0, 170), integer(r, 0, n)),
      permutations: (n, r) =>
        native.permutations(integer(n, 0, 170), integer(r, 0, n)),
      ones: (...dims) => {
        if (dims.length > 2 || !dims.length)
          throw Error("One or two dimensions required");
        dims.forEach((d) => integer(d, 1, 20));
        return native.ones(...dims);
      },
      zeros: (...dims) => {
        if (dims.length > 2 || !dims.length)
          throw Error("One or two dimensions required");
        dims.forEach((d) => integer(d, 1, 20));
        return native.zeros(...dims);
      },
      identity: (n) => native.identity(integer(n, 1, 20)),
      random: (...args) => {
        if (args.length > 2)
          throw Error("random: zero, one or two scalar arguments");
        args.forEach(scalar);
        return native.random(...args);
      },
      randomInt: (...args) => {
        if (!args.length || args.length > 2)
          throw Error("randomInt: one or two integer arguments required");
        args.forEach((v) =>
          integer(v, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
        );
        return native.randomInt(...args);
      },
      log: (v, b = 10) => native.log(v, b),
      ln: (v) => native.log(v),
      nCr: (n, r) => m.combinations(integer(n, 0, 170), integer(r, 0, n)),
      nPr: (n, r) => m.permutations(integer(n, 0, 170), integer(r, 0, n)),
      Pol: (x, y) => [Math.hypot(x, y), native.atan2(y, x) / factor()],
      Rec: (r, t) => [r * Math.cos(t * factor()), r * Math.sin(t * factor())],
      dms: (d, min = 0, sec = 0) =>
        Math.sign(d || 1) * (Math.abs(d) + min / 60 + sec / 3600),
      toDMS: (d) => [
        Math.trunc(d),
        Math.floor((Math.abs(d) % 1) * 60),
        ((Math.abs(d) * 60) % 1) * 60,
      ],
      diff: (s, x) => derivative(fn(s), scalar(x)),
      intg: (s, a, b) => integrate(fn(s), scalar(a), scalar(b)),
      sigma: (s, a, b) => {
        integer(a, -100000, 100000);
        integer(b, a, 100000);
        if (b - a > 10000) throw Error("Summation limit: 10001 terms");
        const f = fn(s, "n");
        let sum = 0;
        for (let n = a; n <= b; n++) sum += f(n);
        return sum;
      },
      normalPDF: (x, mu = 0, sd = 1) => {
        if (sd <= 0) throw Error("σ must be positive");
        return stat.normal.pdf(x, mu, sd);
      },
      normalCDF: (x, mu = 0, sd = 1) => {
        if (sd <= 0) throw Error("σ must be positive");
        return stat.normal.cdf(x, mu, sd);
      },
      normalInv: (p, mu = 0, sd = 1) => {
        if (p <= 0 || p >= 1 || sd <= 0) throw Error("0 < p < 1, σ > 0");
        return stat.normal.inv(p, mu, sd);
      },
      binomialPDF: (k, n, p) => {
        integer(n, 0, 10000);
        integer(k, 0, n);
        if (p < 0 || p > 1) throw Error("0 ≤ p ≤ 1");
        return stat.binomial.pdf(k, n, p);
      },
      binomialCDF: (k, n, p) => {
        integer(n, 0, 10000);
        integer(k, 0, n);
        if (p < 0 || p > 1) throw Error("0 ≤ p ≤ 1");
        return stat.binomial.cdf(k, n, p);
      },
      poissonPDF: (k, l) => {
        integer(k, 0, 10000);
        if (l <= 0) throw Error("λ > 0");
        return stat.poisson.pdf(k, l);
      },
      poissonCDF: (k, l) => {
        integer(k, 0, 10000);
        if (l <= 0) throw Error("λ > 0");
        return stat.poisson.cdf(k, l);
      },
    },
    { override: true },
  );
  m.createUnit("ha", "10000 m^2");
  function plain(v) {
    if (v && v.isComplex) return { mathjs: "Complex", re: v.re, im: v.im };
    if (v && v.toArray) return v.toArray().map(plain);
    if (Array.isArray(v)) return v.map(plain);
    return v;
  }
  function format(v, opts = {}) {
    if (typeof v === "number" && !Number.isFinite(v))
      throw Error("Undefined or infinite result");
    if (v?.isComplex && (!Number.isFinite(v.re) || !Number.isFinite(v.im)))
      throw Error("Undefined or infinite result");
    if (v?.toArray)
      v.toArray()
        .flat(Infinity)
        .forEach((x) => format(x));
    if (Array.isArray(v)) v.flat(Infinity).forEach((x) => format(x));
    const precision = opts.precision || 12;
    if (opts.format === "FIX" && typeof v === "number")
      return v.toFixed(Math.min(12, opts.digits ?? 6));
    if (opts.format === "SCI" && typeof v === "number")
      return v.toExponential(Math.min(12, opts.digits ?? 6));
    if (opts.format === "ENG" && typeof v === "number") {
      if (v === 0) return "0";
      const e = 3 * Math.floor(Math.log10(Math.abs(v)) / 3);
      return `${Number((v / 10 ** e).toPrecision(precision))} × 10^${e}`;
    }
    return m.format(v, { precision });
  }
  function summary(data) {
    const x = numericList(data, 10000);
    const n = x.length,
      mean = m.mean(x),
      sd = n > 1 ? m.std(x, "unbiased") : 0;
    return {
      n,
      sum: m.sum(x),
      sumSquares: x.reduce((s, v) => s + v * v, 0),
      mean,
      median: m.median(x),
      min: m.min(x),
      Q1: m.quantileSeq(x, 0.25),
      Q3: m.quantileSeq(x, 0.75),
      max: m.max(x),
      sigma: m.std(x, "uncorrected"),
      sampleSD: sd,
      variance: n > 1 ? m.variance(x, "unbiased") : 0,
    };
  }
  function numericList(v, max = 1000) {
    if (typeof v === "string")
      v = v
        .trim()
        .split(/[\s,;]+/)
        .filter(Boolean)
        .map(Number);
    if (!Array.isArray(v) || !v.length || v.length > max)
      throw Error(`Provide 1…${max} numeric values`);
    v.forEach(scalar);
    return v;
  }
  function matrix(v) {
    if (typeof v === "string") v = evaluate(v);
    if (v.toArray) v = v.toArray();
    if (
      !Array.isArray(v) ||
      !v.length ||
      v.length > 20 ||
      !Array.isArray(v[0]) ||
      !v[0].length ||
      v[0].length > 20 ||
      v.some((r) => r.length !== v[0].length)
    )
      throw Error("Rectangular matrix required (max 20 × 20)");
    v.forEach((r) => r.forEach(scalar));
    return v;
  }
  function rootsBetween(f, a, b) {
    scalar(a);
    scalar(b);
    if (a >= b) throw Error("Minimum must be less than maximum");
    const roots = [];
    const push = (x) => {
      if (Math.abs(f(x)) > 1e-6) return;
      if (!roots.some((r) => Math.abs(r - x) < 1e-5)) roots.push(x);
    };
    let prev;
    try {
      prev = f(a);
      if (Math.abs(prev) < 1e-9) push(a);
    } catch {}
    for (let j = 1; j <= 1000; j++) {
      const x = a + ((b - a) * j) / 1000,
        x0 = a + ((b - a) * (j - 1)) / 1000;
      let y;
      try {
        y = f(x);
      } catch {
        prev = undefined;
        continue;
      }
      if (Math.abs(y) < 1e-9) push(x);
      if (prev !== undefined && y * prev < 0) {
        let lo = x0,
          hi = x,
          fl = prev;
        for (let k = 0; k < 65; k++) {
          const c = (lo + hi) / 2;
          let fc;
          try {
            fc = f(c);
          } catch {
            break;
          }
          if (fc * fl <= 0) hi = c;
          else {
            lo = c;
            fl = fc;
          }
        }
        try {
          push((lo + hi) / 2);
        } catch {}
      }
      // Newton seeds also detect even-multiplicity roots.
      if (j % 25 === 0) {
        let z = x;
        for (let k = 0; k < 30; k++) {
          try {
            const fz = f(z),
              d = derivative(f, z);
            if (Math.abs(d) < 1e-12) break;
            const nz = z - fz / d;
            if (nz < a || nz > b) break;
            z = nz;
            if (Math.abs(fz) < 1e-10) {
              push(z);
              break;
            }
          } catch {
            break;
          }
        }
      }
      prev = y;
    }
    return roots.sort((x, y) => x - y);
  }
  function polynomial(c) {
    c = numericList(c, 7);
    if (c.length < 3 || c[0] === 0)
      throw Error("Degree 2…6, leading coefficient ≠ 0");
    const n = c.length - 1;
    if (n === 2) {
      const [a, b, d] = c,
        disc = m.sqrt(b * b - 4 * a * d);
      return [
        m.divide(m.add(-b, disc), 2 * a),
        m.divide(m.subtract(-b, disc), 2 * a),
      ];
    }
    c = c.map((v) => v / c[0]);
    const radius = 1 + Math.max(...c.slice(1).map(Math.abs));
    let z = Array.from({ length: n }, (_, j) =>
      m.complex({ r: radius, phi: (2 * Math.PI * j) / n + 0.17 }),
    );
    for (let iter = 0; iter < 1500; iter++) {
      let delta = 0;
      const next = z.map((v, j) => {
        let p = m.complex(c[0]);
        for (let k = 1; k < c.length; k++) p = m.add(m.multiply(p, v), c[k]);
        let d = m.complex(1);
        for (let k = 0; k < n; k++)
          if (k !== j) d = m.multiply(d, m.subtract(v, z[k]));
        if (m.abs(d) < 1e-30) d = m.add(d, m.complex(1e-15, 1e-15));
        const step = m.divide(p, d);
        delta = Math.max(delta, m.abs(step));
        return m.subtract(v, step);
      });
      z = next;
      if (delta < 1e-12) break;
    }
    for (const v of z) {
      let p = m.complex(c[0]);
      for (let k = 1; k < c.length; k++) p = m.add(m.multiply(p, v), c[k]);
      if (m.abs(p) > 1e-5 * Math.max(1, m.abs(v) ** n))
        throw Error("Polynomial roots did not converge");
    }
    return z
      .map((v) => (Math.abs(v.im) < 1e-7 ? Number(v.re.toPrecision(10)) : v))
      .sort((a, b) => (a.re ?? a) - (b.re ?? b));
  }
  function regress(x, y, type = "linear", degree = 2) {
    x = numericList(x);
    y = numericList(y);
    if (x.length !== y.length || x.length < 2)
      throw Error("Paired lists must have the same length (at least 2)");
    let tx = x,
      ty = y;
    if (type === "log" || type === "power") {
      if (x.some((v) => v <= 0)) throw Error("x > 0 required");
      tx = x.map(Math.log);
    }
    if (type === "exp" || type === "power") {
      if (y.some((v) => v <= 0)) throw Error("y > 0 required");
      ty = y.map(Math.log);
    }
    const d = type === "polynomial" ? integer(degree, 1, 4) : 1;
    if (x.length <= d)
      throw Error("More points than polynomial degree required");
    const X = tx.map((t) => Array.from({ length: d + 1 }, (_, k) => t ** k));
    const Xt = m.transpose(X);
    const c = m.lusolve(m.multiply(Xt, X), m.multiply(Xt, ty)).map((v) => v[0]);
    const predict = (t) => {
      let u = type === "log" || type === "power" ? Math.log(t) : t;
      let v = c.reduce((s, a, k) => s + a * u ** k, 0);
      return type === "exp" || type === "power" ? Math.exp(v) : v;
    };
    const fitted = x.map(predict),
      ym = m.mean(y),
      sse = y.reduce((s, v, j) => s + (v - fitted[j]) ** 2, 0),
      sst = y.reduce((s, v) => s + (v - ym) ** 2, 0);
    let equation = c
      .map((v, j) => `${format(v)}${j ? "*x" + (j > 1 ? "^" + j : "") : ""}`)
      .join(" + ");
    if (type === "log") equation = `${format(c[0])} + ${format(c[1])}*ln(x)`;
    if (type === "exp")
      equation = `${format(Math.exp(c[0]))}*exp(${format(c[1])}*x)`;
    if (type === "power")
      equation = `${format(Math.exp(c[0]))}*x^(${format(c[1])})`;
    return {
      equation,
      coefficients: c,
      R2: sst === 0 ? null : 1 - sse / sst,
      x,
      y,
      fitted,
    };
  }
  function distribution(p) {
    const type = p.type,
      op = p.op;
    let dist, args;
    if (type === "normal") {
      scalar(p.mu);
      scalar(p.sd);
      if (p.sd <= 0) throw Error("σ > 0");
      dist = stat.normal;
      args = [p.mu, p.sd];
    } else if (type === "binomial") {
      integer(p.n, 1, 10000);
      if (!(p.p >= 0 && p.p <= 1)) throw Error("0 ≤ p ≤ 1");
      dist = stat.binomial;
      args = [p.n, p.p];
    } else if (type === "poisson") {
      if (!(p.lambda > 0)) throw Error("λ > 0");
      dist = stat.poisson;
      args = [p.lambda];
    } else if (type === "t") {
      if (!(p.df > 0)) throw Error("df > 0");
      dist = stat.studentt;
      args = [p.df];
    } else if (type === "chi2") {
      if (!(p.df > 0)) throw Error("df > 0");
      dist = stat.chisquare;
      args = [p.df];
    } else if (type === "f") {
      if (!(p.df > 0 && p.df2 > 0)) throw Error("df1, df2 > 0");
      dist = stat.centralF;
      args = [p.df, p.df2];
    } else if (type === "geometric") {
      if (!(p.p > 0 && p.p <= 1)) throw Error("0 < p ≤ 1");
      if (!["pdf", "cdf"].includes(op))
        throw Error("Geometric distribution supports PDF and CDF only");
      integer(p.x, 1, 10000);
      return op === "pdf" ? p.p * (1 - p.p) ** (p.x - 1) : 1 - (1 - p.p) ** p.x;
    } else throw Error("Unsupported distribution");
    if (op === "inv") {
      if (!(p.x > 0 && p.x < 1))
        throw Error("Probability must be between 0 and 1");
      if (!dist.inv)
        throw Error("Inverse available only for continuous distributions");
      return scalar(dist.inv(p.x, ...args));
    }
    scalar(p.x);
    if (["binomial", "poisson"].includes(type)) integer(p.x, 0, 10000);
    if (op === "range") {
      scalar(p.upper);
      if (p.upper < p.x) throw Error("Upper must be ≥ lower");
      if (["binomial", "poisson"].includes(type)) integer(p.upper, 0, 10000);
      return scalar(
        dist.cdf(p.upper, ...args) -
          dist.cdf(
            ["binomial", "poisson"].includes(type) ? p.x - 1 : p.x,
            ...args,
          ),
      );
    }
    return scalar(dist[op === "pdf" ? "pdf" : "cdf"](p.x, ...args));
  }
  function inference(p) {
    const s = summary(p.data);
    if (s.n < 2) throw Error("At least 2 observations required");
    const mu = scalar(p.mu),
      level = scalar(p.level);
    if (level <= 0 || level >= 1) throw Error("0 < confidence < 1");
    const isZ = p.type === "z",
      sd = isZ ? scalar(p.sd) : s.sampleSD;
    if (sd <= 0) throw Error("σ or sample SD must be positive");
    const se = sd / Math.sqrt(s.n),
      test = (s.mean - mu) / se,
      df = s.n - 1,
      cdf = isZ ? stat.normal.cdf(test, 0, 1) : stat.studentt.cdf(test, df);
    const critical = isZ
      ? stat.normal.inv((1 + level) / 2, 0, 1)
      : stat.studentt.inv((1 + level) / 2, df);
    return {
      mean: s.mean,
      n: s.n,
      statistic: test,
      df: isZ ? null : df,
      pTwoSided: 2 * Math.min(cdf, 1 - cdf),
      pLess: cdf,
      pGreater: 1 - cdf,
      confidence: level,
      lower: s.mean - critical * se,
      upper: s.mean + critical * se,
    };
  }
  function finance(p) {
    const type = p.type;
    if (type === "tvm") {
      const n = integer(p.n, 1, 12000),
        r = scalar(p.rate) / 100 / integer(p.frequency, 1, 365),
        pv = scalar(p.pv),
        fv = scalar(p.fv),
        begin = p.begin ? 1 : 0;
      if (r <= -1) throw Error("Periodic rate > -100%");
      const q = (1 + r) ** n,
        den = (r === 0 ? n : (q - 1) / r) * (1 + r * begin);
      return {
        payment: -(pv * q + fv) / den,
        futureValue: -pv * q - scalar(p.pmt) * den,
        periodicRate: r,
      };
    }
    if (type === "simple") {
      if (!(p.basis > 0)) throw Error("Year basis must be positive");
      const interest =
        (((scalar(p.pv) * scalar(p.rate)) / 100) * scalar(p.days)) /
        scalar(p.basis);
      return { interest, total: p.pv + interest };
    }
    if (type === "cash") {
      const cf = numericList(p.cash, 1000),
        r = scalar(p.rate) / 100;
      if (r <= -1) throw Error("Rate > -100%");
      const npv = cf.reduce((s, v, j) => s + v / (1 + r) ** j, 0);
      const f = (r) => cf.reduce((s, v, j) => s + v / (1 + r) ** j, 0);
      const roots = rootsBetween(f, -0.9, 10);
      return {
        NPV: npv,
        IRRPercent: roots.map((v) => 100 * v),
        IRRSearch: "-90%…1000%",
      };
    }
    if (type === "rates") {
      const k = integer(p.frequency, 1, 365),
        r = scalar(p.rate) / 100;
      if (1 + r / k <= 0 || 1 + r <= 0) throw Error("Invalid interest rate");
      return {
        effectivePercent: 100 * ((1 + r / k) ** k - 1),
        nominalPercent: 100 * k * ((1 + r) ** (1 / k) - 1),
      };
    }
    if (type === "margin") {
      const cost = scalar(p.cost),
        price = scalar(p.price);
      if (price === 0 || cost === 0)
        throw Error("Cost and price must be nonzero");
      return {
        profit: price - cost,
        marginPercent: (100 * (price - cost)) / price,
        markupPercent: (100 * (price - cost)) / cost,
      };
    }
    if (type === "days") {
      const a = Date.parse(p.start),
        b = Date.parse(p.end);
      if (!Number.isFinite(a) || !Number.isFinite(b))
        throw Error("Valid dates required");
      return { days: (b - a) / 86400000 };
    }
    if (type === "depreciation") {
      const cost = scalar(p.cost),
        salvage = scalar(p.salvage),
        life = integer(p.life, 1, 100);
      if (cost < salvage || salvage < 0) throw Error("Cost ≥ salvage ≥ 0");
      return {
        annualStraightLine: (cost - salvage) / life,
        schedule: Array.from({ length: life }, (_, j) => ({
          year: j + 1,
          depreciation: (cost - salvage) / life,
          bookValue: cost - ((j + 1) * (cost - salvage)) / life,
        })),
      };
    }
    if (type === "amortization") {
      const pv = scalar(p.pv),
        n = integer(p.n, 1, 1200),
        r = scalar(p.rate) / 100 / integer(p.frequency, 1, 365);
      if (pv <= 0 || r < 0) throw Error("Principal > 0, rate ≥ 0");
      const payment = r === 0 ? pv / n : (pv * r) / (1 - (1 + r) ** -n);
      let balance = pv;
      const schedule = [];
      for (let j = 1; j <= n; j++) {
        const interest = balance * r,
          principal = payment - interest;
        balance = Math.max(0, balance - principal);
        schedule.push({ period: j, payment, interest, principal, balance });
      }
      return { payment, totalInterest: payment * n - pv, schedule };
    }
    throw Error("Unsupported finance operation");
  }
  function graph(p) {
    const a = scalar(p.min),
      b = scalar(p.max);
    if (a >= b) throw Error("min < max");
    const count = integer(p.count ?? 900, 50, 2000),
      curves = [];
    for (const row of p.rows.filter((r) => r.expr?.trim()).slice(0, 6)) {
      const mode = row.type || "cartesian";
      const f = fn(
        row.expr,
        mode === "cartesian" || mode === "above" || mode === "below"
          ? "x"
          : "t",
        { a: p.a ?? 1 },
      );
      const g =
        mode === "parametric" ? fn(row.second, "t", { a: p.a ?? 1 }) : null;
      const points = [];
      for (let j = 0; j <= count; j++) {
        const v = a + ((b - a) * j) / count;
        try {
          const y = f(v);
          points.push(
            mode === "polar"
              ? [y * Math.cos(v * factor()), y * Math.sin(v * factor())]
              : mode === "parametric"
                ? [f(v), g(v)]
                : [v, y],
          );
        } catch {
          points.push(null);
        }
      }
      curves.push({ points, expr: row.expr, type: mode });
    }
    if (!curves.length) throw Error("Enter at least one function");
    return curves;
  }
  function analyze(p) {
    const f = fn(p.expr, "x", { a: p.a ?? 1 }),
      a = scalar(p.min),
      b = scalar(p.max);
    if (a >= b) throw Error("min < max");
    if (p.op === "roots")
      return {
        roots: rootsBetween(f, a, b),
        note: "Numerical search in the selected interval; completeness is not guaranteed.",
      };
    if (p.op === "intersections") {
      const g = fn(p.second, "x", { a: p.a ?? 1 });
      return {
        points: rootsBetween((x) => f(x) - g(x), a, b).map((x) => [x, f(x)]),
      };
    }
    if (p.op === "integral") return { integral: integrate(f, a, b) };
    if (p.op === "derivative")
      return { x: p.x, y: f(p.x), slope: derivative(f, p.x) };
    const candidates = [
      a,
      b,
      ...rootsBetween((x) => derivative(f, x), a, b),
    ].map((x) => ({ x, y: f(x) }));
    candidates.sort((a, b) => a.y - b.y);
    return { minimum: candidates[0], maximum: candidates.at(-1) };
  }
  function graph3d(p) {
    const range = scalar(p.range);
    if (range <= 0 || range > 10000) throw Error("0 < range ≤ 10000");
    const f = p.type === "surface" ? parse(p.expr) : null,
      lines = [],
      steps = 35;
    const point = (u, v) => {
      if (p.type === "sphere")
        return [
          range * Math.cos(u) * Math.sin(v),
          range * Math.sin(u) * Math.sin(v),
          range * Math.cos(v),
        ];
      if (p.type === "cylinder")
        return [range * 0.6 * Math.cos(u), range * 0.6 * Math.sin(u), v];
      return [u, v, scalar(f.evaluate({ x: u, y: v }))];
    };
    for (let axis = 0; axis < 2; axis++)
      for (let j = 0; j <= steps; j++) {
        const line = [];
        for (let k = 0; k <= steps; k++) {
          let u = -range + (2 * range * (axis ? j : k)) / steps,
            v = -range + (2 * range * (axis ? k : j)) / steps;
          if (p.type === "sphere") {
            u = (2 * Math.PI * (axis ? j : k)) / steps;
            v = (Math.PI * (axis ? k : j)) / steps;
          }
          if (p.type === "cylinder") u = (2 * Math.PI * (axis ? j : k)) / steps;
          try {
            line.push(point(u, v));
          } catch {
            line.push(null);
          }
        }
        lines.push(line);
      }
    return lines;
  }
  function table(p) {
    const a = scalar(p.start),
      b = scalar(p.end),
      step = scalar(p.step);
    if (step === 0 || (b - a) / step < 0 || Math.floor((b - a) / step) > 2000)
      throw Error("Valid step required, max 2001 rows");
    const fs = p.expressions
      .filter((v) => v.trim())
      .slice(0, 6)
      .map((s) => fn(s));
    if (!fs.length) throw Error("Enter a function");
    return Array.from(
      { length: Math.floor((b - a) / step + 1e-10) + 1 },
      (_, j) => {
        const x = a + j * step;
        return [
          x,
          ...fs.map((f) => {
            try {
              return f(x);
            } catch {
              return null;
            }
          }),
        ];
      },
    );
  }
  function recursion(p) {
    const count = integer(p.count, 1, 1000),
      code = parse(p.expr),
      prevCode = p.second ? parse(p.second) : null;
    let a = scalar(p.a0),
      b = scalar(p.b0 ?? 0);
    const result = [[0, a, ...(prevCode ? [b] : [])]];
    for (let n = 0; n < count; n++) {
      const na = scalar(code.evaluate({ n, a, b })),
        nb = prevCode ? scalar(prevCode.evaluate({ n, a, b })) : b;
      a = na;
      b = nb;
      result.push([n + 1, a, ...(prevCode ? [b] : [])]);
    }
    return result;
  }
  function spreadsheet(p) {
    const cells = p.cells;
    if (
      !Array.isArray(cells) ||
      cells.length > 40 ||
      cells.some((r) => !Array.isArray(r) || r.length > 10)
    )
      throw Error("Max 40 × 10 cells");
    const cache = new Map(),
      visiting = new Set();
    function cell(row, col) {
      const name = String.fromCharCode(65 + col) + (row + 1);
      if (cache.has(name)) return cache.get(name);
      if (visiting.has(name)) throw Error("Circular reference: " + name);
      visiting.add(name);
      let raw = String(cells[row]?.[col] ?? "").trim(),
        value = 0;
      if (raw.startsWith("=")) {
        let expr = raw
          .slice(1)
          .replace(
            /([A-J])(\d{1,2}):([A-J])(\d{1,2})/g,
            (_, c1, r1, c2, r2) => {
              const list = [];
              for (let r = Number(r1) - 1; r < Number(r2); r++)
                for (
                  let c = c1.charCodeAt(0) - 65;
                  c <= c2.charCodeAt(0) - 65;
                  c++
                ) {
                  if (list.length > 400) throw Error("Range too large");
                  list.push(cell(r, c));
                }
              return "[" + list.join(",") + "]";
            },
          );
        expr = expr.replace(/\b([A-J])(\d{1,2})\b/g, (_, c, r) => {
          const row = Number(r) - 1,
            col = c.charCodeAt(0) - 65;
          if (row >= cells.length || col >= cells[0].length || row < 0)
            throw Error("Cell outside sheet");
          return "(" + cell(row, col) + ")";
        });
        value = scalar(evaluate(expr));
      } else if (raw) {
        value = Number(raw);
        scalar(value);
      }
      visiting.delete(name);
      cache.set(name, value);
      return value;
    }
    return cells.map((r, i) => r.map((_, j) => cell(i, j)));
  }
  function geometry(p) {
    const pts = p.points;
    if (
      !Array.isArray(pts) ||
      pts.length < 2 ||
      pts.length > 100 ||
      pts.some((v) => !Array.isArray(v) || v.length !== 2)
    )
      throw Error("2…100 coordinate pairs required");
    pts.forEach((v) => v.forEach(scalar));
    let perimeter = 0,
      area = 0;
    for (let j = 0; j < pts.length; j++) {
      const a = pts[j],
        b = pts[(j + 1) % pts.length];
      perimeter += Math.hypot(a[0] - b[0], a[1] - b[1]);
      area += a[0] * b[1] - b[0] * a[1];
    }
    const a = pts[0],
      b = pts[1];
    return {
      distanceAB: Math.hypot(a[0] - b[0], a[1] - b[1]),
      midpointAB: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
      slopeAB: b[0] === a[0] ? null : (b[1] - a[1]) / (b[0] - a[0]),
      perimeter: pts.length === 2 ? perimeter / 2 : perimeter,
      area: Math.abs(area) / 2,
    };
  }
  function simulation(p) {
    integer(p.trials, 1, 100000);
    const bins = Array(p.type === "coin" ? 2 : 6).fill(0);
    for (let j = 0; j < p.trials; j++)
      bins[Math.floor(Math.random() * bins.length)]++;
    return {
      counts: bins,
      frequencies: bins.map((v) => v / p.trials),
      trials: p.trials,
    };
  }
  function execute(p) {
    angle = p.angle || "RAD";
    if (!["RAD", "DEG", "GRA"].includes(angle))
      throw Error("Invalid angle unit");
    let value;
    switch (p.task) {
      case "calculate": {
        const scope = scopeOf(p.scope);
        const result = parse(p.expr, true).evaluate(scope);
        if (typeof result === "function")
          throw Error("Use a function with parentheses");
        const next = {};
        for (const [k, v] of Object.entries(scope))
          if (/^[A-Z]$/.test(k)) next[k] = plain(v);
        let fractional = null;
        if (
          typeof result === "number" &&
          Number.isFinite(result) &&
          Math.abs(result) < 1e12
        ) {
          try {
            const f = m.fraction(result);
            if (f.d <= 1e9) fractional = f.toFraction();
          } catch {}
        }
        return {
          text: format(result, p),
          value: plain(result),
          fraction: fractional,
          variables: next,
        };
      }
      case "graph":
        value = graph(p);
        break;
      case "analyze":
        value = analyze(p);
        break;
      case "graph3d":
        value = graph3d(p);
        break;
      case "polynomial":
        value = polynomial(p.coefficients).map((v) => format(v));
        break;
      case "system": {
        const A = matrix(p.A),
          b = numericList(p.b, 20);
        if (A.length !== A[0].length || b.length !== A.length)
          throw Error(
            "Square coefficient matrix and matching constants required",
          );
        value = m.lusolve(A, b).map((v) => scalar(v[0]));
        break;
      }
      case "matrix": {
        const A = matrix(p.A);
        if (["det", "inv", "trace"].includes(p.op) && A.length !== A[0].length)
          throw Error("Square matrix required");
        if (["add", "subtract", "multiply"].includes(p.op))
          value = m[p.op](A, matrix(p.B));
        else if (p.op === "power") value = m.pow(A, integer(p.power, 0, 20));
        else value = m[p.op](A);
        value = plain(value);
        break;
      }
      case "vector": {
        const A = numericList(p.A, 20);
        value = ["dot", "cross"].includes(p.op)
          ? m[p.op](A, numericList(p.B, 20))
          : m.norm(A);
        break;
      }
      case "stats":
        value = summary(p.data);
        break;
      case "regression":
        value = regress(p.x, p.y, p.type, p.degree);
        break;
      case "inference":
        value = inference(p);
        break;
      case "distribution":
        value = distribution(p);
        break;
      case "finance":
        value = finance(p);
        break;
      case "table":
        value = table(p);
        break;
      case "recursion":
        value = recursion(p);
        break;
      case "spreadsheet":
        value = spreadsheet(p);
        break;
      case "geometry":
        value = geometry(p);
        break;
      case "simulation":
        value = simulation(p);
        break;
      case "units":
        value = m.unit(scalar(p.value), p.from).toNumber(p.to);
        break;
      case "base": {
        const s = String(p.value).trim(),
          radix = integer(p.from, 2, 36),
          target = integer(p.to, 2, 36);
        if (
          !s ||
          s.length > 32 ||
          !new RegExp(
            "^-?[" +
              "0123456789abcdefghijklmnopqrstuvwxyz".slice(0, radix) +
              "]+$",
            "i",
          ).test(s)
        )
          throw Error("Invalid digits for selected base");
        const n = parseInt(s, radix);
        if (!Number.isSafeInteger(n))
          throw Error("Integer exceeds exact range");
        value = n.toString(target).toUpperCase();
        break;
      }
      default:
        throw Error("Unknown task");
    }
    return value;
  }
  const api = {
    execute,
    integrate,
    derivative,
    rootsBetween,
    evaluate,
    format,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CGEngine = api;
})(typeof self !== "undefined" ? self : globalThis);
