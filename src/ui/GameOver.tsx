type Props = {
  level: number;
  kills: number;
  bossKills: number;
  onRestart: () => void;
};

export const GameOver = ({ level, kills, bossKills, onRestart }: Props) => {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6">
      <div className="absolute inset-0 bg-black/90" />

      <div className="relative flex flex-col items-center gap-4">
        <span
          className="text-[32px] font-bold text-red-500
                             [text-shadow:3px_3px_0_rgba(0,0,0,0.95)]"
        >
          GAME OVER
        </span>

        <div className="flex flex-col items-center gap-2 text-[14px] text-[#9AA694]">
          <span>도달 레벨: {level}</span>
          <span>좀비 처치: {kills}</span>
          <span>보스 처치: {bossKills}</span>
        </div>

        <button
          onClick={onRestart}
          className="mt-4 px-8 py-3 bg-[#1a1a1a] text-[#DDE3D8] text-[14px]
                         border border-[#9AA694] cursor-pointer
                         hover:bg-[#2a2a2a] active:bg-[#333]"
        >
          다시 하기
        </button>
      </div>
    </div>
  );
};
