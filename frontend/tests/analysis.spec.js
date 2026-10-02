const { test, expect } = require("@playwright/test");
const fs = require("node:fs/promises");
const path = require("node:path");
const { signIn, acceptStorageConsent, deleteAnalysis } = require("./auth");

async function submit(page, text) {
  await acceptStorageConsent(page);
  await page.getByLabel("Enter your symptoms").fill(text);
  const response = Promise.race([
    page.waitForResponse(r => r.url().endsWith("/api/analyze")).then(r => r.json()),
    page.waitForEvent("requestfailed", { predicate: r => r.url().endsWith("/api/analyze") }).then(() => null),
  ]);
  await page.getByRole("button", { name: "Check My Symptoms", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your Results", exact: true })).toBeVisible();
  return response;
}

async function screenshotPath(filename) {
  const outputDir = process.env.E2E_ARTIFACT_DIR || "../reports/figures";
  await fs.mkdir(outputDir, { recursive: true });
  return path.join(outputDir, filename);
}

test("live English flow, actual loading, SHAP and results", async ({ page }) => {
  await signIn(page);
  await page.route("**/api/analyze", async (route) => { await new Promise(resolve => setTimeout(resolve, 500)); await route.continue(); });
  await page.goto("/symptoms");
  await page.getByLabel("Enter your symptoms").fill("I have fever, headache and body pain");
  await acceptStorageConsent(page);
  const responsePromise = page.waitForResponse(r => r.url().endsWith("/api/analyze"));
  await page.getByRole("button", { name: "Check My Symptoms", exact: true }).click();
  await expect(page.getByRole("status", { name: "Analysis in progress" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Analyzing…" })).toBeDisabled();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const payload = await response.json();
  expect(payload.normalizedSymptoms).toEqual(["fever", "headache", "muscle pain"]);
  await expect(page.locator(".check-match h2")).toHaveText(payload.finalPrediction?.condition || payload.prediction.condition);
  await page.getByText("View detailed AI explanation", { exact: true }).click();
  await expect(page.locator(".shap-chart li")).toHaveCount(payload.explanation.features.length);
  await expect(page.locator(".check-risk")).toContainText("This does not mean you are safe");
  await expect(page.getByRole("heading", { name: "Your Results", exact: true })).toBeFocused();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: await screenshotPath("phase2-desktop.png"), fullPage: true });
  await deleteAnalysis(page, payload.analysisId);
});

test("Bangla and typed symptoms alongside existing chips", async ({ page }) => {
  await signIn(page);
  await page.goto("/symptoms");
  await page.getByRole("button", { name: "বাংলা", exact: true }).click();
  await page.getByRole("button", { name: "+ জ্বর", exact: true }).click();
  const response = page.waitForResponse(r => r.url().endsWith("/api/analyze"));
  await submit(page, "কাশি, মাথা ব্যথা");
  const payload = await (await response).json();
  expect(payload.normalizedSymptoms).toEqual(["fever", "cough", "headache"]);
  expect(payload.input.language).toBe("bn");
  await expect(page.locator(".check-match h2")).toHaveText(payload.finalPrediction?.condition || payload.prediction.condition);
  await deleteAnalysis(page, payload.analysisId);
});

test("validation, API outage, and emergency guidance on model rejection", async ({ page }) => {
  await signIn(page);
  await page.goto("/symptoms");
  await page.getByRole("button", { name: "Check My Symptoms", exact: true }).click();
  await expect(page.getByText("Please enter at least one symptom.")).toBeVisible();
  await submit(page, "blue lips");
  await expect(page.locator(".risk-level")).toHaveText("CRITICAL");
  await expect(page.locator(".risk-guidance")).toContainText("Seek immediate professional medical assistance");
  await expect(page.getByRole("heading", { name: "Analysis unavailable" })).toBeVisible();
  await page.goto("/symptoms");
  await page.route("**/api/analyze", route => route.abort());
  await submit(page, "fever");
  await expect(page.getByText("The analysis service is temporarily unavailable. Please try again in a moment.")).toBeVisible();
});

test("SHAP failure leaves real prediction visible", async ({ page }) => {
  await signIn(page);
  await page.route("**/api/analyze", async route => {
    const response = await route.fetch();
    const body = await response.json();
    body.explanation = { available: false, method: "SHAP", features: [], message: "Prediction available. Explainability is temporarily unavailable." };
    await route.fulfill({ response, json: body });
  });
  await page.goto("/symptoms");
  const result = await submit(page, "fever, cough");
  await expect(page.locator(".check-match h2")).toBeVisible();
  await expect(page.locator(".check-step--purple")).toContainText("Prediction available. Explainability is temporarily unavailable.");
  await deleteAnalysis(page, result.analysisId);
});

test("responsive light/dark layouts and reduced motion", async ({ page }) => {
  await signIn(page);
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/symptoms");
  const result = await submit(page, "fever, cough, headache, fatigue");
  for (const width of [320, 375, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("dark");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: await screenshotPath("phase2-mobile-dark.png"), fullPage: true });
  await page.emulateMedia({ colorScheme: "light" });
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("light");
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile", exact: true })).toBeVisible();
  await deleteAnalysis(page, result.analysisId);
});

test("completed analyses persist in private history and can be deleted", async ({ page }) => {
  await signIn(page);
  await page.goto("/symptoms");
  const result = await submit(page, "fever, cough");
  await page.goto("/dashboard/history");
  const row = page.locator(`tr[data-analysis-id="${result.analysisId}"]`);
  await expect(row).toContainText(result.prediction.condition);
  await row.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button").last().click();
  await expect(row).toHaveCount(0);
});

test("language and theme preferences update the interface and persist", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Display language").selectOption("bn");
  await expect(page.getByRole("heading", { name: "ব্যাখ্যাযোগ্য এআই দিয়ে আপনার উপসর্গ বুঝুন" })).toBeVisible();
  await page.getByLabel("রঙের থিম").selectOption("dark");
  await expect.poll(() => page.locator("html").getAttribute("data-theme")).toBe("dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("heading", { name: "ব্যাখ্যাযোগ্য এআই দিয়ে আপনার উপসর্গ বুঝুন" })).toBeVisible();
  await expect(page.getByText("শিক্ষামূলক ও সিদ্ধান্ত-সহায়ক প্রোটোটাইপ। পেশাদার চিকিৎসা পরামর্শের বিকল্প নয়।")).toBeVisible();
  await page.locator('a[href="/how-it-works"]').first().click();
  await expect(page.getByRole("heading", { name: "MediXAI যেভাবে কাজ করে" })).toBeVisible();
  await page.getByText("কারিগরি বিবরণ", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "প্রযুক্তির স্তরসমূহ" })).toBeVisible();
  await page.locator('a[href="/about"]').first().click();
  await expect(page.getByRole("heading", { name: "উন্নয়নের অবস্থা" })).toBeVisible();
  await page.locator('a[href="/symptoms"]').first().click();
  await expect(page.getByLabel("আপনার উপসর্গ লিখুন")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("medixai-language"))).toBe("bn");
  expect(await page.evaluate(() => localStorage.getItem("medixai-theme"))).toBe("dark");
});

