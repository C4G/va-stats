import { expect, test } from "@playwright/test";
import { E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD } from "../credentials";

test("staff can sign in with email and password", async ({ page }) => {
  await page.goto("/auth/sign-in");
  await page.getByLabel("Email").fill(E2E_LOGIN_EMAIL);
  await page.getByLabel("Password").fill(E2E_LOGIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page).toHaveURL(/\/default$/);
  const session = await page.evaluate(async () => {
    const response = await fetch("/api/auth/get-session");
    return response.json();
  });
  expect(session.user.email).toBe(E2E_LOGIN_EMAIL);
  expect(session.user.role).toBe("ADMINISTRATOR");
});
