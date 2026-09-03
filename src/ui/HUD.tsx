import { useEffect, useRef, useState } from "react";
import EventBus from "../EventBus";

interface HudData {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  currentAmmo: number;
  magazineSize: number;
  level: number;
  currentXp: number;
  xpToNext: number;
  isADS: boolean;
  isReloading: boolean;
}

const COLORS = {
  hp: "#E4584A",
  hpBg: "#3a1512",
  sta: "#C6B189",
  staBg: "#2a2418",
  xp: "#79D2DC",
  xpBg: "#1a2e30",
  ammo: "#DDE3D8",
  ammoLow: "#E4584A",
  amber: "#E8A33D",
  text: "#DDE3D8",
  textDim: "#6B7566",
};

export default function HUD() {
  const [isLowHp, setIsLowHp] = useState(false);

  // ref로 직접 DOM 조작 (60fps 리렌더 방지)
  const hpBarRef = useRef<HTMLDivElement>(null);
  const hpTextRef = useRef<HTMLSpanElement>(null);
  const staBarRef = useRef<HTMLDivElement>(null);
  const xpBarRef = useRef<HTMLDivElement>(null);
  const lvTextRef = useRef<HTMLSpanElement>(null);
  const ammoRef = useRef<HTMLDivElement>(null);
  const adsRef = useRef<HTMLDivElement>(null);
  const reloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (d: HudData) => {
      // HP 바
      const hpRatio = d.hp / d.maxHp;
      if (hpBarRef.current) {
        hpBarRef.current.style.transform = `scaleX(${hpRatio})`;
      }
      if (hpTextRef.current) {
        hpTextRef.current.textContent = `${Math.floor(d.hp)} / ${d.maxHp}`;
      }

      // 스태미너 바
      const staRatio = d.stamina / d.maxStamina;
      if (staBarRef.current) {
        staBarRef.current.style.transform = `scaleX(${staRatio})`;
      }

      // 경험치 바
      const xpRatio = d.currentXp / d.xpToNext;
      if (xpBarRef.current) {
        xpBarRef.current.style.transform = `scaleX(${xpRatio})`;
      }
      if (lvTextRef.current) {
        lvTextRef.current.textContent = `LV ${d.level}`;
      }

      // 탄약
      if (ammoRef.current) {
        const lowAmmo = d.currentAmmo <= d.magazineSize * 0.25;
        const color = lowAmmo ? COLORS.ammoLow : COLORS.ammo;
        if (d.isReloading) {
          ammoRef.current.innerHTML = `<span style="color:${COLORS.amber};font-size:18px">RELOADING</span>`;
        } else {
          ammoRef.current.innerHTML = `<span style="color:${color};font-size:22px;font-weight:700">${d.currentAmmo}</span><span style="color:${COLORS.textDim};font-size:14px"> / ${d.magazineSize}</span>`;
        }
      }

      // ADS
      if (adsRef.current) {
        adsRef.current.style.opacity = d.isADS ? "1" : "0";
      }

      // 재장전 바
      if (reloadRef.current) {
        reloadRef.current.style.opacity = d.isReloading ? "1" : "0";
      }

      // 저체력
      setIsLowHp(d.hp <= d.maxHp * 0.28);
    };

    EventBus.on("hud-update", handler);
    return () => { EventBus.off("hud-update", handler); };
  }, []);

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      fontFamily: "monospace",
      fontVariantNumeric: "tabular-nums",
      zIndex: 2,
    }}>

      {/* ======== 좌상단: HP + 스태미너 ======== */}
      <div style={{ position: "absolute", top: 20, left: 20, width: 220 }}>
        {/* HP */}
        <div style={{ marginBottom: 4 }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 3,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: ".15em",
              color: COLORS.hp,
              textShadow: "0 1px 3px rgba(0,0,0,.9)",
            }}>HP</span>
            <span ref={hpTextRef} style={{
              fontSize: 11, fontWeight: 600,
              color: COLORS.text,
              textShadow: "0 1px 3px rgba(0,0,0,.9)",
            }}>100 / 100</span>
          </div>
          <div style={{
            width: "100%", height: 10, borderRadius: 999,
            background: COLORS.hpBg,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,.06), 0 1px 4px rgba(0,0,0,.7)",
            overflow: "hidden",
          }}>
            <div ref={hpBarRef} style={{
              width: "100%", height: "100%", borderRadius: 999,
              background: `linear-gradient(90deg, ${COLORS.hp}, #ff6b5a)`,
              transformOrigin: "left center",
              transform: "scaleX(1)",
              transition: "transform .15s ease",
            }} />
          </div>
        </div>

        {/* 스태미너 */}
        <div>
          <div style={{
            fontSize: 9, fontWeight: 600, letterSpacing: ".12em",
            color: COLORS.sta, marginBottom: 2,
            textShadow: "0 1px 3px rgba(0,0,0,.9)",
          }}>STAMINA</div>
          <div style={{
            width: "100%", height: 5, borderRadius: 999,
            background: COLORS.staBg,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,.04), 0 1px 3px rgba(0,0,0,.6)",
            overflow: "hidden",
          }}>
            <div ref={staBarRef} style={{
              width: "100%", height: "100%", borderRadius: 999,
              background: `linear-gradient(90deg, ${COLORS.sta}, ${COLORS.sta}cc)`,
              transformOrigin: "left center",
              transform: "scaleX(1)",
              transition: "transform .12s ease",
            }} />
          </div>
        </div>
      </div>

      {/* ======== 우하단: 탄약 ======== */}
      <div style={{
        position: "absolute", bottom: 44, right: 24,
        textAlign: "right",
        textShadow: "0 1px 4px rgba(0,0,0,.9), 0 0 12px rgba(0,0,0,.5)",
      }}>
        <div ref={ammoRef}>
          <span style={{ color: COLORS.ammo, fontSize: 22, fontWeight: 700 }}>15</span>
          <span style={{ color: COLORS.textDim, fontSize: 14 }}> / 15</span>
        </div>

        {/* ADS 표시 */}
        <div ref={adsRef} style={{
          opacity: 0,
          transition: "opacity .12s",
          marginTop: 4,
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "2px 8px",
          borderRadius: 6,
          background: "rgba(9,12,10,.65)",
          border: "1px solid rgba(232,163,61,.3)",
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: "50%",
            background: COLORS.amber,
            boxShadow: `0 0 6px ${COLORS.amber}`,
          }} />
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: ".18em",
            color: COLORS.amber,
          }}>ADS</span>
        </div>

        {/* 재장전 게이지 */}
        <div ref={reloadRef} style={{
          opacity: 0,
          transition: "opacity .2s",
          marginTop: 6,
          width: 100, height: 3, borderRadius: 999,
          background: "rgba(0,0,0,.5)",
          overflow: "hidden",
          marginLeft: "auto",
        }}>
          <div style={{
            width: "100%", height: "100%", borderRadius: 999,
            background: COLORS.amber,
            animation: "reloadFill 1.2s linear forwards",
          }} />
        </div>
      </div>

      {/* ======== 하단: 경험치 바 ======== */}
      <div style={{
        position: "absolute", bottom: 12, left: 20, right: 20,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span ref={lvTextRef} style={{
          fontSize: 11, fontWeight: 700, letterSpacing: ".1em",
          color: COLORS.xp, whiteSpace: "nowrap",
          textShadow: "0 1px 3px rgba(0,0,0,.9)",
        }}>LV 1</span>
        <div style={{
          flex: 1, height: 3, borderRadius: 999,
          background: COLORS.xpBg,
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,.04), 0 1px 3px rgba(0,0,0,.6)",
          overflow: "hidden",
        }}>
          <div ref={xpBarRef} style={{
            width: "100%", height: "100%", borderRadius: 999,
            background: `linear-gradient(90deg, ${COLORS.xp}, ${COLORS.xp})`,
            boxShadow: `0 0 6px rgba(121,210,220,.3)`,
            transformOrigin: "left center",
            transform: "scaleX(0)",
            transition: "transform .15s ease",
          }} />
        </div>
      </div>

      {/* ======== 저체력 비네트 ======== */}
      {isLowHp && (
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 70% 70% at 50% 55%, transparent 45%, rgba(150,26,18,.5) 100%)",
          animation: "pulse 1.6s ease-in-out infinite",
          pointerEvents: "none",
        }} />
      )}

      <style>{`
        @keyframes reloadFill {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
