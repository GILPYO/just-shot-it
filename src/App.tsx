import { useEffect, useRef } from "react";
import gameConfig from "./game/config";
import GameScene from "./game/scenes/GameScene";
import Phaser from "phaser";

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

  return <div ref={gameContainer} />;
}

export default App;
