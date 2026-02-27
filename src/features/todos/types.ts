import type { Database } from "@/lib/supabase/database.types";

export type Todo = Database["public"]["Tables"]["todos"]["Row"];
export type TodoPriority = Database["public"]["Tables"]["todos"]["Row"]["priority"];

export type TodoEditorValue = {
  title: string;
  description: string;
  priority: TodoPriority;
  dueDate: string;
  dueTime: string;
  assigneeMode: "both" | "single";
  assigneeUserId: string | null;
};
