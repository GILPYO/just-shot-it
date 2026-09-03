import Phaser from "phaser";
import EventBus from "../../EventBus";

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

  // 재장전 타이밍용
  private reloadStartTime: number = 0;

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

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(0.5);

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

    // 좀비 스폰 시스템 — 플레이어 주변 화면 밖에서 생성
    this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        const angle = Math.random() * Math.PI * 2;
        const distance = 500;
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;

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
      vx /= len;
      vy /= len;
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

    // === 좀비 추적 + 시야 시스템 ===
    this.zombies.getChildren().forEach((z) => {
      const zombie = z as Phaser.Physics.Arcade.Sprite;
      this.physics.moveToObject(zombie, this.player, 80);

      // 플레이어와 좀비 사이 거리
      const distToZombie = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        zombie.x,
        zombie.y
      );

      // 발밑 원형 범위 안이면 (근접)
      if (distToZombie < 140) {
        zombie.setTint(0xff3333);
        zombie.setAlpha(1.0);
        return; // forEach의 return = continue와 같음
      }

      // 플래시라이트 각도 체크
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

      const coneHalfRad = ((this.isADS ? 15 : 33) * Math.PI) / 180;

      if (angleDiff < coneHalfRad) {
        zombie.setTint(0xff3333);
        zombie.setAlpha(1.0);
      } else {
        zombie.setTint(0x000000);
        zombie.setAlpha(0.01);
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

    // === 화면 밖 탄환 삭제 (플레이어 기준) ===
    this.bullets.getChildren().forEach((b) => {
      const bullet = b as Phaser.Physics.Arcade.Sprite;
      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        bullet.x,
        bullet.y
      );
      if (dist > 800) {
        bullet.destroy();
      }
    });

    // === 플래시라이트 그리기 ===
    this.drawFlashLight();

    // === HUD 데이터 전송 ===
    EventBus.emit(`hud-update`, {
      hp: this.hp,
      maxHp: this.maxHp,
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      currentAmmo: this.currentAmmo,
      magazineSize: this.magazineSize,
      level: this.level,
      currentXp: this.currentXp,
      xpToNext: this.xpToNext,
      isADS: this.isADS,
      isReloading: this.isReloading,
    });
  }
  private startReload(): void {
    if (this.isReloading) return;
    if (this.currentAmmo >= this.magazineSize) return;

    this.isReloading = true;
    this.reloadStartTime = Date.now();

    this.time.delayedCall(this.reloadTime, () => {
      this.currentAmmo = this.magazineSize;
      this.isReloading = false;
      console.log("RELOAD COMPLETE!", this.currentAmmo, "/", this.magazineSize);
    });
  }

  private drawFlashLight(): void {
    const ctx = this.lightCtx;
    if (!ctx) return;

    const cam = this.cameras.main;

    // 월드좌표 → 화면좌표 변환
    const zoom = cam.zoom;
    const playerScreen = cam.getWorldPoint(0, 0);
    const px = (this.player.x - playerScreen.x) * zoom;
    const py = (this.player.y - playerScreen.y) * zoom;

    // 마우스도 같은 방식
    const pointer = this.input.activePointer;
    const mouseScreenX = (pointer.worldX - playerScreen.x) * zoom;
    const mouseScreenY = (pointer.worldY - playerScreen.y) * zoom;

    const aimAngle = Phaser.Math.Angle.Between(
      px,
      py,
      mouseScreenX,
      mouseScreenY
    );

    // === 화면 어둡게 칠하기 ===
    ctx.clearRect(0, 0, 1280, 720);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(0,0,0,0.80)";
    ctx.fillRect(0, 0, 1280, 720);

    // === 빛 영역 잘라내기 ===
    ctx.globalCompositeOperation = "destination-out";

    // 플래시라이트 파라미터
    const coneHalfDeg = this.isADS ? 15 : 33;
    const screenDiag = Math.sqrt(1280 * 1280 + 720 * 720);
    const coneRange = this.isADS ? screenDiag * 0.5 : screenDiag * 0.4;
    const coneHalfRad = (coneHalfDeg * Math.PI) / 180;
    const segments = 32; // 더 부드럽게

    // --- 발밑 원형 (방사형 그라디언트로 부드럽게) ---
    const footGrad = ctx.createRadialGradient(px, py, 0, px, py, 90);
    // createRadialGradient(중심x, 중심y, 내부반지름, 중심x, 중심y, 외부반지름)
    // 중심은 같고 반지름만 0→90으로 = 원형 그라디언트
    footGrad.addColorStop(0, "rgba(255,255,255,1.0)"); // 중심: 100% 지움 (밝음)
    footGrad.addColorStop(0.6, "rgba(255,255,255,0.7)"); // 중간: 서서히
    footGrad.addColorStop(1, "rgba(255,255,255,0)"); // 가장자리: 0% (어둠과 자연스럽게 섞임)

    ctx.beginPath();
    ctx.arc(px, py, 90, 0, Math.PI * 2);
    ctx.fillStyle = footGrad;
    ctx.fill();

    // --- 부채꼴 플래시라이트 (5겹 레이어로 부드러운 페이드) ---
    // 바깥→안쪽 순서: 점점 밝고 + 점점 좁아짐 → 가장자리가 자연스럽게 사라짐
    const layers = [
      { rangeMult: 1.1, alpha: 0.15, angleBonus: 0.06 }, // 가장 바깥: 아주 희미한 번짐
      { rangeMult: 1.0, alpha: 0.3, angleBonus: 0.03 }, // 바깥: 은은하게
      { rangeMult: 0.85, alpha: 0.5, angleBonus: 0 }, // 중간
      { rangeMult: 0.65, alpha: 0.75, angleBonus: -0.04 }, // 안쪽: 밝아짐
      { rangeMult: 0.4, alpha: 1.0, angleBonus: -0.1 }, // 코어: 가장 밝고 좁음
    ];

    for (const layer of layers) {
      const layerRange = coneRange * layer.rangeMult;
      const layerHalf = coneHalfRad + layer.angleBonus;
      // angleBonus가 음수 = 안쪽 레이어가 더 좁음 → 가장자리 페이드

      ctx.beginPath();
      ctx.moveTo(px, py);

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = aimAngle - layerHalf + t * layerHalf * 2;
        ctx.lineTo(
          px + Math.cos(angle) * layerRange,
          py + Math.sin(angle) * layerRange
        );
      }

      ctx.closePath();
      ctx.fillStyle = `rgba(255,255,255,${layer.alpha})`;
      ctx.fill();
    }

    // --- 끝부분 둥근 확산 (타원형 글로우) ---
    // 부채꼴 끝에 부드러운 원형 빛을 추가해서 퍼지는 느낌
    const tipX = px + Math.cos(aimAngle) * coneRange * 0.7;
    const tipY = py + Math.sin(aimAngle) * coneRange * 0.7;
    const tipRadius = coneRange * 0.35;

    const tipGrad = ctx.createRadialGradient(
      tipX,
      tipY,
      0,
      tipX,
      tipY,
      tipRadius
    );
    tipGrad.addColorStop(0, "rgba(255,255,255,0.4)");
    tipGrad.addColorStop(0.5, "rgba(255,255,255,0.15)");
    tipGrad.addColorStop(1, "rgba(255,255,255,0)");

    ctx.beginPath();
    ctx.arc(tipX, tipY, tipRadius, 0, Math.PI * 2);
    ctx.fillStyle = tipGrad;
    ctx.fill();

    // === 그리기 모드로 전환 ===
    ctx.globalCompositeOperation = "source-over";

    // === 시야 밖 좀비 눈 빛나기 ===
    const coneSightHalf = coneHalfRad;

    this.zombies.getChildren().forEach((z) => {
      const zombie = z as Phaser.Physics.Arcade.Sprite;
      if (!zombie.active) return;

      // 좀비도 같은 방식으로 화면 좌표 변환
      const zScreenX = (zombie.x - playerScreen.x) * zoom;
      const zScreenY = (zombie.y - playerScreen.y) * zoom;

      // 화면 좌표끼리 각도 계산
      const zombieAngle = Phaser.Math.Angle.Between(px, py, zScreenX, zScreenY);
      const angleDiff = Math.abs(
        Phaser.Math.Angle.Wrap(zombieAngle - aimAngle)
      );

      // 발밑 원형(70px) 안이면 눈 그리지 않음
      const dist = Phaser.Math.Distance.Between(px, py, zScreenX, zScreenY);
      if (dist < 70) return;

      if (angleDiff >= coneSightHalf) {
        if (dist > 800) return;

        const brightness = 1 - dist / 800;
        const eyeOffset = 4;
        const perpAngle = zombieAngle + Math.PI / 2;

        const leftEyeX = zScreenX + Math.cos(perpAngle) * eyeOffset;
        const leftEyeY = zScreenY + Math.sin(perpAngle) * eyeOffset;

        const rightEyeX = zScreenX - Math.cos(perpAngle) * eyeOffset;
        const rightEyeY = zScreenY - Math.sin(perpAngle) * eyeOffset;

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
