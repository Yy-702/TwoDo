import { useState, type ReactNode } from "react";

type MoodId = "happy" | "loved" | "okay" | "tired";

type MoodOption = {
  id: MoodId;
  icon: ReactNode;
  label: string;
  baseClassName: string;
  textClassName: string;
  activeClassName: string;
};

const moodOptions: MoodOption[] = [
  {
    id: "happy",
    icon: "🤩",
    label: "超开心",
    baseClassName: "bg-emerald-50 hover:border-emerald-300",
    textClassName: "text-emerald-800",
    activeClassName: "border-emerald-200 ring-2 ring-emerald-100",
  },
  {
    id: "loved",
    icon: "🥰",
    label: "被爱包围",
    baseClassName: "bg-blue-50 hover:border-blue-300",
    textClassName: "text-blue-800",
    activeClassName: "scale-105 border-blue-200 ring-2 ring-blue-100",
  },
  {
    id: "okay",
    icon: "🙂",
    label: "还不错",
    baseClassName: "bg-yellow-50 hover:border-yellow-300",
    textClassName: "text-yellow-800",
    activeClassName: "border-yellow-200 ring-2 ring-yellow-100",
  },
  {
    id: "tired",
    icon: "😫",
    label: "有点累",
    baseClassName: "bg-rose-50 hover:border-rose-300",
    textClassName: "text-rose-800",
    activeClassName: "border-rose-200 ring-2 ring-rose-100",
  },
];

export function MoodSelector() {
  const [selectedMoodId, setSelectedMoodId] = useState<MoodId>("loved");

  return (
    <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-4">
      {moodOptions.map((mood) => (
        <button
          key={mood.id}
          type="button"
          aria-pressed={selectedMoodId === mood.id}
          onClick={() => setSelectedMoodId(mood.id)}
          className={`min-w-0 rounded-2xl border-2 p-3 text-center transition sm:min-w-[100px] sm:flex-1 sm:p-4 ${
            selectedMoodId === mood.id ? mood.activeClassName : "border-transparent"
          } ${mood.baseClassName}`}
        >
          <p className="text-2xl sm:text-3xl">{mood.icon}</p>
          <p className={`mt-2 text-sm font-bold ${mood.textClassName}`}>{mood.label}</p>
        </button>
      ))}
    </div>
  );
}
