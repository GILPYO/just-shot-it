import { type LevelUpCard } from "./../../types/cards";
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

  // 게임 일시정지 (카드 선택 중)
  private isPaused: boolean = false;

  // 무슨 카드 선택했는지
  private currentCards: LevelUpCard[] = [];

  // 주 무기 시스템 ( 캐릭터별 주 무기 셋팅 )
  private primaryWeapon = {
    id: "g17",
    name: "G17",
    level: 1,
    damage: 8,
    fireRate: 400,
    magazineSize: 15,
    reloadTime: 1200,
    bulletSpeed: 1000,
    range: 300,
    auto: false,
  };
  // 보조 무기 시스템
  private subWeapon: {
    id: string;
    name: string;
    level: number;
    damage: number;
    fireRate: number;
    range: number;
    bulletSpeed: number;
    auto: boolean;
  } | null = null;
  // 보조 무기 발사 타이머
  private subWeaponTimer: number = 0;

  // 근접 무기 시스템
  private meleeWeapon: {
    id: string;
    name: string;
    level: number;
    damage: number;
    cooldown: number;
    range: number;
    speed: number;
    pattern: string;
  } | null = null;
  private meleeCooldownTimer: number = 0;
  private meleeProjectTiles: Phaser.Physics.Arcade.Group | null = null;

  // 탄종 시스템
  private primaryAmmo: {
    id: string;
    name: string;
    level: number;
    maxLevel: number;
    penetration: number;
    damageMultiplier: number;
    special: string;
  } | null = null;

  // 패시브 시스템
  private passiveSkills: Map<string, { level: number }> = new Map();

  // 지뢰
  private landmineTimer: number = 0;
  private landmines: Phaser.Physics.Arcade.Group | null = null;
  // 전기 철조망
  private barbedTimer: number = 0;
  // 드론
  private droneAngle: number = 0;
  private droneFireTimer: number = 0;

  // 보스 시스템
  private bossActive: boolean = false;
  private bossSprite: Phaser.Physics.Arcade.Sprite | null = null;
  private bossHp: number = 0;
  private bossMaxHp: number = 0;
  private bossNumber: number = 0;
  private killCount: number = 0;

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

    // === 주무기 스탯을 게임 변수에 반영 ===
    this.magazineSize = this.primaryWeapon.magazineSize;
    this.currentAmmo = this.primaryWeapon.magazineSize;
    this.reloadTime = this.primaryWeapon.reloadTime;

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

      const bulletSpeed = this.primaryWeapon.bulletSpeed;

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
        if (this.isPaused) return; // 카드 선택 중 스폰 멈춤!

        const angle = Math.random() * Math.PI * 2;
        const distance = 500;
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;

        const spawnCount = Math.floor(1 + this.level * 0.25);
        for (let s = 0; s < spawnCount; s++) {
          const sAngle = Math.random() * Math.PI * 2;
          const sx = this.player.x + Math.cos(sAngle) * distance;
          const sy = this.player.y + Math.sin(sAngle) * distance;
          const zombie = this.zombies.create(
            sx,
            sy,
            "zombie"
          ) as Phaser.Physics.Arcade.Sprite;
          const tier = Math.floor((this.level - 1) / 10);
          const posInTier = (this.level - 1) % 10;
          const tierGrowth = posInTier <= 2 ? 0 : (posInTier - 2) * 3;
          zombie.setData("hp", 8 + tier * 20 + tierGrowth);
        }
      },
    });

    // 좀비 사살 시스템
    this.physics.add.overlap(this.bullets, this.zombies, (bullet, zombie) => {
      if (this.isPaused) return; // 카드 선택 중 사살 멈춤!
      const z = zombie as Phaser.Physics.Arcade.Sprite;

      // 탄종 데미지 배율 적용
      const ammoMult = this.primaryAmmo ? this.primaryAmmo.damageMultiplier : 1;
      const damage = this.primaryWeapon.damage * ammoMult;

      // 좀비 HP 감소
      const currentHp = z.getData("hp") ?? 20;
      const newHp = currentHp - damage;
      z.setData("hp", newHp);

      // 피격 이벤트 ( 하얀색 )
      z.setTint(0xffffff);
      this.time.delayedCall(50, () => {
        if (z.active) z.clearTint();
      });

      bullet.destroy();

      // HP 0 이하면 사망
      if (newHp <= 0) {
        const gem = this.gems.create(
          z.x,
          z.y,
          "gem"
        ) as Phaser.Physics.Arcade.Sprite;

        if (z.getData("isBoss")) {
          gem.setData("value", 50);
          this.bossActive = false;
          this.bossSprite = null;
          console.log(`보스 ${this.bossNumber} 처치!`);
        } else {
          gem.setData("value", 5);
        }
        this.killCount++;
        z.destroy();
      }
    });

    // 피격 시스템
    this.physics.add.overlap(this.player, this.zombies, () => {
      if (this.isPaused) return;
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
        this.hp = 0;
        EventBus.emit("hud-update", {
          hp: 0,
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
        this.isPaused = true;
        EventBus.emit("game-over", {
          level: this.level,
          kills: this.killCount,
          bossKills: this.bossNumber,
        });
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

        this.currentCards = this.generateCards();
        this.player.setVelocity(0, 0);
        // 좀비도 전부 멈춤
        this.zombies.getChildren().forEach((z) => {
          const zombie = z as Phaser.Physics.Arcade.Sprite;
          zombie.setVelocity(0, 0);
        });
        if (this.level % 10 == 0 && !this.bossActive) {
          this.spawnBoss();
        }
        this.isPaused = true;
        EventBus.emit("levelup-open", {
          level: this.level,
          cards: this.currentCards,
        });
      }
    });

    // 근접무기 투사체 그룹
    const meleeGraphics = this.make.graphics({ x: 0, y: 0 });
    meleeGraphics.fillStyle(0xffffff);
    meleeGraphics.fillRect(0, 0, 10, 10);
    meleeGraphics.generateTexture(`melee`, 10, 10);
    meleeGraphics.destroy();

    this.meleeProjectTiles = this.physics.add.group();

    // 근접무기 -> 좀비 충돌
    this.physics.add.overlap(
      this.meleeProjectTiles,
      this.zombies,
      (proj, zombie) => {
        const z = zombie as Phaser.Physics.Arcade.Sprite;
        const p = proj as Phaser.Physics.Arcade.Sprite;

        // 이미 때린 적은 무시
        const hitList: Set<number> = p.getData("hitList") || new Set();
        const zombieId = z.getData(`id`) ?? z.y + 10000 + z.x;

        if (hitList.has(zombieId)) return;
        hitList.add(zombieId);
        p.setData(`hitList`, hitList);

        // 젬 드랍 좀비 제거
        const gem = this.gems.create(
          z.x,
          z.y,
          `gem`
        ) as Phaser.Physics.Arcade.Sprite;
        gem.setData(`value`, 5);
        z.destroy();
      }
    );

    // 지뢰 시스템
    const mineGraphics = this.make.graphics({ x: 0, y: 0 });
    mineGraphics.fillStyle(0xff0000);
    mineGraphics.fillCircle(6, 6, 6);
    mineGraphics.generateTexture("mine", 12, 12);
    mineGraphics.destroy();

    this.landmines = this.physics.add.group();

    // 지뢰 -> 좀비 충돌
    this.physics.add.overlap(this.landmines, this.zombies, (mine, zombie) => {
      if (this.isPaused) return;
      const m = mine as Phaser.Physics.Arcade.Sprite;
      const z = mine as Phaser.Physics.Arcade.Sprite;

      // 폭발 후 주변 데미지
      this.zombies.getChildren().forEach((zz) => {
        const zTarget = zz as Phaser.Physics.Arcade.Sprite;
        const dist = Phaser.Math.Distance.Between(
          m.x,
          m.y,
          zTarget.x,
          zTarget.y
        );
        if (dist < 80) {
          const hp = zTarget.getData("hp") ?? 20;
          zTarget.setData("hp", hp - 25);
          if (hp - 25 <= 0) {
            const gem = this.gems.create(
              zTarget.x,
              zTarget.y,
              "gem"
            ) as Phaser.Physics.Arcade.Sprite;
            gem.setData("value", 5);
            zTarget.destroy();
          }
        }
      });
      m.destroy();
    });

    // 보스 텍스처
    const bossGraphics = this.make.graphics({ x: 0, y: 0 });
    bossGraphics.fillStyle(0x9900ff);
    bossGraphics.fillRect(0, 0, 56, 56);
    bossGraphics.generateTexture("boss", 56, 56);
    bossGraphics.destroy();

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

    // 카드 선택 완료 이벤트 수신
    EventBus.on("levelup-select", (data: { index: number }) => {
      const card = this.currentCards[data.index];
      if (!card) return;

      this.applyCard(card);
      this.isPaused = false;
    });
  }

  update(time: number, delta: number) {
    if (this.isPaused) return; // 카드 선택 중이면 업데이트 멈춤
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
      const zombieSpeed = zombie.getData("isBoss")
        ? 50
        : Math.min(150, 80 + this.level * 1.5);
      this.physics.moveToObject(zombie, this.player, zombieSpeed);

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

    if (this.subWeapon) {
      this.subWeaponTimer += delta;

      if (this.subWeaponTimer >= this.subWeapon.fireRate) {
        this.subWeaponTimer = 0;

        let closest: Phaser.Physics.Arcade.Sprite | null = null;
        let closestDist = this.subWeapon.range;

        this.zombies.getChildren().forEach((z) => {
          const zombie = z as Phaser.Physics.Arcade.Sprite;
          const dist = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            zombie.x,

            zombie.y
          );
          if (dist < closestDist) {
            closestDist = dist;
            closest = zombie;
          }
        });

        if (closest) {
          const subAngle = Phaser.Math.Angle.Between(
            this.player.x,
            this.player.y,
            (closest as Phaser.Physics.Arcade.Sprite).x,
            (closest as Phaser.Physics.Arcade.Sprite).y
          );
          const bullet = this.bullets.create(
            this.player.x,
            this.player.y,
            `player`
          ) as Phaser.Physics.Arcade.Sprite;

          bullet.setScale(0.15);
          bullet.setTint(0x00ffff);

          bullet.setVelocity(
            Math.cos(subAngle) * this.subWeapon.bulletSpeed,
            Math.sin(subAngle) * this.subWeapon.bulletSpeed
          );
        }
      }
    }

    // === 근접무기 자동 공격 === (보조무기와 별개!)
    if (this.meleeWeapon && this.meleeProjectTiles) {
      this.meleeCooldownTimer += delta;

      if (this.meleeCooldownTimer >= this.meleeWeapon.cooldown) {
        this.meleeCooldownTimer = 0;

        let closest: Phaser.Physics.Arcade.Sprite | null = null;
        let closestDist = this.meleeWeapon.range * 2;

        this.zombies.getChildren().forEach((z) => {
          const zombie = z as Phaser.Physics.Arcade.Sprite;
          const dist = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            zombie.x,
            zombie.y
          );
          if (dist < closestDist) {
            closestDist = dist;
            closest = zombie;
          }
        });

        if (closest) {
          this.fireMelee(closest as Phaser.Physics.Arcade.Sprite);
        }
      }

      this.updateMeleeProjectTiles();
    }

    // === 지뢰 자동 설치 ===
    if ((this, this.passiveSkills.has("landmine") && this.landmines)) {
      this.landmineTimer += delta;
      if (this.landmineTimer >= 5000) {
        this.landmineTimer = 0;

        const mine = this.landmines?.create(
          this.player.x,
          this.player.y,
          "mine"
        ) as Phaser.Physics.Arcade.Sprite;

        // 안 밟히면 30초후 소멸
        this.time.delayedCall(30000, () => {
          if (mine.active) mine.destroy();
        });
      }
    }

    // 가시 철조망 ( 주변 틱 데미지 )
    if ((this, this.passiveSkills.has("barbed"))) {
      this.barbedTimer += delta;

      if (this.barbedTimer >= 500) {
        this.barbedTimer = 0;
        const range = 100;
        const damage = 3;

        this.zombies.getChildren().forEach((z) => {
          const zombie = z as Phaser.Physics.Arcade.Sprite;
          const dist = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            zombie.x,
            zombie.y
          );

          if (dist < range) {
            const hp = zombie.getData("hp") ?? 20;
            zombie.setData("hp", hp - damage);
            zombie.setTint(0x00ff00);
            this.time.delayedCall(100, () => {
              if (zombie.active) zombie.clearTint();
            });

            if (hp - damage <= 0) {
              const gem = this.gems.create(
                zombie.x,
                zombie.y,
                "gem"
              ) as Phaser.Physics.Arcade.Sprite;
              gem.setData("value", 5);
              zombie.destroy();
            }
          }
        });
      }
    }

    if (this.passiveSkills.has("drone")) {
      this.droneAngle += delta * 0.002;
      const droneX = this.player.x + Math.cos(this.droneAngle) * 60;
      const droneY = this.player.y + Math.sin(this.droneAngle) * 60;

      this.droneFireTimer += delta;
      if (this.droneFireTimer >= 1000) {
        this.droneFireTimer = 0;

        let closest: Phaser.Physics.Arcade.Sprite | null = null;
        let closestDist = 300;

        this.zombies.getChildren().forEach((z) => {
          const zombie = z as Phaser.Physics.Arcade.Sprite;
          const dist = Phaser.Math.Distance.Between(
            droneX,
            droneY,
            zombie.x,
            zombie.y
          );
          if (dist < closestDist) {
            closestDist = dist;
            closest = zombie;
          }
        });

        if (closest) {
          const target = closest as Phaser.Physics.Arcade.Sprite;
          const angle = Phaser.Math.Angle.Between(
            droneX,
            droneY,
            target.x,
            target.y
          );
          const bullet = this.bullets.create(
            droneX,
            droneY,
            "player"
          ) as Phaser.Physics.Arcade.Sprite;
          bullet.setScale(0.1);
          bullet.setTint(0xff00ff);
          bullet.setVelocity(Math.cos(angle) * 500, Math.sin(angle) * 500);
        }
      }
    }

    /// === 보스 행동 ===
    if (this.bossActive && this.bossSprite && this.bossSprite.active) {
      this.physics.moveToObject(this.bossSprite, this.player, 50);
      this.bossSprite.setAlpha(1.0);
    }

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

  private spawnBoss(): void {
    this.bossNumber++;
    this.bossMaxHp = 200 * this.bossNumber;
    this.bossHp = this.bossMaxHp;
    this.bossActive = true;

    const pointer = this.input.activePointer;
    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      pointer.worldX,
      pointer.worldY
    );
    const x = this.player.x + Math.cos(angle) * 300;
    const y = this.player.y + Math.sin(angle) * 300;

    this.bossSprite = this.zombies.create(
      x,
      y,
      "boss"
    ) as Phaser.Physics.Arcade.Sprite;
    this.bossSprite.setData("hp", this.bossMaxHp);
    this.bossSprite.setData("isBoss", true);

    console.log(`보스 ${this.bossNumber} 등장! HP: ${this.bossMaxHp}`);
  }

  // 레벨 업 카드 시스템
  private generateCards(): LevelUpCard[] {
    const meleeCards: LevelUpCard[] = [
      {
        id: "field_dagger",
        type: "weapon",
        name: "필드 대거",
        description: "적에게 날아갔다 돌아오는 나이프",
        levelFrom: 0,
        levelTo: 1,
      },
    ];

    const weaponCards: LevelUpCard[] = [
      {
        id: "g17",
        type: "weapon",
        name: "G17",
        description: "안정적인 권총",
        levelFrom: 0,
        levelTo: 1,
      },
      {
        id: "r870",
        type: "weapon",
        name: "R-870",
        description: "광역 넉백 샷건",
        levelFrom: 0,
        levelTo: 1,
      },
      {
        id: "smg5",
        type: "weapon",
        name: "SMG-5",
        description: "미친 연사 기관단총",
        levelFrom: 0,
        levelTo: 1,
      },
    ];

    const ammoCards: LevelUpCard[] = [
      {
        id: "fmj",
        type: "ammo",
        name: "FMJ",
        description: "관통 +1",
        levelFrom: 0,
        levelTo: 1,
      },
      {
        id: "hp",
        type: "ammo",
        name: "HP",
        description: "데미지 +40% 관통 불가",
        levelFrom: 0,
        levelTo: 1,
      },
      {
        id: "ap",
        type: "ammo",
        name: "AP",
        description: "장갑 무시",
        levelFrom: 0,
        levelTo: 1,
      },
    ];

    const statCards: LevelUpCard[] = [
      {
        id: "damage_up",
        type: "stat",
        name: "데미지 증가",
        description: "전체 무기 데미지 +15%",
        levelFrom: 0,
        levelTo: 1,
      },
      {
        id: "speed_up",
        type: "stat",
        name: "이동속도 증가",
        description: "이동속도 +10%",
        levelFrom: 0,
        levelTo: 1,
      },
      {
        id: "hp_up",
        type: "stat",
        name: "HP 증가",
        description: "최대 HP +10%",
        levelFrom: 0,
        levelTo: 1,
      },
    ];

    const passiveCard: LevelUpCard[] = [
      {
        id: "landmine",
        type: "passive",
        name: "지뢰",
        description: "5초마다 지뢰 자동 설치",
        levelFrom: 0,
        levelTo: 1,
      },
      {
        id: "drone",
        type: "passive",
        name: "드론",
        description: "자동 사격 드론 소환",
        levelFrom: 0,
        levelTo: 1,
      },
      {
        id: "barbed",
        type: "passive",
        name: "가시 철조망",
        description: "주변 적에게 지속 데미지",
        levelFrom: 0,
        levelTo: 1,
      },
    ];

    const cards: LevelUpCard[] = [];
    cards.push(weaponCards[Math.floor(Math.random() * weaponCards.length)]);

    const allCards = [
      ...weaponCards,
      ...ammoCards,
      ...passiveCard,
      ...statCards,
      ...meleeCards,
    ];
    for (let i = 0; i < 4; i++) {
      cards.push(allCards[Math.floor(Math.random() * allCards.length)]);
    }

    return cards;
  }

  // 카드 선택시 적용 시스템
  private applyCard(card: LevelUpCard): void {
    switch (card.type) {
      case "stat":
        if (card.id === "damage_up") {
          //TODO: 데미지 시스템 만들면 적용
          console.log("데미지 +15%");
        }
        if (card.id === "speed_up") {
          this.normalSpeed *= 1.1;
          this.sprintSpeed *= 1.1;
          console.log("이동속도 +10%", this.normalSpeed);
        }
        if (card.id === "hp_up") {
          this.maxHp = Math.floor(this.maxHp * 1.1);
          this.hp = Math.min(this.hp + 10, this.maxHp);
          console.log("최대HP + 10%", this.maxHp);
        }
        break;

      case "weapon":
        // === 근접 무기 체크 ===
        if (card.id == "field_dagger") {
          if (this.meleeWeapon && this.meleeWeapon.id == "field_dagger") {
            this.meleeWeapon.level++;
            this.meleeWeapon.damage += 3;
            this.meleeWeapon.cooldown = Math.max(
              800,
              this.meleeWeapon.cooldown - 100
            );
            console.log("근접무기 레벨 업! Lv.", this.meleeWeapon.level);
          } else {
            this.meleeWeapon = {
              id: "field_dagger",
              name: "필드 대거",
              level: 1,
              damage: 15,
              cooldown: 2000,
              range: 200,
              speed: 350,
              pattern: "boomerang",
            };
            console.log("근접무기 장착 : 필드 대거");
          }
          break;
        }

        // === 주무기와 같은 총 → 주무기 레벨업 ===
        if (card.id === this.primaryWeapon.id) {
          this.primaryWeapon.level++;
          console.log("주무기 레벨업! Lv.", this.primaryWeapon.level);
          // TODO: 레벨별 발사 패턴 진화

          // === 이미 가진 보조무기와 같은 총 → 보조무기 레벨업 ===
        } else if (this.subWeapon && card.id === this.subWeapon.id) {
          this.subWeapon.level++;
          console.log("보조무기 레벨업! Lv.", this.subWeapon.level);

          // === 새로운 총 → 보조무기로 장착 ===
        } else {
          // 각 무기별 스탯을 세팅
          if (card.id === "g17") {
            this.subWeapon = {
              id: "g17",
              name: "G17",
              level: 1,
              damage: 8,
              fireRate: 400,
              range: 300,
              bulletSpeed: 800,
              auto: false,
            };
          }
          if (card.id === "r870") {
            this.subWeapon = {
              id: "r870",
              name: "R-870",
              level: 1,
              damage: 18,
              fireRate: 900,
              range: 180,
              bulletSpeed: 600,
              auto: false,
            };
          }
          if (card.id === "smg5") {
            this.subWeapon = {
              id: "smg5",
              name: "SMG-5",
              level: 1,
              damage: 6,
              fireRate: 120,
              range: 250,
              bulletSpeed: 700,
              auto: false,
            };
          }
          this.subWeaponTimer = 0; // 타이머 리셋
          console.log("보조무기 장착:", this.subWeapon?.name);
        }
        break;

      case "ammo":
        // 주무기에 같은 탄종이면 레벨 업
        if (this.primaryAmmo && this.primaryAmmo.id == card.id) {
          if (this.primaryAmmo.level < this.primaryAmmo.maxLevel) {
            this.primaryAmmo.level++;
            console.log(
              "탄종 레벨 업!",
              this.primaryAmmo.name,
              this.primaryAmmo.level
            );
          }
        } else {
          // 새 탄종 장착 ( 기존 탄종 리셋 )
          if (card.id == "fmj") {
            this.primaryAmmo = {
              id: "fmj",
              name: "FMJ",
              level: 1,
              maxLevel: 8,
              penetration: 1,
              damageMultiplier: 1.0,
              special: "none",
            };
          }
          if (card.id == "hp") {
            this.primaryAmmo = {
              id: "hp",
              name: "HP",
              level: 1,
              maxLevel: 8,
              penetration: 0,
              damageMultiplier: 1.4,
              special: "none",
            };
          }
          if (card.id == "ap") {
            this.primaryAmmo = {
              id: "ap",
              name: "AP",
              level: 1,
              maxLevel: 8,
              penetration: 2,
              damageMultiplier: 0.9,
              special: "armor_ignore",
            };
          }
        }
        break;

      case "passive":
        if (card.id === "landmine") {
          if (this.passiveSkills.has("landmine")) {
            const skill = this.passiveSkills.get("landmine")!;
            skill.level++;
            console.log("지뢰 업그레이드", skill.level);
          } else {
            this.passiveSkills.set("landmine", { level: 1 });
            console.log("지뢰 장착!");
          }
        }
        if (card.id === "barbed") {
          if (this.passiveSkills.has("barbed")) {
            const skill = this.passiveSkills.get("barbed")!;
            skill.level++;
            console.log("철조망 레벨업! Lv.", skill.level);
          } else {
            this.passiveSkills.set("barbed", { level: 1 });
            console.log("철조망 장착!");
          }
        }
        if (card.id === "drone") {
          if (this.passiveSkills.has("drone")) {
            const skill = this.passiveSkills.get("drone")!;
            skill.level++;
            console.log("드론 레벨업! Lv.", skill.level);
          } else {
            this.passiveSkills.set("drone", { level: 1 });
            console.log("드론 장착!");
          }
        }
        break;
    }
  }

  private fireMelee(target: Phaser.Physics.Arcade.Sprite): void {
    if (!this.meleeWeapon || !this.meleeProjectTiles) return;

    const proj = this.meleeProjectTiles.create(
      this.player.x,
      this.player.y,
      `melee`
    ) as Phaser.Physics.Arcade.Sprite;

    proj.setTint(0xff8800);
    proj.setData(`hitList`, new Set());

    if (this.meleeWeapon.pattern == `boomerang`) {
      const angle = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        target.x,
        target.y
      );

      // 날아갈 목표 지점
      const targetX = this.player.x + Math.cos(angle) * this.meleeWeapon.range;
      const targetY = this.player.y + Math.sin(angle) * this.meleeWeapon.range;

      proj.setData("state", "flying");
      proj.setData("targetX", targetX);
      proj.setData("targetY", targetY);
      proj.setData("speed", this.meleeWeapon.speed);

      // 목표 방향으로 발사
      proj.setVelocity(
        Math.cos(angle) * this.meleeWeapon.speed,
        Math.sin(angle) * this.meleeWeapon.speed
      );
    }
  }

  private updateMeleeProjectTiles(): void {
    if (!this.meleeProjectTiles) return;

    this.meleeProjectTiles.getChildren().forEach((p) => {
      const proj = p as Phaser.Physics.Arcade.Sprite;
      if (!proj.active) return;

      const state = proj.getData(`state`);

      if (state == `flying`) {
        const targetX = proj.getData(`targetX`);
        const targetY = proj.getData(`targetY`);
        const dist = Phaser.Math.Distance.Between(
          proj.x,
          proj.y,
          targetX,
          targetY
        );

        if (dist < 20) {
          proj.setData(`state`, `returning`);
          proj.setData(`hitList`, new Set());
        }
      }

      if (state === `returning`) {
        const angle = Phaser.Math.Angle.Between(
          proj.x,
          proj.y,
          this.player.x,
          this.player.y
        );
        const speed = proj.getData(`speed`) * 1.2;
        proj.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

        const dist = Phaser.Math.Distance.Between(
          proj.x,
          proj.y,
          this.player.x,
          this.player.y
        );
        if (dist < 30) {
          proj.destroy();
        }
      }
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
    if (this.passiveSkills.has("barbed")) {
      ctx.globalCompositeOperation = "source-over";
      ctx.beginPath();
      ctx.arc(px, py, 100 * zoom, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 255, 100, 0.3)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalCompositeOperation = "destination-out";
    }
    // --- 드론 시각화 ---
    if (this.passiveSkills.has("drone")) {
      const droneScreenX =
        (this.player.x + Math.cos(this.droneAngle) * 60 - playerScreen.x) *
        zoom;
      const droneScreenY =
        (this.player.y + Math.sin(this.droneAngle) * 60 - playerScreen.y) *
        zoom;

      ctx.fillStyle = "rgba(255, 0, 255, 0.8)"; // 보라색
      ctx.fillRect(droneScreenX - 4, droneScreenY - 4, 8, 8);
    }
  }
}
