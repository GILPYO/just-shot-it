import { useEffect, useRef, useState } from "react";
import type { ReactNode, SyntheticEvent } from "react";
import "./MainMenu.css";

export type MainMenuProps = {
  onStart: () => void;
};

const WIDTH = 1280;
const HEIGHT = 720;
const INACTIVE_ITEMS = ["OPTIONS", "CREDITS", "MORE GAMES", "QUIT"] as const;

function stopPropagation(event: SyntheticEvent) {
  event.stopPropagation();
}

function Keycap({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-[22px] min-w-[21px] items-center justify-center border border-[#899397] bg-[#080d10] px-1 text-[11px] not-italic text-[#cdd3d0] shadow-[2px_2px_0_#000] [font-family:inherit]">
      {children}
    </kbd>
  );
}

function MouseIcon({ side }: { side: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      width="17"
      height="23"
      viewBox="0 0 17 23"
      fill="none"
      shapeRendering="crispEdges"
    >
      <path d="M4 1H12L16 5V18L12 22H4L1 18V5Z" stroke="#a5aeb0" />
      <path d="M2 10H15M8 2V10" stroke="#59676e" />
      <path
        d={side === "left" ? "M4 2H7V9H2V5Z" : "M9 2H12L15 5V9H9Z"}
        fill="#E4584A"
      />
    </svg>
  );
}

function ControlRow({ keys, action }: { keys: ReactNode; action: string }) {
  return (
    <div className="grid h-[24px] grid-cols-[126px_16px_1fr] items-center gap-x-2">
      <div className="flex items-center gap-1.5">{keys}</div>
      <span aria-hidden="true" className="text-[#7b888d]">
        -
      </span>
      <span className="whitespace-nowrap text-[#c0cacb]">{action}</span>
    </div>
  );
}

export default function MainMenu({ onStart }: MainMenuProps) {
  const hostRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLHeadingElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    const logo = logoRef.current;
    if (!host) return;

    // Resize the image and every UI element together, preserving mask alignment.
    const updateScale = () => {
      setScale(Math.min(host.clientWidth / WIDTH, host.clientHeight / HEIGHT));
      // Font loading can change the intrinsic text width; keep the logo in its slot.
      if (logo && logo.offsetWidth > 0) {
        logo.style.setProperty(
          "--jsi-logo-scale",
          String(554 / logo.offsetWidth)
        );
      }
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(host);
    if (logo) observer.observe(logo);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={hostRef}
      aria-label="Just Shot It main menu"
      className="just-shot-menu pointer-events-auto absolute inset-0 z-50 isolate overflow-hidden bg-black text-[#d1d5d3]"
      onClick={stopPropagation}
      onPointerDown={stopPropagation}
      onPointerUp={stopPropagation}
      onKeyDown={stopPropagation}
      onKeyUp={stopPropagation}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div
        className="absolute left-1/2 top-1/2 h-[720px] w-[1280px] origin-center overflow-hidden bg-[#030607]"
        style={{
          transform: `translate(-50%, -50%) scale(${scale})`,
          visibility: scale > 0 ? "visible" : "hidden",
        }}
      >
        <img
          src="/assets/main-menu-bg.png"
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill [image-rendering:pixelated]"
        />

        {/* The original image contains baked-in UI. Cover it before adding real UI. */}
        <div
          aria-hidden="true"
          className="jsi-baked-ui-mask pointer-events-none absolute inset-0"
        />
        <div
          aria-hidden="true"
          className="jsi-vignette pointer-events-none absolute inset-0"
        />

        <p
          aria-hidden="true"
          className="absolute left-[28px] top-[20px] text-[9px] leading-[12px] tracking-[1px] text-[#637176]"
        >
          SEOUL
          <br />
          STILL
          <br />
          BREATHES
          <br />
          ...
          <br />
          FOR NOW.
        </p>

        <header className="absolute left-[98px] top-[40px] w-[554px]">
          <h1
            ref={logoRef}
            className="jsi-logo m-0 font-bold text-[#d8d9d2] [text-shadow:4px_4px_0_#000]"
          >
            JUST <span className="text-[#E4584A]">SHOT</span> IT!
          </h1>
          <div className="absolute left-[6px] top-[130px] flex w-[532px] items-center gap-3">
            <span aria-hidden="true" className="h-[2px] flex-1 bg-[#bac1bd]" />
            <p className="whitespace-nowrap text-[11px] tracking-[1.7px] text-[#bfc8c5] [text-shadow:2px_2px_0_#000]">
              Dark Zombie Survival Shooter
            </p>
            <span aria-hidden="true" className="h-[2px] flex-1 bg-[#bac1bd]" />
          </div>
        </header>

        <p
          aria-hidden="true"
          className="absolute left-[586px] top-[205px] text-[10px] leading-[15px] tracking-[1px] text-[#69777b]"
        >
          SAME
          <br />
          CITY.
          <br />
          MORE
          <br />
          DEAD.
          <span className="mt-2 block h-[2px] w-5 bg-[#E4584A]" />
        </p>

        <nav
          aria-label="Main menu"
          className="absolute left-[46px] top-[226px] flex w-[312px] flex-col items-start gap-[8px]"
        >
          <button
            type="button"
            onClick={onStart}
            className="jsi-start group relative mb-[2px] flex h-[58px] w-full cursor-pointer items-center gap-[22px] border-2 border-[#E4584A] bg-[#29100f] px-[18px] text-[#E4584A] shadow-[5px_5px_0_#571f1b] transition-[transform,background-color,box-shadow,color] duration-100 [transition-timing-function:steps(2,end)] hover:-translate-y-[2px] hover:bg-[#3c1512] hover:text-[#ff887a] hover:shadow-[5px_7px_0_#571f1b] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[6px] focus-visible:outline-[#E8A33D] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0_#571f1b]"
          >
            <svg
              aria-hidden="true"
              className="jsi-start-arrow shrink-0"
              width="15"
              height="24"
              viewBox="0 0 15 24"
              fill="currentColor"
              shapeRendering="crispEdges"
            >
              <path d="M0 0H5V5H10V9H15V15H10V19H5V24H0V18H5V14H10V10H5V6H0Z" />
            </svg>
            <span className="text-[32px] font-bold leading-none tracking-[4px] [text-shadow:3px_3px_0_#140807]">
              START
            </span>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-[4px] border border-[#E4584A]/20"
            />
          </button>

          {INACTIVE_ITEMS.map((label) => (
            <button
              key={label}
              type="button"
              disabled
              className="ml-[8px] flex h-[30px] w-[274px] items-center justify-center gap-3 border border-[#536168] bg-[#05090b] text-[13px] font-bold tracking-[2px] text-[#a0acb2] shadow-[2px_2px_0_#000] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {label}
              {label === "MORE GAMES" && (
                <svg
                  aria-hidden="true"
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M5 2H1V11H10V7M7 1H11V5M5 7L11 1" />
                </svg>
              )}
            </button>
          ))}
        </nav>

        <section
          aria-labelledby="jsi-controls-heading"
          className="absolute left-[46px] top-[476px] w-[420px] border border-[#49a0ab]/70 bg-[#03090c] px-[18px] pb-[14px] pt-[23px] shadow-[4px_4px_0_#000]"
        >
          <span
            aria-hidden="true"
            className="absolute bottom-[4px] right-[4px] h-[6px] w-[6px] bg-[#49a0ab]"
          />

          <div className="flex flex-col gap-[6px] text-[11px] [text-shadow:2px_2px_0_#000]">
            <ControlRow
              action="Move"
              keys={
                <>
                  {Array.from("WASD").map((key) => (
                    <Keycap key={key}>{key}</Keycap>
                  ))}
                </>
              }
            />
            <ControlRow action="Run" keys={<Keycap>SHIFT</Keycap>} />
            <ControlRow action="Reload" keys={<Keycap>R</Keycap>} />
            <ControlRow
              action="Shoot"
              keys={
                <>
                  <MouseIcon side="left" />
                  <span className="ml-1">Left Click</span>
                </>
              }
            />
            <ControlRow
              action="Flashlight / Aim"
              keys={
                <>
                  <MouseIcon side="right" />
                  <span className="ml-1">Right Click</span>
                </>
              }
            />
          </div>
        </section>

        <div
          aria-hidden="true"
          className="absolute right-[24px] top-[14px] text-right text-[9px] leading-[14px] tracking-[1px] text-[#69777b]"
        >
          <p>v1.0.0</p>
          <p className="mt-3">
            ANOTHER
            <br />
            NIGHT
            <br />
            IN
            <br />
            SEOUL
          </p>
          <span className="ml-auto mt-2 block h-[2px] w-5 bg-[#E4584A]" />
        </div>

        <div
          aria-hidden="true"
          className="absolute bottom-[27px] right-[24px] text-right text-[9px] leading-[13px] tracking-[1px] text-[#748389]"
        >
          <p>
            SOME LIGHT
            <br />
            STILL FIGHTS
          </p>
          <div className="mt-3 flex justify-end gap-[3px]">
            {[true, true, false, false, false, false].map((filled, index) => (
              <span
                key={index}
                className={`h-[6px] w-[12px] border ${
                  filled
                    ? "border-[#49a0ab] bg-[#49a0ab]"
                    : "border-[#4d5b60] bg-[#030607]"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Scanlines sit above the art and UI, but never intercept input. */}
        <div
          aria-hidden="true"
          className="jsi-scanlines pointer-events-none absolute inset-0 z-20"
        />
      </div>
    </section>
  );
}
