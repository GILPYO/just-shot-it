import { useState } from "react";
import { LevelUpCard } from "./LevelUpCard";
import type { LevelUpCard as CardData } from "../../types/cards";

type Props = {
  level: number;
  cards: CardData[];
  onSelect: (index: number) => void;
};

export const LevelUpOverlay = ({ level, cards, onSelect }: Props) => {
  const [picked, setPicked] = useState<number | null>(null);

  const handlePick = (index: number) => {
    if (picked !== null) return;
    setPicked(index);
    setTimeout(() => onSelect(index), 300);
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-5">
      {/* 어두운 배경 */}
      <div className="absolute inset-0 bg-black/85" />

      {/* 타이틀 */}
      <div className="relative flex flex-col items-center gap-2">
        <span className="text-[20px] text-[#49a0ab] font-bold
                         [text-shadow:3px_3px_0_rgba(0,0,0,0.95)]">
          LEVEL {String(level).padStart(2, "0")}
        </span>
        <span className="text-[12px] text-[#6B7566]">
          강화를 하나 고르세요
        </span>
      </div>

      {/* 카드 5장 */}
      <div className="relative flex items-end justify-center gap-3">
        {cards.filter(Boolean).map((card, i) => (
          <div
            key={i}
            style={{
              opacity: picked !== null && picked !== i ? 0.3 : 1,
              transform: picked !== null && picked !== i ? "translateY(14px)" : "none",
              transition: "opacity 0.2s, transform 0.2s",
            }}
          >
            <LevelUpCard
              card={card}
              index={i}
              onSelect={() => handlePick(i)}
            />
          </div>
        ))}
      </div>

      {/* 하단 힌트 */}
      <span className="relative text-[9px] text-[#6B7566]">
        CLICK 선택
      </span>
    </div>
  );
};
