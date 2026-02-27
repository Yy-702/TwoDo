import type { Database } from "@/lib/supabase/database.types";

export type Space = Database["public"]["Tables"]["spaces"]["Row"];
export type SpaceMember = Database["public"]["Tables"]["space_members"]["Row"];
