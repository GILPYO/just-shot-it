import { useEffect, useRef } from "react";
import gameConfig from "./game/config";
import GameScene from "./game/scenes/GameScene";
import Phaser from "phaser";
import HUD from "./ui/HUD";

function App() {
  const gameContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameContainer.current) return;

    const game = new Phaser.Game({
      ...gameConfig,
      parent: gameContainer.current,
      scene: [GameScene],
    });

    return () => {
      game.destroy(true);
    };
  }, []);

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
    </div>
  );
}

export default App;
