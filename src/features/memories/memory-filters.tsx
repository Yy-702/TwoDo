"use client";

type MemoryFiltersProps = {
  years: number[];
  selectedYear: number | null;
  onSelectAll: () => void;
  onSelectYear: (year: number) => void;
};

function filterButtonClass(active: boolean) {
  if (active) {
    return "rounded-full bg-[#f06e42] px-5 py-2 text-sm font-bold text-white shadow-md transition-transform hover:scale-105";
  }

  return "rounded-full border border-gray-100 bg-white px-5 py-2 text-sm font-medium text-[#896b61] transition-colors hover:bg-gray-50";
}

function disabledFilterClass() {
  return "cursor-not-allowed rounded-full border border-gray-100 bg-white px-5 py-2 text-sm font-medium text-[#896b61]/70 opacity-80";
}

export function MemoryFilters({
  years,
  selectedYear,
  onSelectAll,
  onSelectYear,
}: MemoryFiltersProps) {
  return (
    <div className="relative z-10 mb-10 flex flex-wrap gap-3 border-b border-gray-100 pb-4">
      <button
        type="button"
        className={filterButtonClass(selectedYear === null)}
        onClick={onSelectAll}
      >
        全部
      </button>

      {years.map((year) => (
        <button
          key={year}
          type="button"
          className={filterButtonClass(selectedYear === year)}
          onClick={() => onSelectYear(year)}
        >
          {year}年
        </button>
      ))}

      <button type="button" className={disabledFilterClass()} disabled title="即将支持">
        ✈ 旅行（即将支持）
      </button>
      <button type="button" className={disabledFilterClass()} disabled title="即将支持">
        🍽 美食（即将支持）
      </button>
      <button type="button" className={disabledFilterClass()} disabled title="即将支持">
        🐾 萌宠（即将支持）
      </button>
    </div>
  );
}
