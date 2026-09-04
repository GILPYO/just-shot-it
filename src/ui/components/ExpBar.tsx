import { useHud } from "../useHud";

export const ExpBar = () => {
  const xp = useHud((d) => d.currentXp, 0);
  const xpToNext = useHud((d) => d.xpToNext, 20);
  const level = useHud((d) => d.level, 1);

  const percent = (xp / xpToNext) * 100;

  return (
    <div className="flex items-center gap-[8px]">
      <span className="hud-shadow text-[10px] text-[#7fdce4] whitespace-nowrap">
        Lv:{String(level).padStart(2, "0")}
      </span>

      <div
        className="h-[6px] flex-1 overflow-hidden"
        style={{ background: "#12292c" }}
      >
        <div
          className="h-full transition-all duration-150"
          style={{ width: `${percent}%`, background: "#49a0ab" }}
        />
      </div>
    </div>
  );
};
