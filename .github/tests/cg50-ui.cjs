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
    // Real touch events: keypad actions must never focus the editable field,
    // which would summon the native keyboard on Android/iOS. Headless browsers
    // cannot display an OS keyboard, so also track transient focus events.
    const phone = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    phone.on("pageerror", (e) => errors.push(e.message));
    await phone.goto(base);
    await phone.waitForSelector("#expression");
    const expr = phone.locator("#expression");
    await phone.evaluate(() => {
      window.expressionFocusCount = 0;
      document.querySelector("#expression").addEventListener("focus", () => {
        window.expressionFocusCount++;
      });
    });
    const tapWithoutKeyboard = async (selector) => {
      const before = await phone.evaluate(() => window.expressionFocusCount);
      await phone.locator(selector).tap();
      assert.equal(
        await phone.evaluate(() => window.expressionFocusCount),
        before,
        `${selector}: unexpectedly focused the expression`,
      );
      assert.equal(
        await expr.evaluate((el) => document.activeElement === el),
        false,
      );
    };
    const key = (value) => tapWithoutKeyboard(`[data-key="${value}"]`);
    await key("clear");
    for (const value of ["7", "*", "8", "execute"]) await key(value);
    await phone.waitForFunction(
      () => document.querySelector("#calc-result").textContent === "56",
    );
    for (const value of ["+", "2", "execute"]) await key(value);
    await phone.waitForFunction(
      () => document.querySelector("#calc-result").textContent === "58",
    );
    await key("clear");
    for (const value of ["1", "2", "3", "left", "9"]) await key(value);
    assert.equal(await expr.inputValue(), "1293");
    await key("delete");
    assert.equal(await expr.inputValue(), "123");
    await key("right");
    await key("4");
    assert.equal(await expr.inputValue(), "1234");
    await expr.evaluate((el) => el.setSelectionRange(1, 3));
    await key("delete");
    assert.equal(await expr.inputValue(), "14");
    await key("9");
    assert.equal(await expr.inputValue(), "194");
    await expr.evaluate((el) => el.setSelectionRange(1, 2));
    await key("8");
    assert.equal(await expr.inputValue(), "184");
    await key("clear");
    await key("shift");
    await key("sin(");
    assert.equal(await expr.inputValue(), "asin(");
    await key("catalog");
    await tapWithoutKeyboard('[data-insert="gcd("]');
    assert.equal(await expr.inputValue(), "asin(gcd(");
    await key("catalog");
    await tapWithoutKeyboard('[data-demo="trig"]');
    await phone.waitForFunction(
      () => document.querySelector("#calc-result").textContent === "1",
    );
    await tapWithoutKeyboard('[data-history="0"]');
    // Native typing remains opt-in by directly tapping the expression.
    await expr.tap();
    assert.equal(
      await expr.evaluate((el) => document.activeElement === el),
      true,
    );
    await expr.fill("2+3");
    await expr.press("Enter");
    await phone.waitForFunction(
      () => document.querySelector("#calc-result").textContent === "5",
    );
    // Return from native typing to the keypad without reopening the field.
    await key("clear");
    await key("6");
    assert.equal(await expr.inputValue(), "6");
    // Fit the entire keypad to actual visible space, without shrinking touch targets.
    const visibleKeys = async (fullyVisible = true) => {
      const geometry = await phone.evaluate(() => {
        return [...document.querySelectorAll("[data-key]")].map((el) => {
          const r = el.getBoundingClientRect();
          return {
            key: el.dataset.key,
            w: r.width,
            h: r.height,
            top: r.top,
            bottom: r.bottom,
            left: r.left,
            right: r.right,
            visible: el.contains(
              document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
            ),
          };
        });
      });
      for (const r of geometry) {
        assert.ok(r.w >= 44 && r.h >= 44, `${r.key}: touch target too small`);
        if (fullyVisible) {
          assert.ok(
            r.top >= 0 && r.bottom <= phone.viewportSize().height,
            `${r.key}: outside viewport`,
          );
          assert.ok(r.visible, `${r.key}: covered`);
        }
      }
      assert.equal(
        await phone.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
    };
    for (const [width, height] of [
      [384, 740],
      [390, 740],
      [412, 780],
      [360, 720],
      [320, 720],
    ]) {
      await phone.setViewportSize({ width, height });
      await phone.evaluate(() => scrollTo(0, 0));
      await phone.waitForTimeout(120);
      await visibleKeys();
    }
    await phone.locator("#expression").fill("7855555555555*5855958818");
    await phone.locator("#expression").press("Enter");
    await phone.waitForFunction(
      () =>
        document.querySelector("#calc-result").textContent ===
        "4.60018098258e+22",
    );
    await phone.waitForTimeout(100);
    const resultBox = await phone.locator("#calc-result").evaluate((el) => ({
      fits: el.scrollWidth <= el.clientWidth,
      font: parseFloat(getComputedStyle(el).fontSize),
      lines: getComputedStyle(el).whiteSpace,
    }));
    assert.equal(resultBox.fits, true, "Long exponent is clipped");
    assert.equal(resultBox.lines, "nowrap");
    assert.ok(resultBox.font >= 16);
    await visibleKeys();
    await phone.setViewportSize({ width: 384, height: 640 });
    await phone.locator("#calc-focus").tap();
    await phone.waitForTimeout(120);
    await visibleKeys();
    assert.equal(
      await phone.locator(".topbar").evaluate((el) => el.inert),
      true,
    );
    // Browser toolbar and keyboard changes are independent of the layout viewport.
    await phone.setViewportSize({ width: 390, height: 740 });
    await phone.evaluate(() => {
      window.testVisibleHeight = 680;
      window.testViewportScale = 1;
      Object.defineProperty(visualViewport, "height", {
        configurable: true,
        get: () => window.testVisibleHeight,
      });
      Object.defineProperty(visualViewport, "scale", {
        configurable: true,
        get: () => window.testViewportScale,
      });
      visualViewport.dispatchEvent(new Event("resize"));
    });
    await phone.waitForTimeout(100);
    assert.ok(
      await phone
        .locator(".calculator")
        .evaluate((el) => el.getBoundingClientRect().bottom <= 680),
    );
    const stableHeight = await phone
      .locator(".calculator")
      .evaluate((el) => el.getBoundingClientRect().height);
    await phone.locator("#expression").tap();
    await phone.evaluate(() => {
      window.testVisibleHeight = 320;
      visualViewport.dispatchEvent(new Event("resize"));
    });
    assert.equal(
      await phone
        .locator(".calculator")
        .evaluate((el) => el.getBoundingClientRect().height),
      stableHeight,
      "Typing shrinks all calculator keys",
    );
    assert.equal(
      await phone.locator("#calc-stage").evaluate((el) => el.clientHeight),
      320,
    );
    await phone.evaluate(() => {
      window.testViewportScale = 2;
      window.testVisibleHeight = 160;
      visualViewport.dispatchEvent(new Event("resize"));
    });
    assert.equal(
      await phone.locator("#calc-stage").evaluate((el) => el.clientHeight),
      320,
      "Pinch zoom resized the UI",
    );
    await phone.evaluate(() => {
      delete visualViewport.height;
      delete visualViewport.scale;
      document.querySelector("#expression").blur();
      visualViewport.dispatchEvent(new Event("resize"));
    });
    await phone.locator('[data-key="catalog"]').tap();
    await phone.locator('[data-insert="gcd("]').tap();
    await phone.locator("#close-catalog").tap();
    assert.equal(await phone.locator("#catalog-panel").isVisible(), false);
    assert.equal(
      await phone
        .locator("#expression")
        .evaluate((el) => el === document.activeElement),
      false,
    );
    await visibleKeys();
    for (const [width, height] of [
      [844, 390],
      [740, 360],
      [932, 430],
    ]) {
      await phone.setViewportSize({ width, height });
      await phone.waitForTimeout(120);
      await visibleKeys();
      const seven = await phone.locator('[data-key="7"]').boundingBox();
      const four = await phone.locator('[data-key="4"]').boundingBox();
      const shiftKey = await phone.locator('[data-key="shift"]').boundingBox();
      assert.equal(seven.y, shiftKey.y);
      assert.ok(
        seven.x > shiftKey.x && four.y > seven.y,
        "Landscape changed numeric-pad order",
      );
    }
    await phone.setViewportSize({ width: 320, height: 568 });
    await phone.waitForTimeout(120);
    await visibleKeys(false);
    await phone.locator('[data-key="execute"]').tap();
    assert.equal(
      await phone
        .locator("#expression")
        .evaluate((el) => el === document.activeElement),
      false,
    );
    await phone.locator("#calc-focus").tap();
    assert.equal(
      await phone.locator(".topbar").evaluate((el) => el.inert),
      false,
    );
    assert.equal(
      await phone
        .locator("body")
        .evaluate((el) => el.classList.contains("calc-focus")),
      false,
    );
    await phone.locator("#menu").tap();
    await phone.locator('nav [data-mode="graph"]').tap();
    assert.equal(await phone.locator("#graph-angle").isVisible(), true);
    assert.equal(
      await phone
        .locator("body")
        .evaluate((el) => el.classList.contains("calc-compact")),
      false,
    );
    await phone.close();
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
    await page.locator("#expression").fill("fraction(1,3)");
    await page.locator("#expression").press("Enter");
    await page.waitForFunction(() =>
      document.querySelector("#calc-result").textContent.startsWith("0.3333"),
    );
    await page.reload();
    await page.locator("#expression").fill("Ans+fraction(1,3)");
    await page.locator("#expression").press("Enter");
    await page.waitForFunction(() =>
      document.querySelector("#calc-result").textContent.startsWith("0.6666"),
    );
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
    await page.locator("#graph-angle").selectOption("DEG");
    await page.waitForFunction(
      () =>
        document.querySelector("#legend .mode-badge")?.textContent === "DEG",
    );
    await page.locator("#oscillation-example").click();
    await page.waitForFunction(
      () =>
        document.querySelector("#chart")?.getAttribute("aria-label") ===
        "Graph in RAD: sin(1/x)",
    );
    assert.equal(await field("f1").inputValue(), "sin(1/x)");
    assert.equal(await field("min").inputValue(), "-1");
    assert.equal(await field("max").inputValue(), "1");
    assert.equal(
      await page
        .locator(".graph-plot")
        .evaluate(
          (el) =>
            el.querySelector(".chart-tip").getBoundingClientRect().top >=
            el.querySelector("canvas").getBoundingClientRect().bottom,
        ),
      true,
      "Graph instructions cover the plot",
    );
    assert.equal(await page.locator("#graph-warning").isVisible(), true);
    await field("min").fill("0.005");
    await field("max").fill("0.015");
    await submit();
    assert.equal(await page.locator("#graph-warning").isVisible(), false);
    await page.locator("#graph-angle").selectOption("GRA");
    await page.waitForFunction(
      () =>
        document.querySelector("#legend .mode-badge")?.textContent === "GRA",
    );
    await navigate("calc");
    assert.equal(await page.locator("#angle").inputValue(), "GRA");
    await page.reload();
    assert.equal(await page.locator("#angle").inputValue(), "GRA");
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
        if (m === "calc") {
          assert.equal(
            await page
              .locator(".keys")
              .evaluate((el) =>
                [...el.querySelectorAll("button")].every(
                  (key) => key.scrollWidth <= key.clientWidth,
                ),
              ),
            true,
            `Key text overflows at ${width}`,
          );
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await navigate("calc");
    assert.equal(
      await page
        .locator('[data-key="sin("]')
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      15,
    );
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
      "Browser checks passed: touch keypad without expression focus, opt-in native typing, cursor editing, calculation, memory, persistence, errors, modes, language, theme, help, 320/390/768/1440 px layouts, visible-viewport fit, long exponents, expanded view, landscape numeric-pad order and small-window scrolling.",
    );
  } finally {
    await browser.close();
  }
};
run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
