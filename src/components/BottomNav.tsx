import type { PageKey } from "../types";

type BottomNavProps = {
  currentPage: PageKey;
  onChange: (page: PageKey) => void;
};

const items: Array<{ key: PageKey; label: string }> = [
  { key: "home", label: "홈" },
  { key: "stats", label: "통계" },
  { key: "settings", label: "설정" },
];

export function BottomNav({ currentPage, onChange }: BottomNavProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[420px] px-4 pb-[calc(0.5rem+var(--sab))] [transform:translateZ(0)]">
      <nav className="grid grid-cols-3 rounded-[28px] border border-white/60 bg-white/90 p-2 shadow-[0_14px_36px_rgba(15,23,42,0.14)] backdrop-blur">
        {items.map((item) => {
          const active = item.key === currentPage;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={`rounded-[22px] px-4 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-slate-900 text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)]"
                  : "text-slate-500"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
