import { useEffect, useRef, useState } from "react";
import type { HudData } from "../types/hud";
import EventBus from "../EventBus";

export function useHud<T>(select: (d: HudData) => T, initial: T): T {
  const [value, setValue] = useState<T>(initial);

  const prev = useRef<T>(initial);
  const selectRef = useRef(select);

  useEffect(() => {
    const handler = (d: HudData) => {
      const next = selectRef.current(d);

      if (next !== prev.current) {
        prev.current = next;
        setValue(next);
      }
    };
    EventBus.on("hud-update", handler);
    return () => {
      EventBus.off("hud-update", handler);
    };
  }, []);

  return value;
}
