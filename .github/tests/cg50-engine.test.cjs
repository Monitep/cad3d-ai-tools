const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execute: run } = require("../../cg50/engine.js");
function close(actual, expected, tol = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tol * Math.max(1, Math.abs(expected)),
    `${actual} ≠ ${expected}`,
  );
}
const calc = (expr, angle = "RAD", scope = {}) =>
  run({ task: "calculate", expr, angle, scope });

test("scientific conventions: precedence, decimal values, log bases and fractions", () => {
  close(calc("-2^2").value, -4);
  close(calc("(-2)^2").value, 4);
  close(calc("log(100)").value, 2);
  close(calc("ln(e)").value, 1);
  close(calc("log(8,2)").value, 3);
  close(calc("5!").value, 120);
  close(calc("nCr(10,3)").value, 120);
  close(calc("nPr(5,2)").value, 20);
  assert.equal(calc("2/3+1/6").fraction, "5/6");
  close(calc("gcd(18,24)+lcm(2,3)").value, 12);
});
test("DEG/RAD/GRA and inverse functions", () => {
  close(calc("sin(30)+cos(60)", "DEG").value, 1);
  close(calc("sin(pi/2)").value, 1);
  close(calc("sin(100)", "GRA").value, 1);
  close(calc("atan(1)", "DEG").value, 45);
  close(calc("acos(0)", "GRA").value, 100);
  close(calc("sinh(1)", "DEG").value, Math.sinh(1));
  const p = calc("Pol(3,4)", "DEG").value;
  close(p[0], 5);
  close(p[1], 53.130102354156);
  const r = calc("Rec(2,60)", "DEG").value;
  close(r[0], 1);
  close(r[1], Math.sqrt(3));
  close(calc("dms(-12,30,0)").value, -12.5);
});
test("complex values, arrays, bitwise and stored variables", () => {
  const c = calc("(2+3i)*(1-i)").value;
  close(c.re, 5);
  close(c.im, 1);
  close(calc("abs(3+4i)").value, 5);
  close(calc("sum([1,2,3])").value, 6);
  close(calc("bitAnd(12,10)").value, 8);
  close(calc("A+Ans", "RAD", { A: 4, Ans: 3 }).value, 7);
  assert.deepEqual(calc("A=12").variables, { A: 12 });
  const fraction = structuredClone(calc("A=fraction(1,3)"));
  assert.doesNotThrow(() => JSON.stringify(fraction));
  const saved = JSON.parse(JSON.stringify(fraction));
  close(
    calc("A+Ans", "RAD", { ...saved.variables, Ans: saved.value }).value
      .value === "2/3"
      ? 2 / 3
      : NaN,
    2 / 3,
  );
  const complexArray = structuredClone(calc("[1+i,2-i]").value);
  close(calc("re(sum(Ans))", "RAD", { Ans: complexArray }).value, 3);
});
test("numerical calculus, reversed integration and oscillatory formula", () => {
  close(calc('diff("x^3",2)').value, 12, 1e-7);
  close(calc('intg("x^2",0,3)').value, 9);
  close(calc('intg("x^2",3,0)').value, -9);
  close(calc('intg("sin(x)",0,pi)').value, 2);
  close(calc('sigma("n^2",1,10)').value, 385);
});
test("polynomials degree 2–6 and complex roots", () => {
  assert.deepEqual(run({ task: "polynomial", coefficients: "1,-3,2" }).sort(), [
    "1",
    "2",
  ]);
  const cubic = run({ task: "polynomial", coefficients: "1,-6,11,-6" }).map(
    Number,
  );
  cubic.forEach((v, j) => close(v, j + 1, 1e-6));
  assert.ok(
    run({ task: "polynomial", coefficients: "1,0,1" }).every((v) =>
      v.includes("i"),
    ),
  );
  const sextic = run({
    task: "polynomial",
    coefficients: "1,-21,175,-735,1624,-1764,720",
  }).map(Number);
  sextic.forEach((v, j) => close(v, j + 1, 1e-5));
});
test("root search finds a simple and even root, and rejects a pole", () => {
  const solve = (expr) =>
    run({ task: "analyze", op: "roots", expr, min: 0, max: 3 }).roots;
  close(solve("x^2-2")[0], Math.sqrt(2), 1e-6);
  close(solve("(x-1.2345)^2")[0], 1.2345, 1e-5);
  assert.deepEqual(solve("1/(x-1.25)"), []);
});
test("graph analysis: extrema, intersections, integrals and derivatives", () => {
  const common = { task: "analyze", expr: "x^2", min: -2, max: 3 };
  close(run({ ...common, op: "extrema" }).minimum.y, 0);
  close(run({ ...common, op: "extrema" }).maximum.y, 9);
  close(run({ ...common, op: "integral" }).integral, 35 / 3);
  close(run({ ...common, op: "derivative", x: 2 }).slope, 4, 1e-7);
  const pts = run({ ...common, op: "intersections", second: "1" }).points;
  assert.equal(pts.length, 2);
});
test("linear systems, inverses, multiplication and vector products", () => {
  assert.deepEqual(run({ task: "system", A: "[2,1;1,-1]", b: "5,1" }), [2, 1]);
  close(run({ task: "matrix", op: "det", A: "[1,2;3,4]" }), -2);
  assert.deepEqual(run({ task: "matrix", op: "inv", A: "[1,2;3,4]" }), [
    [-2, 1],
    [1.5, -0.5],
  ]);
  assert.deepEqual(
    run({ task: "matrix", op: "power", A: "[1,2;3,4]", power: 2 }),
    [
      [7, 10],
      [15, 22],
    ],
  );
  close(run({ task: "vector", op: "dot", A: "1,2,3", B: "4,5,6" }), 32);
  assert.deepEqual(
    run({ task: "vector", op: "cross", A: "1,2,3", B: "4,5,6" }),
    [-3, 6, -3],
  );
});
test("statistics and transformed regressions", () => {
  const s = run({ task: "stats", data: "2,4,4,4,5,5,7,9" });
  close(s.mean, 5);
  close(s.sigma, 2);
  close(s.sampleSD, Math.sqrt(32 / 7));
  close(
    run({ task: "regression", type: "linear", x: "1,2,3", y: "2,4,6" }).R2,
    1,
  );
  const p = run({
    task: "regression",
    type: "polynomial",
    degree: 2,
    x: "-2,-1,0,1,2",
    y: "4,1,0,1,4",
  });
  close(p.coefficients[2], 1);
  close(p.R2, 1);
  const power = run({
    task: "regression",
    type: "power",
    x: "1,2,3",
    y: "2,8,18",
  });
  close(power.R2, 1);
});
test("Z/t tests and confidence intervals", () => {
  const z = run({
    task: "inference",
    type: "z",
    data: "1,2,3,4,5",
    mu: 3,
    sd: 2,
    level: 0.95,
  });
  close(z.statistic, 0);
  close(z.pTwoSided, 1);
  close((z.lower + z.upper) / 2, 3);
  const t = run({
    task: "inference",
    type: "t",
    data: "1,2,3,4,5",
    mu: 3,
    level: 0.95,
  });
  assert.equal(t.df, 4);
  close(t.pTwoSided, 1);
  assert.ok(t.lower < t.upper);
});
test("distributions: normal, binomial, Poisson, geometric, t, chi-square, F", () => {
  close(
    run({
      task: "distribution",
      type: "normal",
      op: "cdf",
      x: 0,
      mu: 0,
      sd: 1,
    }),
    0.5,
  );
  close(
    run({
      task: "distribution",
      type: "normal",
      op: "inv",
      x: 0.975,
      mu: 0,
      sd: 1,
    }),
    1.95996398454,
    1e-6,
  );
  close(
    run({
      task: "distribution",
      type: "binomial",
      op: "pdf",
      x: 3,
      n: 10,
      p: 0.5,
    }),
    0.1171875,
  );
  close(
    run({
      task: "distribution",
      type: "binomial",
      op: "range",
      x: 0,
      upper: 10,
      n: 10,
      p: 0.5,
    }),
    1,
  );
  close(
    run({ task: "distribution", type: "poisson", op: "pdf", x: 0, lambda: 3 }),
    Math.exp(-3),
  );
  close(
    run({ task: "distribution", type: "geometric", op: "pdf", x: 3, p: 0.5 }),
    0.125,
  );
  close(run({ task: "distribution", type: "t", op: "cdf", x: 0, df: 10 }), 0.5);
  close(
    run({ task: "distribution", type: "chi2", op: "cdf", x: 2, df: 2 }),
    1 - Math.exp(-1),
    1e-6,
  );
  close(
    run({ task: "distribution", type: "f", op: "cdf", x: 1, df: 10, df2: 10 }),
    0.5,
    1e-6,
  );
});
test("finance: TVM sign conventions, zero rate, amortization and cash flow", () => {
  const base = {
    task: "finance",
    type: "tvm",
    pv: 100000,
    fv: 0,
    pmt: 0,
    n: 240,
    rate: 3.5,
    frequency: 12,
  };
  close(run(base).payment, -579.9597179830918);
  close(run({ ...base, rate: 0 }).payment, -100000 / 240);
  const a = run({ ...base, type: "amortization" });
  close(a.schedule.at(-1).balance, 0, 1e-7);
  close(
    a.schedule.reduce((s, v) => s + v.principal, 0),
    100000,
    1e-7,
  );
  const cash = run({
    task: "finance",
    type: "cash",
    cash: "-100,110",
    rate: 10,
  });
  close(cash.NPV, 0);
  close(cash.IRRPercent[0], 10, 1e-7);
  close(
    run({
      task: "finance",
      type: "simple",
      pv: 1000,
      rate: 5,
      days: 365,
      basis: 365,
    }).interest,
    50,
  );
  close(
    run({ task: "finance", type: "margin", cost: 100, price: 150 })
      .marginPercent,
    100 / 3,
  );
  close(
    run({ task: "finance", type: "rates", rate: 12, frequency: 12 })
      .effectivePercent,
    12.6825030132,
    1e-7,
  );
  assert.equal(
    run({
      task: "finance",
      type: "days",
      start: "2024-02-28",
      end: "2024-03-01",
    }).days,
    2,
  );
});
test("tables, simultaneous recurrence and graph sampling", () => {
  assert.deepEqual(
    run({ task: "table", expressions: ["x^2"], start: 2, end: 0, step: -1 }),
    [
      [2, 4],
      [1, 1],
      [0, 0],
    ],
  );
  const fib = run({
    task: "recursion",
    expr: "a+b",
    second: "a",
    a0: 0,
    b0: 1,
    count: 10,
  });
  assert.equal(fib[10][1], 55);
  const cart = run({
    task: "graph",
    rows: [{ expr: "x^2" }],
    min: -2,
    max: 2,
    count: 100,
  });
  assert.equal(cart[0].points.length, 101);
  const polar = run({
    task: "graph",
    rows: [{ expr: "2", type: "polar" }],
    min: 0,
    max: Math.PI * 2,
    count: 100,
  });
  close(polar[0].points[0][0], 2);
  assert.equal(
    run({ task: "graph3d", type: "surface", expr: "x+y", range: 2 }).length,
    72,
  );
});
test("geometry, conversions including hectares, and base validation", () => {
  const g = run({
    task: "geometry",
    points: [
      [0, 0],
      [4, 0],
      [4, 3],
    ],
  });
  close(g.area, 6);
  close(g.perimeter, 12);
  close(run({ task: "units", value: 1, from: "m", to: "cm" }), 100);
  close(run({ task: "units", value: 1, from: "ha", to: "m^2" }), 10000);
  close(run({ task: "units", value: 0, from: "degC", to: "degF" }), 32);
  assert.equal(run({ task: "base", value: "255", from: 10, to: 16 }), "FF");
  assert.throws(() => run({ task: "base", value: "102", from: 2, to: 10 }));
});
test("spreadsheet chains, ranges, empty cells and cycle detection", () => {
  assert.deepEqual(
    run({
      task: "spreadsheet",
      cells: [
        ["1", "2", "=A1+B1"],
        ["3", "4", "=sum(A1:B2)"],
      ],
    }),
    [
      [1, 2, 3],
      [3, 4, 10],
    ],
  );
  assert.throws(
    () => run({ task: "spreadsheet", cells: [["=B1", "=A1"]] }),
    /Circular/,
  );
  assert.throws(
    () => run({ task: "spreadsheet", cells: [["=A99"]] }),
    /outside/,
  );
});
test("simulation preserves trial count", () => {
  const s = run({ task: "simulation", type: "dice", trials: 1000 });
  assert.equal(
    s.counts.reduce((a, b) => a + b),
    1000,
  );
  close(
    s.frequencies.reduce((a, b) => a + b),
    1,
  );
});
test("input validation and expression sandbox", () => {
  for (const expr of [
    'import("x")',
    'evaluate("2+2")',
    'createUnit("x")',
    "A[1]",
    "x=2",
    "sin",
    "1/0",
    "A=(()=>{})",
  ])
    assert.throws(() => calc(expr));
  assert.throws(() => run({ task: "matrix", op: "inv", A: "[1,2;2,4]" }));
  assert.throws(() =>
    run({ task: "table", expressions: ["x"], start: 0, end: 100000, step: 1 }),
  );
  assert.throws(() =>
    run({
      task: "distribution",
      type: "normal",
      op: "cdf",
      x: 0,
      mu: 0,
      sd: 0,
    }),
  );
  assert.throws(() =>
    run({
      task: "finance",
      type: "simple",
      pv: 100,
      rate: 5,
      days: 10,
      basis: 0,
    }),
  );
  assert.throws(() => calc("ones(100000000,100000000)"));
  assert.throws(() => calc("random([10000000])"));
  assert.throws(() => calc("randomInt([10000000])"));
  assert.equal(calc("randomInt(1,2)").value, 1);
  assert.throws(() => calc("[1/0]"));
  assert.throws(() => calc("factorial(10000000)"));
});
