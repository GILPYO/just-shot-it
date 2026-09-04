import { useHud } from "../useHud";
import { SegmentGauge } from "./SegmentGuage";

export const AmmoDisplay = () => {
  const currentAmmo = useHud((d) => Math.floor(d.currentAmmo), 15);
  const magazineSize = useHud((d) => d.magazineSize, 15);
  const isReload = useHud((d) => d.isReloading, false);

  const low = currentAmmo <= magazineSize * 0.25;
  return (
    <div className="flex flex-col items-center gap-[6px]">
      {/* 탄약 숫자 — 재장전 중이면 R 표시 */}
      <span
        className={`hud-shadow text-[16px] w-[30px] text-center ${
          isReload
            ? "text-[#e8a33d] hud-blink"
            : low
            ? "text-[#e85b45]"
            : "text-[#dde3d8]"
        }`}
      >
        {/* TODO: 재장전 아이콘 넣기 */}
        {isReload ? "R" : currentAmmo}
      </span>

      <SegmentGauge
        value={currentAmmo}
        max={magazineSize}
        count={magazineSize}
        width={10}
        on={low ? "#e85b45" : "#e8a33d"}
        tip={low ? "#e85b45" : "#e8a33d"}
        off="#2c2011"
        blink={isReload}
      />
    </div>
  );
};