test("mobile navigation exposes accessible preference controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
  await page.getByRole("navigation", { name: "Mobile" }).getByLabel("Display language").selectOption("bn");
  await expect(page.getByRole("heading", { name: "ব্যাখ্যাযোগ্য এআই দিয়ে আপনার উপসর্গ বুঝুন" })).toBeVisible();
  await page.getByRole("navigation", { name: "মোবাইল নেভিগেশন" }).getByLabel("রঙের থিম").selectOption("dark");
  await expect.poll(() => page.locator("html").getAttribute("data-theme")).toBe("dark");
});

test("display language does not change the selected symptom input language", async ({ page }) => {
  await page.goto("/symptoms");
  await page.getByLabel("Display language").selectOption("bn");
  await expect(page.locator(".check-language").getByRole("button", { name: "English", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.locator(".check-language").getByRole("button", { name: "বাংলা", exact: true }).click();
  await expect(page.locator(".check-language").getByRole("button", { name: "বাংলা", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("আপনার উপসর্গ লিখুন").fill("জ্বর, কাশি");
  await expect(page.locator("#symptom-error")).toHaveCount(0);
});

test("theme defaults to the operating-system choice but an explicit choice wins", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect.poll(() => page.locator("html").getAttribute("data-theme")).toBe("dark");
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--surface").trim())).toBe("#101c2c");
  await page.getByLabel("Color theme").selectOption("light");
  await expect.poll(() => page.locator("html").getAttribute("data-theme")).toBe("light");
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--surface").trim())).toBe("#fff");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("contact form clearly reports that valid messages are not delivered", async ({ page }) => {
  await page.goto("/contact");
  await page.getByLabel("Name").fill("Test User");
  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("Message").fill("Test contact message");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("status")).toHaveText("Your message was not sent. Contact form delivery is unavailable.");
  await expect(page.getByLabel("Message")).toHaveValue("Test contact message");
  await expect(page.getByText("Your note was received.")).toHaveCount(0);
  await page.getByLabel("Display language").selectOption("bn");
  await expect(page.getByRole("note")).toHaveText("যোগাযোগ ফর্মের মাধ্যমে বার্তা পাঠানোর ব্যবস্থা নেই। এই ফর্ম আপনার বার্তা পাঠায় বা সংরক্ষণ করে না।");
  await page.getByRole("button", { name: "বার্তা পাঠান" }).click();
  await expect(page.getByRole("status")).toHaveText("আপনার বার্তা পাঠানো হয়নি। যোগাযোগ ফর্মের মাধ্যমে বার্তা পাঠানোর ব্যবস্থা নেই।");
});
