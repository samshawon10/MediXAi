const { test, expect } = require("@playwright/test");

async function signIn(page) {
  const email = process.env.E2E_TEST_EMAIL, password = process.env.E2E_TEST_PASSWORD;
  test.skip(!email || !password, "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD to a dedicated Firebase test account.");
  await page.goto("/login?next=%2Fdashboard%2Fanalysis");
  if (await page.getByLabel("Email address").count()) {
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
  }
  await expect(page).toHaveURL(/\/dashboard\/analysis(?:\?.*)?$/);
}

async function acceptStorageConsent(page) {
  const consent = page.getByRole("checkbox");
  if (await consent.count() && !(await consent.isChecked())) await consent.check();
}

async function deleteAnalysis(page, id) {
  if (!id) return;
  await page.goto("/dashboard/history");
  const row = page.locator(`tr[data-analysis-id="${id}"]`);
  await expect(row).toHaveCount(1);
  await row.getByRole("button", { name: "Delete" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button").last().click();
  await expect(row).toHaveCount(0);
}

module.exports = { signIn, acceptStorageConsent, deleteAnalysis };
