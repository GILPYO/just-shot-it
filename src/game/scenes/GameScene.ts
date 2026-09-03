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

  // 스테미너 셋팅
  private stamina: number = 100;
  private maxStamina: number = 100;
  private staminaRegenRate: number = 15;
  private sprintCost: number = 20;
  private sprintSpeed: number = 350;
  private normalSpeed: number = 200;

  // 조준 시스템
  private isADS: boolean = false;
  private hipSpread: number = 10;
  private adsSpread: number = 3;
  private adsSpeedMultiplier: number = 0.5;

  // 재장전 시스템
  private magazineSize: number = 15;
  private currentAmmo: number = 15;
  private reloadTime: number = 1200;
  private isReloading: boolean = false;

  // 경험치 & 레벨 시스템
  private level: number = 1;
  private currentXp: number = 0;
  private xpToNext: number = 20;
  private gems!: Phaser.Physics.Arcade.Group;
  private magnetRange: number = 50;

  // 플래시 라이트 시스템
  private lightCanvas: HTMLCanvasElement | null = null;
  private lightCtx: CanvasRenderingContext2D | null = null;

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

    // 우클릭 기본 메뉴 차단
    this.input.mouse?.disableContextMenu();

    // 키 등록 영역
    this.keys = {
      W: this.input.keyboard!.addKey(`W`),
      A: this.input.keyboard!.addKey(`A`),
      S: this.input.keyboard!.addKey(`S`),
      D: this.input.keyboard!.addKey(`D`),
      R: this.input.keyboard!.addKey(`R`),
      SHIFT: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
    };

    // 발사 시스템 ( 좌클릭 )
    this.bullets = this.physics.add.group();
    this.input.on(`pointerdown`, (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0) return;

      // 재장전 영역
      if (this.isReloading) return;
      if (this.currentAmmo <= 0) {
        this.startReload();
        return;
      }

      this.currentAmmo--;

      const bullet = this.bullets.create(
        this.player.x,
        this.player.y,
        `player`
      ) as Phaser.Physics.Arcade.Sprite;

      bullet.setScale(0.2);
      bullet.setTint(0xffff00);

      // 마우스 방향 각도 계산 ( 라디안 )
      const baseAngle = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        pointer.worldX,
        pointer.worldY
      );

      // 탄 퍼짐 계산
      // ADS 중이면 3도, 아니면 12도 퍼짐
      const spreadDog = this.isADS ? this.adsSpread : this.hipSpread;

      const spreadRad = (spreadDog * Math.PI) / 180;

      const offset = (Math.random() - 0.5) * spreadRad;

      const finalAngle = baseAngle + offset;

      const bulletSpeed = 1000;
      bullet.setVelocity(
        Math.cos(finalAngle) * bulletSpeed,
        Math.sin(finalAngle) * bulletSpeed
      );
    });

    // 좀비 기본 셋팅 값
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

    // 좀비 사살 시스템
    this.physics.add.overlap(this.bullets, this.zombies, (bullet, zombie) => {
      const z = zombie as Phaser.Physics.Arcade.Sprite;

      const gem = this.gems.create(
        z.x,
        z.y,
        `gem`
      ) as Phaser.Physics.Arcade.Sprite;

      gem.setData(`value`, 5);

      bullet.destroy();
      zombie.destroy();
    });

    // 피격 시스템
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

    // 경험치 젬 & 레벨 시스템
    const gameGraphics = this.make.graphics({ x: 0, y: 0 });

    gameGraphics.fillStyle(0x00ffff);
    gameGraphics.fillRect(0, 0, 8, 8);
    gameGraphics.generateTexture(`gem`, 8, 8);
    gameGraphics.destroy();

    this.gems = this.physics.add.group();

    // 젬 수집 시스템
    this.physics.add.overlap(this.player, this.gems, (_player, gemObj) => {
      const gem = gemObj as Phaser.Physics.Arcade.Sprite;
      const value = gem.getData(`value`) as number;

      this.currentXp += value;
      gem.destroy();

      // 레벨업 체크
      if (this.currentXp >= this.xpToNext) {
        this.currentXp -= this.xpToNext;
        this.level++;

        this.xpToNext = Math.floor(
          20 + this.level * 8 + this.level * this.level * 0.5
        );
        console.log(`LEVEL UP Lv.${this.level} (next: ${this.xpToNext})`);
      }
    });

    // 플래시 라이트 별도 캔버스 생성
    const gameContainer = document.getElementById(`game-container`);

    if (gameContainer) {
      this.lightCanvas = document.createElement(`canvas`);

      this.lightCanvas.width = 1280;
      this.lightCanvas.height = 720;

      this.lightCanvas.style.position = `absolute`;
      this.lightCanvas.style.top = `0`;
      this.lightCanvas.style.left = `0`;
      this.lightCanvas.style.pointerEvents = `none`;
      this.lightCanvas.style.zIndex = `1`;

      gameContainer.style.position = `relative`;
      gameContainer.appendChild(this.lightCanvas);

      this.lightCtx = this.lightCanvas.getContext(`2d`);
    }
  }

  update(time: number, delta: number) {
    const dt = delta / 1000;

    // === 이동 방향 계산 ===
    let vx = 0;
    let vy = 0;
    if (this.keys.A.isDown) vx = -1;
    if (this.keys.D.isDown) vx = 1;
    if (this.keys.W.isDown) vy = -1;
    if (this.keys.S.isDown) vy = 1;

    // === 대각선 정규화 ===
    const len = Math.sqrt(vx * vx + vy * vy);
    if (len > 0) {
      vx /= len; // vx = vx / len (길이가 1이 되도록 나눠줌)
      vy /= len; // 이걸 "정규화(normalize)"라고 부름
    }

    // === 달리기 판정 ===
    const isMoving = vx !== 0 || vy !== 0;

    // 쉬프트를 누르고 있거나 스테미나가 남아있거나 정조준 하고있지 않을 때 달림.
    const isSprinting =
      this.keys.SHIFT.isDown && isMoving && this.stamina > 0 && !this.isADS;

    // === 속도 결정 ===
    // 달리기 중이면 350, 아니면 200
    const pointer = this.input.activePointer;

    // 우클릭 정조준
    this.isADS = pointer.rightButtonDown();

    let speed = isSprinting ? this.sprintSpeed : this.normalSpeed;

    if (this.isADS) {
      speed *= this.adsSpeedMultiplier;
    }

    // === 스태미너 소모/회복 ===
    if (isSprinting) {
      // 달리기 중: 초당 20씩 줄어듦
      this.stamina = Math.max(0, this.stamina - this.sprintCost * dt);
    } else {
      // 달리기 안 할 때: 초당 15씩 회복
      this.stamina = Math.min(
        this.maxStamina,
        this.stamina + this.staminaRegenRate * dt
      );
    }

    // === 재장전 ===
    if (Phaser.Input.Keyboard.JustDown(this.keys.R)) {
      this.startReload();
    }

    // === 속도 적용 ===
    this.player.setVelocity(vx * speed, vy * speed);

    // === 마우스 방향으로 플레이어 회전 ===
    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      pointer.worldX,
      pointer.worldY
    );
    this.player.setRotation(angle);

    // === 좀비 추적 ===
    this.zombies.getChildren().forEach((z) => {
      const zombie = z as Phaser.Physics.Arcade.Sprite;
      this.physics.moveToObject(zombie, this.player, 80);

      const zombieAngle = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        zombie.x,
        zombie.y
      );
      const aimAngle = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        pointer.worldX,
        pointer.worldY
      );

      const angleDiff = Math.abs(
        Phaser.Math.Angle.Wrap(zombieAngle - aimAngle)
      );

      const coneHalfRad = ((this.isADS ? 22 : 33) * Math.PI) / 180;

      if (angleDiff < coneHalfRad) {
        zombie.setTint(0xff3333);
        zombie.setAlpha(1.0);
      } else {
        zombie.setAlpha(0);
      }
    });

    // === 젬 자석 효과 ===
    this.gems.getChildren().forEach((g) => {
      const gem = g as Phaser.Physics.Arcade.Sprite;

      if (!gem.active) return;

      const dx = this.player.x - gem.x;
      const dy = this.player.y - gem.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.magnetRange) {
        this.physics.moveToObject(gem, this.player, 300);
      }
    });

    // === 화면 밖 탄환 삭제 ===
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

    // === 플래시라이트 그리기 ===
    this.drawFlashLight();
  }
  private startReload(): void {
    if (this.isReloading) return;
    if (this.currentAmmo >= this.magazineSize) return;

    this.isReloading = true;
    console.log("RELOADING...");

    this.time.delayedCall(this.reloadTime, () => {
      this.currentAmmo = this.magazineSize;
      this.isReloading = false;
      console.log("RELOAD COMPLETE!", this.currentAmmo, "/", this.magazineSize);
    });
  }

  private drawFlashLight(): void {
    const ctx = this.lightCtx;
    if (!ctx) return;

    const pointer = this.input.activePointer;

    const px = this.player.x;
    const py = this.player.y;

    const aimAngle = Phaser.Math.Angle.Between(
      px,
      py,
      pointer.worldX,
      pointer.worldY
    );

    // === 화면 어둡게 칠하기 ===
    ctx.clearRect(0, 0, 1280, 720);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(0,0,0,0.80)";
    ctx.fillRect(0, 0, 1280, 720);

    // === 빛 영역 잘라내기 ===
    ctx.globalCompositeOperation = "destination-out";

    // 발밑 원형
    ctx.beginPath();
    ctx.arc(px, py, 70, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fill();

    // 부채꼴 플래시라이트
    const coneHalfDeg = this.isADS ? 22 : 33;
    const coneRange = this.isADS ? 380 : 280;
    const coneHalfRad = (coneHalfDeg * Math.PI) / 180;
    const segments = 24;

    ctx.beginPath();
    ctx.moveTo(px, py);

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = aimAngle - coneHalfRad + t * coneHalfRad * 2;
      ctx.lineTo(
        px + Math.cos(angle) * coneRange,
        py + Math.sin(angle) * coneRange
      );
    }

    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,1.0)";
    ctx.fill();

    // === 그리기 모드로 전환 (눈을 어둠 위에 그리기 위해) ===
    ctx.globalCompositeOperation = "source-over";

    // === 시야 밖 좀비 눈 빛나기 ===
    // aimAngle은 위에서 이미 계산했으므로 재사용
    const coneSightHalf = ((this.isADS ? 22 : 33) * Math.PI) / 180;

    this.zombies.getChildren().forEach((z) => {
      const zombie = z as Phaser.Physics.Arcade.Sprite;
      if (!zombie.active) return;

      const zombieAngle = Phaser.Math.Angle.Between(px, py, zombie.x, zombie.y);
      const angleDiff = Math.abs(
        Phaser.Math.Angle.Wrap(zombieAngle - aimAngle)
      );

      if (angleDiff >= coneSightHalf) {
        const dist = Phaser.Math.Distance.Between(px, py, zombie.x, zombie.y);

        if (dist > 400) return;

        const brightness = 1 - dist / 400;
        const eyeOffset = 4;
        const perpAngle = zombieAngle + Math.PI / 2;

        const leftEyeX = zombie.x + Math.cos(perpAngle) * eyeOffset;
        const leftEyeY = zombie.y + Math.sin(perpAngle) * eyeOffset;

        const rightEyeX = zombie.x - Math.cos(perpAngle) * eyeOffset;
        const rightEyeY = zombie.y - Math.sin(perpAngle) * eyeOffset;

        ctx.fillStyle = `rgba(255, 0, 0, ${brightness * 0.9})`;

        ctx.beginPath();
        ctx.arc(leftEyeX, leftEyeY, 2, 0, Math.PI * 2);

        ctx.fill();

        ctx.beginPath();
        ctx.arc(rightEyeX, rightEyeY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
}
