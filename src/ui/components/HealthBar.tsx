import { useHud } from "../useHud";
import { SegmentGauge } from "./SegmentGuage";

export const HealthBar = () => {
  const hp = useHud((d) => Math.floor(d.hp), 100);
  const maxHp = useHud((d) => d.maxHp, 100);

  const low = hp / maxHp <= 0.28;

  return (
    <div className="flex flex-col items-center justify-center gap-[6px]">
      <span className="hud-shadow text-[10px] text-hud-ink w-[24px] text-center">
        {hp}
      </span>

      <SegmentGauge
        value={hp}
        max={maxHp}
        count={20}
        width={12}
        on="#c43c31"
        tip="#e85b45"
        off="#33130f"
        blink={low}
      />
      <span className="text-[12px] text-[#e85b45]">♥</span>
    </div>
  );
};
