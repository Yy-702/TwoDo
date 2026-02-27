import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MoodSelector } from "@/features/dashboard/mood-selector";

describe("MoodSelector", () => {
  it("点击后会切换选中的心情", async () => {
    const user = userEvent.setup();

    render(<MoodSelector />);

    const lovedButton = screen.getByRole("button", { name: "🥰 被爱包围" });
    const happyButton = screen.getByRole("button", { name: "🤩 超开心" });

    expect(lovedButton).toHaveAttribute("aria-pressed", "true");
    expect(happyButton).toHaveAttribute("aria-pressed", "false");

    await user.click(happyButton);

    expect(happyButton).toHaveAttribute("aria-pressed", "true");
    expect(lovedButton).toHaveAttribute("aria-pressed", "false");
  });
});
