import { useHud } from "../useHud";
import { SegmentGauge } from "./SegmentGuage";

export const StaminaBar = () => {
  const stamina = useHud((d) => Math.floor(d.stamina), 100);
  const maxStamina = useHud((d) => d.maxStamina, 100);

  const low = stamina <= 6;

  return (
    <div className="flex flex-col items-center justify-center gap-[6px]">
      <span className="hud-shadow text-[10px] text-hud-dim w-[24px] text-center">
        {stamina}
      </span>

      <SegmentGauge
        value={stamina}
        max={maxStamina}
        count={12}
        width={7}
        on="#c6b189"
        tip="#e6d6b2"
        off="#241f17"
        blink={low}
      />
      <span className="text-[12px] text-white">⚡</span>
    </div>
  );
};
