import {
  TYPE_COLOR,
  TYPE_LABEL,
  type LevelUpCard as CardData,
} from "../../types/cards";

type Props = {
  card: CardData;
  index: number;
  onSelect: () => void;
};

export const LevelUpCard = ({ card, index, onSelect }: Props) => {
  const color = TYPE_COLOR[card.type];

  return (
    <button
      onClick={onSelect}
      // style로 CSS 변수 주입 — tailwind에서 var(--c)로 사용
      style={{ "--c": color, "--edge": color + "59" } as React.CSSProperties}
      className="relative flex h-[264px] w-[176px] cursor-pointer flex-col
                   bg-[#1a1a1a] text-left
                   shadow-[4px_4px_0_rgba(0,0,0,0.9),inset_0_0_0_1px_var(--edge)]
                   transition-transform duration-[90ms] ease-[steps(3)]
                   hover:-translate-y-[7px]
                   hover:shadow-[4px_11px_0_rgba(0,0,0,0.9),inset_0_0_0_1px_var(--c)]"
    >
      {/* 헤더 — 타입 배지 */}
      <div
        className="flex items-center justify-between px-2 py-[5px]"
        style={{ background: color }}
      >
        <span className="text-[8px] tracking-[0.12em] text-[#0b0b0b] font-bold">
          {TYPE_LABEL[card.type]}
        </span>
        <span className="text-[8px] text-black/60">{index + 1}</span>
      </div>

      {/* 본문 */}
      <div className="flex flex-1 flex-col gap-[9px] p-[11px]">
        {/* 아이콘 슬롯 (나중에 아이콘으로 교체) */}
        <div
          className="h-[72px] w-[72px] shrink-0 self-center bg-[#101010]
                          shadow-[inset_0_0_0_1px_rgba(0,0,0,0.9)]"
        />

        {/* 이름 */}
        <span
          className="font-semibold text-[12.5px] text-[#DDE3D8]
                           [text-shadow:2px_2px_0_rgba(0,0,0,0.95)]"
        >
          {card.name}
        </span>

        {/* 설명 */}
        <span className="text-[11px] leading-[1.5] text-[#6B7566]">
          {card.description}
        </span>

        {/* 레벨 */}
        <div
          className="flex items-center gap-[5px] text-[9px]"
          style={{ color }}
        >
          {card.levelFrom > 0 ? (
            <>
              <span className="text-[#6B7566]">Lv.{card.levelFrom}</span>
              <span className="text-[#6B7566]">▶</span>
              <span>Lv.{card.levelTo}</span>
            </>
          ) : (
            <span>NEW</span>
          )}
        </div>
      </div>
    </button>
  );
};
