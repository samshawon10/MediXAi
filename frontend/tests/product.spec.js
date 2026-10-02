const { test, expect } = require("@playwright/test");
const fs = require("node:fs/promises");
const { signIn, acceptStorageConsent, deleteAnalysis } = require("./auth");

async function analyze(page) {
  await signIn(page);
  await page.goto("/symptoms");
  await page.getByLabel("Enter your symptoms").fill("fever, cough, headache");
  await acceptStorageConsent(page);
  const response = page.waitForResponse(r => r.url().endsWith("/api/analyze"));
  await page.getByRole("button", { name: "Check My Symptoms", exact: true }).click();
  return (await response).json();
}

test("interactive preview never presents or requests a prediction", async ({ page }) => {
  const requests = [];
  page.on("request", r => { if (r.url().includes("/api/analyze")) requests.push(r.url()); });
  await page.goto("/");
  await page.getByLabel("Example description").fill("fever");
  await page.getByRole("button", { name: "Preview the workflow" }).click();
  await expect(page.getByText("Interface preview only. No prediction, probability or risk estimate is generated here.")).toBeVisible();
  expect(requests).toEqual([]);
});

test("free text, optional structured entry, counts and clear", async ({ page }) => {
  await page.goto("/symptoms");
  const input = page.getByLabel("Enter your symptoms");
  await input.fill("fever"); await input.press("Enter"); await input.press("c");
  await expect(input).toHaveValue("fever\nc");
  await page.getByText("Add symptoms individually", { exact: false }).click();
  await page.getByLabel("Search symptom examples").fill("head");
  await page.getByRole("button", { name: "headache", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove headache" })).toBeVisible();
  await page.getByRole("button", { name: "Clear all symptoms" }).click();
  await expect(input).toHaveValue("");
  await expect(page.locator("#symptom-count")).toHaveText("0 / 2000 characters");
});

test("risk failure preserves model output and report remains available", async ({ page }) => {
  await page.route("**/api/analyze", async route => {
    const response = await route.fetch(), body = await response.json();
    body.risk = { available: false, level: "UNAVAILABLE", score: null, urgent: false, reasons: [], guidance: "Emergency risk assessment is unavailable.", limitation: "Cannot rule out an emergency." };
    await route.fulfill({ response, json: body });
  });
  const result = await analyze(page);
  await expect(page.locator(".check-match h2")).toBeVisible();
  await expect(page.locator(".check-risk")).toContainText("The warning check is unavailable.");
  await expect(page.getByRole("button", { name: "Download Analysis Report" })).toBeVisible();
  await deleteAnalysis(page, result.analysisId);
});

test("malformed response is actionable and retry recovers", async ({ page }) => {
  await signIn(page);
  let analysisId;
  await page.route("**/api/analyze", async route => {
    const response = await route.fetch();
    analysisId = (await response.json()).analysisId;
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"success":true}' });
  });
  await analyze(page);
  await expect(page.getByText("The service returned an incomplete or invalid response. Please retry in a moment.")).toBeVisible();
  await page.unroute("**/api/analyze");
  const retryResponse = page.waitForResponse(r => r.url().endsWith("/api/analyze"));
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator(".check-match h2")).toBeVisible();
  const retryResult = await (await retryResponse).json();
  await deleteAnalysis(page, analysisId);
  await deleteAnalysis(page, retryResult.analysisId);
});

test("report prints the actual result and supports Bangla", async ({ page }) => {
  const result = await analyze(page);
  await page.evaluate(() => { window.print = () => { window.__printed = true; }; });
  await page.getByRole("button", { name: "Download Analysis Report" }).click();
  expect(await page.evaluate(() => window.__printed)).toBe(true);
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("article", { name: "MediXAI AI Analysis Report" })).toBeVisible();
  await expect(page.locator(".print-report")).toContainText(result.prediction.condition);
  await expect(page.locator(".print-report")).toContainText(result.input.symptoms);
  await expect(page.locator(".print-report")).toContainText("This is an AI-generated decision-support report and is not a medical diagnosis.");
  await expect(page.locator(".nav")).toBeHidden();
  await fs.mkdir("../reports/figures", { recursive: true });
  await page.pdf({ path: "../reports/figures/analysis-report-en.pdf", format: "A4", printBackground: true });
  await page.emulateMedia({ media: "screen" });
  await page.getByLabel("Display language").selectOption("bn");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-report h1")).toHaveText("MediXAI এআই বিশ্লেষণ প্রতিবেদন");
  await page.pdf({ path: "../reports/figures/analysis-report-bn.pdf", format: "A4", printBackground: true });
  await deleteAnalysis(page, result.analysisId);
});

test("voice transcription requires explicit review and never auto-submits", async ({ page }) => {
  await page.addInitScript(() => {
    window.SpeechRecognition = class {
      start() { const result = [{ transcript: "fever and cough" }]; result.isFinal = true; this.onresult({ results: [result] }); this.onend(); }
      stop() { this.onend(); } abort() {}
    };
  });
  let submitted = false;
  page.on("request", r => { if (r.url().endsWith("/api/analyze")) submitted = true; });
  await page.goto("/symptoms");
  await page.getByRole("button", { name: "Use voice input" }).click();
  await expect(page.getByLabel("Enter your symptoms")).toHaveValue("fever and cough");
  expect(submitted).toBe(false);
});

test("performance uses real verified values and handles outage with retry", async ({ page }) => {
  await page.route("**/api/model-info", route => route.abort());
  await page.goto("/performance");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await page.unroute("**/api/model-info");
  const response = page.waitForResponse(r => r.url().endsWith("/api/model-info"));
  await page.getByRole("button", { name: "Try again" }).click();
  const data = await (await response).json();
  expect(data.research.evaluation.accuracy).toBe(0.0342);
  await expect(page.locator(".metric").first()).toContainText("3.42%");
  await page.getByText("Confusion matrix", { exact: true }).click();
  await expect(page.locator(".matrix-scroll tbody tr")).toHaveCount(data.classes);
});

test("all routes fit target widths in both themes, with no runtime errors", async ({ page }) => {
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  for (const route of ["/", "/symptoms", "/how-it-works", "/transparency", "/performance", "/about", "/privacy", "/disclaimer", "/contact"]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    for (const theme of ["light", "dark"]) {
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      for (const width of [320, 375, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} ${theme} ${width}`).toBeTruthy();
      }
    }
  }
  expect(errors).toEqual([]);
  await page.goto("/");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });
  await page.screenshot({ path: "../reports/figures/product-home-desktop.png", fullPage: true, animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await page.screenshot({ path: "../reports/figures/product-home-mobile-dark.png", fullPage: true, animations: "disabled" });
});

test("mobile menu closes with Escape and returns focus", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 }); await page.goto("/");
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page.getByRole("navigation", { name: "Mobile", exact: true }).getByRole("link", { name: "AI Transparency" }).focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open navigation menu" })).toBeFocused();
  await expect(page.getByRole("navigation", { name: "Mobile", exact: true })).toHaveCount(0);
});
