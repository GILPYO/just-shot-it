import { AmmoDisplay } from "./components/AmmoDisplay";
import { ExpBar } from "./components/ExpBar";
import { HealthBar } from "./components/HealthBar";
import { StaminaBar } from "./components/StaminaBar";

import "./hud.css";

export default function HUD() {
  return (
    <div className="absolute inset-0 pointer-events-none z-2 font-mono">
      <div className="absolute top-4 left-5 right-5">
        <ExpBar />
      </div>

      <div className="absolute top-1/2 left-5 -translate-y-1/2 flex items-end gap-[6px]">
        <HealthBar />
        <StaminaBar />
      </div>

      <div className="absolute top-1/2 right-5 -translate-y-1/2">
        <AmmoDisplay />
      </div>
    </div>
  );
}
