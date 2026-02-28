import dayjs, { type Dayjs } from "dayjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type AnniversaryRow = Database["public"]["Tables"]["anniversaries"]["Row"];

export const ANNIVERSARY_TITLE_MAX_LENGTH = 60;
export const ANNIVERSARY_NOTE_MAX_LENGTH = 200;

export type Anniversary = {
  id: string;
  spaceId: string;
  title: string;
  eventDate: string;
  note: string | null;
  isYearly: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type AnniversaryCreateInput = {
  title: string;
  eventDate: string;
  note?: string | null;
  isYearly: boolean;
};

export type AnniversaryStatus = {
  daysUntil: number;
  nextOccurrenceDate: string;
  statusText: string;
  isPast: boolean;
};

export type AnniversaryCreateResult =
  | {
      ok: true;
      anniversary: Anniversary;
    }
  | {
      ok: false;
      code: "invalid_title" | "invalid_date" | "invalid_note" | "insert_failed";
      message: string;
    };

export type AnniversaryDeleteResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      code: "delete_failed";
      message: string;
    };

export type AnniversaryListState = "idle" | "loading" | "ready" | "error";

export type AnniversaryWithStatus = Anniversary & {
  status: AnniversaryStatus;
};

function normalizeTitle(title: string): string {
  return title.trim().slice(0, ANNIVERSARY_TITLE_MAX_LENGTH);
}

function normalizeNote(note?: string | null): string | null {
  if (note === null || note === undefined) {
    return null;
  }

  const trimmed = note.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.slice(0, ANNIVERSARY_NOTE_MAX_LENGTH);
}

