import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import {
  computeAnniversaryStatus,
  resolveNextOccurrenceDate,
  sortAnniversariesForList,
  type Anniversary,
} from "@/features/anniversaries/anniversary";

function createAnniversary(overrides?: Partial<Anniversary>): Anniversary {
  return {
    id: "anniversary-1",
    spaceId: "space-1",
    title: "恋爱纪念日",
    eventDate: "2024-10-01",
    note: null,
    isYearly: true,
    createdBy: "user-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("anniversary helpers", () => {
  it("非闰年遇到 2/29 时，按 2/28 计算下一次发生日期", () => {
    const today = dayjs("2025-02-20");
    const next = resolveNextOccurrenceDate("2024-02-29", today);

    expect(next.format("YYYY-MM-DD")).toBe("2025-02-28");
  });

  it("一次性事件在过去日期时显示已过去天数", () => {
    const status = computeAnniversaryStatus(
      {
        eventDate: "2026-01-01",
        isYearly: false,
      },
      dayjs("2026-01-11")
    );

    expect(status.daysUntil).toBe(-10);
    expect(status.statusText).toBe("已过去 10 天");
  });

  it("每年重复事件在当天显示今天", () => {
    const status = computeAnniversaryStatus(
      {
        eventDate: "2020-10-01",
        isYearly: true,
      },
      dayjs("2026-10-01")
    );

    expect(status.daysUntil).toBe(0);
    expect(status.statusText).toBe("今天");
  });

  it("每年重复事件过期后显示距下次倒计时", () => {
    const status = computeAnniversaryStatus(
      {
        eventDate: "2020-03-01",
        isYearly: true,
      },
      dayjs("2026-03-10")
    );

    expect(status.daysUntil).toBeGreaterThan(0);
    expect(status.statusText.startsWith("距下次 ")).toBe(true);
  });

  it("列表按最近倒计时升序，过去事件排在后面", () => {
    const today = dayjs("2026-06-01");
    const anniversaries = [
      createAnniversary({
        id: "future-5",
        title: "五天后",
        eventDate: "2026-06-06",
        isYearly: false,
      }),
      createAnniversary({
        id: "today",
        title: "今天",
        eventDate: "2026-06-01",
        isYearly: false,
      }),
      createAnniversary({
        id: "past-2",
        title: "两天前",
        eventDate: "2026-05-30",
        isYearly: false,
      }),
      createAnniversary({
        id: "future-1",
        title: "一天后",
        eventDate: "2026-06-02",
        isYearly: false,
      }),
    ];

    const sorted = sortAnniversariesForList(anniversaries, today);

    expect(sorted.map((item) => item.id)).toEqual([
      "today",
      "future-1",
      "future-5",
      "past-2",
    ]);
  });
});
