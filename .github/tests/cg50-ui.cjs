/* Browser regression checks. Install Playwright, then pass CG50_URL if needed. */
const assert = require("node:assert/strict");
const { chromium } = require(
  process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
    ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + "/playwright"
    : "playwright",
);
const base = process.env.CG50_URL || "http://127.0.0.1:8765/cg50/";
const executablePath = process.env.CG50_CHROMIUM;
const run = async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(base);
    await page.waitForSelector("#expression");
    const navigate = async (mode) => {
      if (await page.locator("#menu").isVisible())
        await page.locator("#menu").click();
      await page.locator('nav [data-mode="' + mode + '"]').click();
    };
    const field = (k) => page.locator('[data-field="' + k + '"]');
    const submit = async () => {
      await page.locator("#run").click();
      await page.waitForFunction(
        () => !document.querySelector("#run")?.disabled,
      );
    };
    await page.locator("#expression").fill("sin(30)+cos(60)");
    await page.locator("#expression").press("Enter");
    await page.waitForFunction(
      () => document.querySelector("#calc-result").textContent === "1",
    );
    await page.locator("#store-A").click();
    await page.waitForTimeout(100);
    await page.locator("#expression").fill("A*2");
    await page.locator("#expression").press("Enter");
    await page.waitForFunction(
      () => document.querySelector("#calc-result").textContent === "2",
    );
    await page.locator("#expression").fill("2/3+1/6");
    await page.locator("#expression").press("Enter");
    await page.waitForFunction(() =>
      document.querySelector("#calc-result").textContent.startsWith("0.8333"),
    );
    await page.locator("#fraction-toggle").click();
    assert.equal(await page.locator("#calc-result").textContent(), "5/6");
    const historyCount = await page.locator(".history-item").count();
    await page.reload();
    assert.equal(await page.locator(".history-item").count(), historyCount);
    await page.locator("#expression").fill('import("bad")');
    await page.locator("#expression").press("Enter");
    await page.waitForSelector("#calc-result.error");
    await navigate("equations");
    await field("type").selectOption("system");
    await submit();
    assert.match(await page.locator("#output").textContent(), /2.*1/);
    await field("A").fill("[1,2;2,4]");
    await submit();
    assert.equal(await page.locator(".error-box").count(), 1);
    await navigate("matrix");
    await submit();
    assert.equal(await page.locator("#output").textContent(), "-2");
    await navigate("stats");
    await submit();
    assert.match(await page.locator("#output").textContent(), /Media5/);
    await field("type").selectOption("regression");
    await field("x").fill("1,2,3");
    await field("y").fill("2,4,6");
    await submit();
    assert.match(await page.locator("#output").textContent(), /R2.*1/);
    await page.locator("#language").click();
    await submit();
    assert.match(await page.locator("h1").textContent(), /Statistics/);
    await field("type").selectOption("summary");
    await submit();
    assert.match(await page.locator("#output").textContent(), /Mean5/);
    assert.doesNotMatch(await page.locator("#output").textContent(), /Media5/);
    await navigate("distribution");
    await submit();
    assert.match(await page.locator("#output").textContent(), /0.975002/);
    await field("type").selectOption("normal");
    await field("op").selectOption("inv");
    await field("type").selectOption("geometric");
    assert.equal(await field("op").inputValue(), "pdf");
    await field("x").fill("3");
    await submit();
    assert.match(await page.locator("#output").textContent(), /0.125/);
    await navigate("finance");
    await field("type").selectOption("amortization");
    await submit();
    assert.equal(await page.locator("#output tbody tr").count(), 240);
    await field("type").selectOption("days");
    await submit();
    assert.match(await page.locator("#output").textContent(), /364/);
    await navigate("table");
    await submit();
    assert.equal(await page.locator("#output tbody tr").count(), 11);
    await navigate("recursion");
    await submit();
    assert.equal(await page.locator("#output tbody tr").count(), 16);
    await navigate("units");
    await field("category").selectOption("area");
    await field("from").selectOption("ha");
    await field("to").selectOption("m^2");
    await submit();
    assert.match(await page.locator("#output").textContent(), /10,000/);
    await navigate("sheet");
    await submit();
    assert.equal(
      await page.locator('[data-cell-result="2,2"]').textContent(),
      "15",
    );
    await page.locator('[data-cell="0,0"]').fill("=B1");
    await page.locator('[data-cell="0,1"]').fill("=A1");
    await submit();
    assert.match(
      await page.locator("#output").textContent(),
      /Circular reference/,
    );
    await navigate("simulation");
    await submit();
    assert.equal(await page.locator("#output tbody tr").count(), 6);
    await navigate("graph");
    await field("f1").fill("x^2-4");
    await field("f2").fill("");
    await submit();
    await page.locator("#analyze").click();
    await page.waitForTimeout(250);
    assert.match(await page.locator("#output").textContent(), /-2,2/);
    await navigate("graph3d");
    await field("type").selectOption("sphere");
    await submit();
    assert.equal(await page.locator(".error-box").count(), 0);
    await navigate("geometry");
    await submit();
    assert.match(await page.locator("#output").textContent(), /Area6/);
    await page.locator("#help").click();
    assert.equal(await page.locator("#help-content details").count(), 21);
    await page.locator("#help-search").fill("CPython");
    assert.ok((await page.locator("#help-content details").count()) > 0);
    await page.locator("#close-help").click();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const m of [
        "calc",
        "graph",
        "graph3d",
        "matrix",
        "stats",
        "distribution",
        "finance",
        "table",
        "recursion",
        "conic",
        "geometry",
        "units",
        "sheet",
        "simulation",
        "python",
        "notes",
      ]) {
        await navigate(m);
        await page.waitForTimeout(60);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `${m}: horizontal overflow at ${width}`,
        );
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await navigate("calc");
    await page.locator("#theme").click();
    assert.equal(await page.locator("body.dark").count(), 1);
    await navigate("notes");
    await field("text").fill("<img src=x onerror=alert(1)>");
    await navigate("calc");
    await navigate("notes");
    assert.equal(
      await field("text").inputValue(),
      "<img src=x onerror=alert(1)>",
    );
    assert.equal(await page.locator("#content img").count(), 0);
    assert.deepEqual(errors, []);
    console.log(
      "Browser checks passed: calculation, memory, persistence, errors, modes, language, theme, help, 320/390/768/1440 px layouts.",
    );
  } finally {
    await browser.close();
  }
};
run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
