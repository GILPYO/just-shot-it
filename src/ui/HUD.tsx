import { AmmoDisplay } from "./components/AmmoDisplay";
import { ExpBar } from "./components/ExpBar";
import { HealthBar } from "./components/HealthBar";
import { StaminaBar } from "./components/StaminaBar";

import "./hud.css";

export default function HUD() {
  return (
    <div className="absolute inset-0 pointer-events-none z-2 font-mono">
      <div className="absolute top-5 left-5 w-[220px] flex flex-col gap-[2px]">
        <HealthBar />
        <StaminaBar />
      </div>
      <div className="absolute bottom-12 right-6 text-right">
        <AmmoDisplay />
      </div>
      <div className="absolute bottom-3 left-5 right-5">
        <ExpBar />
      </div>
    </div>
  );
}
