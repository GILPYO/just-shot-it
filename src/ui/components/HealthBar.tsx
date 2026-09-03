import { useEffect, useState } from "react";
import EventBus from "../../EventBus";
import { type HudData } from "../../types/hud";

export const HealthBar = () => {
  const [hp, setHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);

  useEffect(() => {
    const handler = (data: HudData) => {
      setHp(data.hp);
      setMaxHp(data.maxHp);
    };
    EventBus.on("hud-update", handler);

    return () => {
      EventBus.off("hud-update", handler);
    };
  }, []);

  const percent = (hp / maxHp) * 100;

  return (
    <div className="bg-white w-full">
      <div className="health-bar__header">
        <span className="health-bar__label">HP</span>
        <span className="health-bar__value">
          {Math.floor(hp)} / {maxHp}
        </span>
      </div>
      <div className="health-bar_track">
        <div className="bg-red-500/80" style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
};
