export type DailyChallengeTemplate = {
  id: string;
  title: string;
  description: string;
  emoji: string;
};

export type ChallengeCheckinLite = {
  challenge_date: string;
  user_id: string;
};

export type ChallengeStats = {
  todayCompletedUserIds: string[];
  todayAllCompleted: boolean;
  todayProgressLabel: string;
  currentStreakDays: number;
  totalSweetPoints: number;
};

export const DAILY_CHALLENGE_TEMPLATES: DailyChallengeTemplate[] = [
  {
    id: "cook-dinner",
    title: "一起做晚餐",
    description: "放下手机，一起做一道家常菜，吃饭时聊聊今天最开心的瞬间。",
    emoji: "🍝",
  },
  {
    id: "walk-and-talk",
    title: "一起散步 20 分钟",
    description: "饭后散步，不聊工作，只聊彼此今天的感受。",
    emoji: "🚶",
  },
  {
    id: "memory-photo",
    title: "拍一张今日合照",
    description: "记录今天的状态，把照片上传到回忆墙并加一句小备注。",
    emoji: "📸",
  },
  {
    id: "tea-time",
    title: "共享一杯热饮",
    description: "一起泡杯茶或咖啡，安静坐十分钟，专心陪伴。",
    emoji: "☕",
  },
  {
    id: "quick-cleanup",
    title: "一起做 15 分钟整理",
    description: "选一个小区域一起整理，让空间和心情都轻一点。",
    emoji: "🧹",
  },
  {
    id: "mini-workout",
    title: "双人小运动",
    description: "一起完成 10 分钟拉伸或轻量运动，互相监督打卡。",
    emoji: "💪",
  },
  {
    id: "gratitude-note",
    title: "互写一句感谢",
    description: "各写一句感谢对方的话，读给对方听。",
    emoji: "💌",
  },
];

function parseDateToken(date: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return { year, month, day };
}

function formatUtcDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(date: string, offsetDays: number): string {
  const token = parseDateToken(date);
  if (!token) {
    return date;
  }

  const utcTime =
    Date.UTC(token.year, token.month - 1, token.day) + offsetDays * 24 * 60 * 60 * 1000;
  return formatUtcDate(new Date(utcTime));
}

function dateDiffInDays(dateA: string, dateB: string): number {
  const tokenA = parseDateToken(dateA);
  const tokenB = parseDateToken(dateB);

  if (!tokenA || !tokenB) {
    return 0;
  }

  const timeA = Date.UTC(tokenA.year, tokenA.month - 1, tokenA.day);
  const timeB = Date.UTC(tokenB.year, tokenB.month - 1, tokenB.day);
  return Math.floor((timeA - timeB) / (24 * 60 * 60 * 1000));
}

function toDateParts(date: Date): { year: string; month: string; day: string } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return { year, month, day };
}

export function toShanghaiChallengeDate(date: Date = new Date()): string {
  const parts = toDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function pickDailyChallenge(date: string): DailyChallengeTemplate {
  const templateCount = DAILY_CHALLENGE_TEMPLATES.length;
  if (templateCount === 0) {
    throw new Error("挑战模板不能为空");
  }

  const baseDate = "2026-01-01";
  const dayOffset = dateDiffInDays(date, baseDate);
  const index = ((dayOffset % templateCount) + templateCount) % templateCount;
  return DAILY_CHALLENGE_TEMPLATES[index];
}

export function buildChallengeStats(input: {
  memberUserIds: string[];
  todayDate: string;
  checkins: ChallengeCheckinLite[];
}): ChallengeStats {
  const { memberUserIds, todayDate, checkins } = input;
  const memberSet = new Set(memberUserIds);
  const checkinsByDate = new Map<string, Set<string>>();

  for (const checkin of checkins) {
    const bucket = checkinsByDate.get(checkin.challenge_date) ?? new Set<string>();
    bucket.add(checkin.user_id);
    checkinsByDate.set(checkin.challenge_date, bucket);
  }

  const todaySet = checkinsByDate.get(todayDate) ?? new Set<string>();
  const todayCompletedUserIds = memberUserIds.filter((memberId) => todaySet.has(memberId));
  const todayAllCompleted =
    memberUserIds.length > 0 && todayCompletedUserIds.length === memberUserIds.length;
  const todayProgressLabel = `${todayCompletedUserIds.length}/${memberUserIds.length}`;

  const totalPersonalCheckins = Array.from(checkinsByDate.values()).reduce(
    (sum, userSet) => sum + userSet.size,
    0
  );

  const fullyCompletedDays = Array.from(checkinsByDate.values()).reduce((sum, userSet) => {
    if (memberSet.size === 0) {
      return sum;
    }

    const allDone = memberUserIds.every((memberId) => userSet.has(memberId));
    return allDone ? sum + 1 : sum;
  }, 0);

  let currentStreakDays = 0;
  if (memberUserIds.length > 0) {
    let cursor = todayDate;

    while (true) {
      const users = checkinsByDate.get(cursor);
      if (!users) {
        break;
      }

      const allDone = memberUserIds.every((memberId) => users.has(memberId));
      if (!allDone) {
        break;
      }

      currentStreakDays += 1;
      cursor = shiftDate(cursor, -1);
    }
  }

  const totalSweetPoints = totalPersonalCheckins * 10 + fullyCompletedDays * 20;

  return {
    todayCompletedUserIds,
    todayAllCompleted,
    todayProgressLabel,
    currentStreakDays,
    totalSweetPoints,
  };
}
