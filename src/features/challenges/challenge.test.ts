import { describe, expect, it } from "vitest";
import {
  DAILY_CHALLENGE_TEMPLATES,
  buildChallengeStats,
  pickDailyChallenge,
  toShanghaiChallengeDate,
} from "@/features/challenges/challenge";

describe("challenge helpers", () => {
  it("按北京时间计算挑战日期，跨 UTC 日期时仍保持同一天", () => {
    expect(toShanghaiChallengeDate(new Date("2026-02-28T18:30:00.000Z"))).toBe("2026-03-01");
  });

  it("同一天命中同一个挑战模板", () => {
    const first = pickDailyChallenge("2026-03-01");
    const second = pickDailyChallenge("2026-03-01");

    expect(DAILY_CHALLENGE_TEMPLATES.length).toBeGreaterThan(0);
    expect(first.id).toBe(second.id);
    expect(first.title.length).toBeGreaterThan(0);
  });

  it("统计今日进度、连击与甜蜜值", () => {
    const stats = buildChallengeStats({
      memberUserIds: ["user-a", "user-b"],
      todayDate: "2026-03-01",
      checkins: [
        { challenge_date: "2026-02-26", user_id: "user-a" },
        { challenge_date: "2026-02-26", user_id: "user-b" },
        { challenge_date: "2026-02-27", user_id: "user-a" },
        { challenge_date: "2026-02-27", user_id: "user-b" },
        { challenge_date: "2026-02-28", user_id: "user-a" },
        { challenge_date: "2026-03-01", user_id: "user-a" },
        { challenge_date: "2026-03-01", user_id: "user-b" },
      ],
    });

    expect(stats.todayCompletedUserIds).toEqual(["user-a", "user-b"]);
    expect(stats.todayAllCompleted).toBe(true);
    expect(stats.todayProgressLabel).toBe("2/2");
    expect(stats.currentStreakDays).toBe(1);
    expect(stats.totalSweetPoints).toBe(130);
  });
});