function toAnniversary(row: AnniversaryRow): Anniversary {
  return {
    id: row.id,
    spaceId: row.space_id,
    title: row.title,
    eventDate: row.event_date,
    note: row.note,
    isYearly: row.is_yearly,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isValidDateInput(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && dayjs(value).isValid();
}

function toDayStart(value: Dayjs): Dayjs {
  return value.startOf("day");
}

function isLeapYear(year: number): boolean {
  if (year % 400 === 0) {
    return true;
  }

  if (year % 100 === 0) {
    return false;
  }

  return year % 4 === 0;
}

function createOccurrenceDate(year: number, month: number, dayOfMonth: number): Dayjs {
  if (month === 2 && dayOfMonth === 29 && !isLeapYear(year)) {
    return dayjs(`${year}-02-28`);
  }

  return dayjs(`${year}-${String(month).padStart(2, "0")}-${String(dayOfMonth).padStart(2, "0")}`);
}

export function resolveNextOccurrenceDate(eventDate: string, baseDate = dayjs()): Dayjs {
  const event = dayjs(eventDate);
  const today = toDayStart(baseDate);

  if (!event.isValid()) {
    return today;
  }

  const month = event.month() + 1;
  const dayOfMonth = event.date();

  let candidate = createOccurrenceDate(today.year(), month, dayOfMonth);
  if (candidate.isBefore(today, "day")) {
    candidate = createOccurrenceDate(today.year() + 1, month, dayOfMonth);
  }

  return toDayStart(candidate);
}

export function computeAnniversaryStatus(
  anniversary: Pick<Anniversary, "eventDate" | "isYearly">,
  baseDate = dayjs()
): AnniversaryStatus {
  const today = toDayStart(baseDate);

  if (anniversary.isYearly) {
    const next = resolveNextOccurrenceDate(anniversary.eventDate, today);
    const daysUntil = next.diff(today, "day");

    if (daysUntil === 0) {
      return {
        daysUntil,
        nextOccurrenceDate: next.format("YYYY-MM-DD"),
        statusText: "今天",
        isPast: false,
      };
    }

    return {
      daysUntil,
      nextOccurrenceDate: next.format("YYYY-MM-DD"),
      statusText: `距下次 ${daysUntil} 天`,
      isPast: false,
    };
  }

  const event = toDayStart(dayjs(anniversary.eventDate));
  const daysUntil = event.diff(today, "day");

  if (daysUntil === 0) {
    return {
      daysUntil,
      nextOccurrenceDate: event.format("YYYY-MM-DD"),
      statusText: "今天",
      isPast: false,
    };
  }

  if (daysUntil > 0) {
    return {
      daysUntil,
      nextOccurrenceDate: event.format("YYYY-MM-DD"),
      statusText: `还有 ${daysUntil} 天`,
      isPast: false,
    };
  }

  return {
    daysUntil,
    nextOccurrenceDate: event.format("YYYY-MM-DD"),
    statusText: `已过去 ${Math.abs(daysUntil)} 天`,
    isPast: true,
  };
}

function anniversarySortValue(anniversary: Anniversary, baseDate: Dayjs): number {
  return computeAnniversaryStatus(anniversary, baseDate).daysUntil;
}

export function sortAnniversariesForList(
  anniversaries: Anniversary[],
  baseDate = dayjs()
): Anniversary[] {
  const today = toDayStart(baseDate);

  return [...anniversaries].sort((left, right) => {
    const leftDays = anniversarySortValue(left, today);
    const rightDays = anniversarySortValue(right, today);
    const leftPast = leftDays < 0;
    const rightPast = rightDays < 0;

    if (!leftPast && !rightPast) {
      return leftDays - rightDays;
    }

    if (leftPast && !rightPast) {
      return 1;
    }

    if (!leftPast && rightPast) {
      return -1;
    }

    const absoluteDiff = Math.abs(leftDays) - Math.abs(rightDays);
    if (absoluteDiff !== 0) {
      return absoluteDiff;
    }

    return left.eventDate.localeCompare(right.eventDate);
  });
}

export function toAnniversaryWithStatus(
  anniversary: Anniversary,
  baseDate = dayjs()
): AnniversaryWithStatus {
  return {
    ...anniversary,
    status: computeAnniversaryStatus(anniversary, baseDate),
  };
}

export function buildSortedAnniversaryView(
  anniversaries: Anniversary[],
  baseDate = dayjs()
): AnniversaryWithStatus[] {
  return sortAnniversariesForList(anniversaries, baseDate).map((anniversary) =>
    toAnniversaryWithStatus(anniversary, baseDate)
  );
}

export async function loadSpaceAnniversaries(params: {
  supabase: SupabaseClient<Database>;
  spaceId: string;
}): Promise<Anniversary[]> {
  const { supabase, spaceId } = params;
  const { data, error } = await supabase
    .from("anniversaries")
    .select("*")
    .eq("space_id", spaceId)
    .order("event_date", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toAnniversary);
}

export async function createAnniversaryRecord(params: {
  supabase: SupabaseClient<Database>;
  spaceId: string;
  userId: string;
  input: AnniversaryCreateInput;
}): Promise<AnniversaryCreateResult> {
  const { supabase, spaceId, userId, input } = params;
  const title = normalizeTitle(input.title);
  const note = normalizeNote(input.note);

  if (!title) {
    return {
      ok: false,
      code: "invalid_title",
      message: "标题不能为空",
    };
  }

  if (!isValidDateInput(input.eventDate)) {
    return {
      ok: false,
      code: "invalid_date",
      message: "请选择有效日期",
    };
  }

  if (note && note.length > ANNIVERSARY_NOTE_MAX_LENGTH) {
    return {
      ok: false,
      code: "invalid_note",
      message: `备注不能超过 ${ANNIVERSARY_NOTE_MAX_LENGTH} 字`,
    };
  }

  const { data, error } = await supabase
    .from("anniversaries")
    .insert({
      space_id: spaceId,
      title,
      event_date: input.eventDate,
      note,
      is_yearly: input.isYearly,
      created_by: userId,
    })
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      code: "insert_failed",
      message: "创建纪念日失败，请稍后重试",
    };
  }

  return {
    ok: true,
    anniversary: toAnniversary(data),
  };
}

export async function deleteAnniversaryRecord(params: {
  supabase: SupabaseClient<Database>;
  anniversaryId: string;
}): Promise<AnniversaryDeleteResult> {
  const { supabase, anniversaryId } = params;
  const { error } = await supabase.from("anniversaries").delete().eq("id", anniversaryId);

  if (error) {
    return {
      ok: false,
      code: "delete_failed",
      message: "删除失败，请稍后重试",
    };
  }

  return {
    ok: true,
  };
}
