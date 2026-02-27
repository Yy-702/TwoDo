import { expect, test } from "@playwright/test";

const hasE2ECreds =
  Boolean(process.env.E2E_USER_A_EMAIL) &&
  Boolean(process.env.E2E_USER_B_EMAIL) &&
  Boolean(process.env.E2E_OTP_CODE_A) &&
  Boolean(process.env.E2E_OTP_CODE_B);

test.describe("TwoDo P0 主流程", () => {
  test.skip(!hasE2ECreds, "缺少 E2E 账号与 OTP 环境变量");

  test("用户可以进入登录页", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("TwoDo")).toBeVisible();
    await expect(page.getByRole("button", { name: "发送验证码" })).toBeVisible();
  });
});
