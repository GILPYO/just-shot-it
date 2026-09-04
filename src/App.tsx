import { useEffect, useRef, useState } from "react";
import gameConfig from "./game/config";
import GameScene from "./game/scenes/GameScene";
import Phaser from "phaser";
import HUD from "./ui/HUD";
import EventBus from "./EventBus";
import type { LevelUpCard } from "./types/cards";
import { LevelUpOverlay } from "./ui/levelup/LevelUpOverlay";

function App() {
  const gameContainer = useRef<HTMLDivElement>(null);

  // 레벨업 카드 상태
  const [levelUp, setLevelUp] = useState<{
    level: number;
    cards: LevelUpCard[];
  } | null>(null);

  useEffect(() => {
    if (!gameContainer.current) return;

    // 이벤트 먼저 등록!
    const handleOpen = (data: { level: number; cards: LevelUpCard[] }) => {
      setLevelUp(data);
    };
    EventBus.on("levelup-open", handleOpen);

    // 그 다음 게임 생성
    const game = new Phaser.Game({
      ...gameConfig,
      parent: gameContainer.current,
      scene: [GameScene],
    });

    return () => {
      EventBus.off("levelup-open", handleOpen);
      game.destroy(true);
    };
  }, []);

  // 카드 선택 처리
  const handleSelect = (index: number) => {
    EventBus.emit("levelup-select", { index });
    setLevelUp(null); // 오버레이 닫기
  };

  return (
    <div
      style={{
        position: "relative",
        width: 1280,
        height: 720,
        border: "1px solid #222",
        overflow: "hidden",
      }}
    >
      <div ref={gameContainer} id="game-container" />
      <HUD />
      {/* 레벨업 오버레이 — levelUp 데이터 있을 때만 표시 */}
      {levelUp && (
        <LevelUpOverlay
          level={levelUp.level}
          cards={levelUp.cards}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}

export default App;
