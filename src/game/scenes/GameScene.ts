import Phaser from "phaser";

export default class GameScene extends Phaser.Scene {
  //기본 셋팅
  private player!: Phaser.Physics.Arcade.Sprite;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  //탄환
  private bullets!: Phaser.Physics.Arcade.Group;
  //좀비
  private zombies!: Phaser.Physics.Arcade.Group;

  // HP 셋팅
  private hp: number = 100;
  private maxHp: number = 100;
  private isHit: boolean = false;

  constructor() {
    super(`GameScene`);
  }

  create() {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xffffff);
    graphics.fillRect(0, 0, 32, 32);

    graphics.fillStyle(0xffff00);
    graphics.fillRect(28, 12, 12, 8);

    graphics.generateTexture(`player`, 32, 32);
    graphics.destroy();

    this.player = this.physics.add.sprite(640, 360, "player");

    this.keys = {
      W: this.input.keyboard!.addKey(`W`),
      A: this.input.keyboard!.addKey(`A`),
      S: this.input.keyboard!.addKey(`S`),
      D: this.input.keyboard!.addKey(`D`),
    };

    this.bullets = this.physics.add.group();

    this.input.on(`pointerdown`, (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0) return;

      const bullet = this.bullets.create(
        this.player.x,
        this.player.y,
        `player`,
      ) as Phaser.Physics.Arcade.Sprite;

      bullet.setScale(0.2);
      bullet.setTint(0xffff00);

      const speed = 1000;
      const angle = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        pointer.worldX,
        pointer.worldY,
      );

      bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    });

    //좀비 기본 셋팅 값
    const zombieGraphics = this.make.graphics({ x: 0, y: 0 });
    zombieGraphics.fillStyle(0xff0000);
    zombieGraphics.fillRect(0, 0, 28, 28);
    zombieGraphics.generateTexture(`zombie`, 28, 28);
    zombieGraphics.destroy();

    this.zombies = this.physics.add.group();

    //화면 밖 탄환 삭제 시스템 ( 메모리 누수 방지 )
    this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        const side = Phaser.Math.Between(0, 3);
        let x = 0;
        let y = 0;

        if (side === 0) {
          x = Phaser.Math.Between(0, 1280);
          y = -30;
        }
        if (side === 1) {
          x = Phaser.Math.Between(0, 1280);
          y = 750;
        }
        if (side === 2) {
          x = -30;
          y = Phaser.Math.Between(0, 720);
        }
        if (side === 3) {
          x = 1310;
          y = Phaser.Math.Between(0, 720);
        }

        this.zombies.create(x, y, "zombie");
      },
    });

    //좀비 사살 시스템
    this.physics.add.overlap(this.bullets, this.zombies, (bullet, zombie) => {
      bullet.destroy();
      zombie.destroy();
    });

    //피격 시스템
    this.physics.add.overlap(this.player, this.zombies, () => {
      if (this.isHit) return;

      this.hp -= 10;
      this.isHit = true;
      console.log("HP:", this.hp);

      this.player.setTint(0xff0000);
      this.time.delayedCall(200, () => {
        this.player.clearTint();
        this.isHit = false;
      });

      if (this.hp <= 0) {
        console.log("GAME OVER!");
        this.scene.pause();
      }
    });
  }

  update() {
    //키보드 조작 시스템
    const speed = 200;
    let vx = 0;
    let vy = 0;

    if (this.keys.A.isDown) vx = -speed;
    if (this.keys.D.isDown) vx = speed;
    if (this.keys.W.isDown) vy = -speed;
    if (this.keys.S.isDown) vy = speed;

    this.player.setVelocity(vx, vy);

    //마우스 조작 시스템
    const pointer = this.input.activePointer;
    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      pointer.worldX,
      pointer.worldY,
    );
    this.player.setRotation(angle);

    //좀비가 유저를 따라오게하는 시스템
    this.zombies.getChildren().forEach((z) => {
      const zombie = z as Phaser.Physics.Arcade.Sprite;
      this.physics.moveToObject(zombie, this.player, 80);
    });

    //화면 밖 탄환 삭제 시스템 ( 메모리 누수 방지 )
    this.bullets.getChildren().forEach((b) => {
      const bullet = b as Phaser.Physics.Arcade.Sprite;
      if (
        bullet.x < -50 ||
        bullet.x > 1330 ||
        bullet.y < -50 ||
        bullet.y > 770
      ) {
        bullet.destroy();
      }
    });
  }
}
