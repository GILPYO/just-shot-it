# 인수인계 메모

## 다음에 할 것: 경험치 젬 + 레벨업 시스템

### 1단계: 변수 추가 (재장전 시스템 밑에)

```typescript
// 경험치 & 레벨 시스템
private level: number = 1;
private currentXp: number = 0;
private xpToNext: number = 20;
private gems!: Phaser.Physics.Arcade.Group;
private magnetRange: number = 50;
```

### 2단계: create()에서 젬 텍스처 + 그룹 생성 (this.zombies = ... 밑에)

```typescript
// 경험치 젬 셋팅
const gemGraphics = this.make.graphics({ x: 0, y: 0 });
gemGraphics.fillStyle(0x00ffff);
gemGraphics.fillRect(0, 0, 8, 8);
gemGraphics.generateTexture(`gem`, 8, 8);
gemGraphics.destroy();

this.gems = this.physics.add.group();
```

### 3단계: 좀비 사살 시 젬 드랍 (기존 좀비 사살 시스템 교체)

```typescript
// 좀비 사살 시스템
this.physics.add.overlap(this.bullets, this.zombies, (bullet, zombie) => {
  const z = zombie as Phaser.Physics.Arcade.Sprite;

  // 좀비 위치에 경험치 젬 생성
  const gem = this.gems.create(z.x, z.y, `gem`) as Phaser.Physics.Arcade.Sprite;
  gem.setData(`value`, 5);

  bullet.destroy();
  zombie.destroy();
});
```

### 4단계: 젬 수집 + 레벨업 체크 (create() 피격 시스템 밑에 추가)

```typescript
// 젬 수집 시스템
this.physics.add.overlap(this.player, this.gems, (_player, gemObj) => {
  const gem = gemObj as Phaser.Physics.Arcade.Sprite;
  const value = gem.getData(`value`) as number;

  this.currentXp += value;
  gem.destroy();

  if (this.currentXp >= this.xpToNext) {
    this.currentXp -= this.xpToNext;
    this.level++;
    this.xpToNext = Math.floor(20 + this.level * 8 + this.level * this.level * 0.5);
    console.log(`LEVEL UP! Lv.${this.level} (next: ${this.xpToNext}xp)`);
  }

  console.log(`XP: ${this.currentXp}/${this.xpToNext}`);
});
```

### 5단계: update()에서 젬 자석 효과 (화면 밖 탄환 삭제 위에 추가)

```typescript
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
```

---

## 경험치 젬 이후 할 것

Phase 1 나머지:
- 플래시라이트 (부채꼴 조명)
- HUD (HP바, 스태미너바, 잔탄수, 레벨 표시) — React로

---

## 플래시라이트 구현 시 중요 (삽질 기록)

회사에서 프로토타입 만들면서 플래시라이트 구현에 여러 방식을 시도했고, **대부분 실패**했다.
아래 방식은 하지 마!

### ❌ 실패한 방식들

| 방식 | 왜 안 됐나 |
|------|-----------|
| Phaser Graphics + MULTIPLY 블렌드 | WebGL에서 블렌드모드가 불안정 |
| RenderTexture draw() + erase() | setVisible(false)인 Graphics를 무시하는 버그 |
| Phaser canvas에 직접 Canvas2D | Phaser가 WebGL 모드면 getContext('2d')가 null |

### ✅ 작동하는 방식: 별도 HTML Canvas 오버레이

Phaser 위에 **별도의 Canvas 엘리먼트**를 겹치고, 자체 2D context로 그리는 방식이 유일하게 작동했다.

핵심 코드:

```typescript
// create()에서: Phaser 위에 별도 Canvas 생성
const gameContainer = document.getElementById('game-container');
const lightCanvas = document.createElement('canvas');
lightCanvas.width = 960;   // 게임 해상도에 맞춤
lightCanvas.height = 640;
lightCanvas.style.position = 'absolute';
lightCanvas.style.top = '0';
lightCanvas.style.left = '0';
lightCanvas.style.pointerEvents = 'none';  // 마우스 이벤트는 Phaser로 통과
lightCanvas.style.zIndex = '1';            // Phaser 캔버스 위에 겹침
gameContainer.appendChild(lightCanvas);
const ctx = lightCanvas.getContext('2d');

// update() 매 프레임: 어둡게 칠하고 → 부채꼴 구멍 뚫기
ctx.clearRect(0, 0, 960, 640);

// 1. 전체 어둡게
ctx.globalCompositeOperation = 'source-over';
ctx.fillStyle = 'rgba(0, 0, 0, 0.80)';
ctx.fillRect(0, 0, 960, 640);

// 2. 빛 영역 잘라내기 (destination-out = 해당 영역을 지움)
ctx.globalCompositeOperation = 'destination-out';

// 발밑 원형
ctx.beginPath();
ctx.arc(playerScreenX, playerScreenY, 70, 0, Math.PI * 2);
ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
ctx.fill();

// 부채꼴 플래시라이트
ctx.beginPath();
ctx.moveTo(playerScreenX, playerScreenY);
for (let i = 0; i <= 24; i++) {
  const t = i / 24;
  const angle = aimAngle - halfRad + t * halfRad * 2;
  ctx.lineTo(
    playerScreenX + Math.cos(angle) * coneRange,
    playerScreenY + Math.sin(angle) * coneRange,
  );
}
ctx.closePath();
ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
ctx.fill();

// 3. 리셋
ctx.globalCompositeOperation = 'source-over';
```

포인트:
- `pointerEvents: 'none'` → 클릭/우클릭이 Phaser로 통과
- `globalCompositeOperation = 'destination-out'` → 어두운 레이어에 구멍을 뚫는 핵심
- playerScreenX/Y는 월드 좌표가 아니라 **카메라 기준 화면 좌표**여야 함

---

## 기획서 위치

- `/Users/ubion/workspace/just-shot-it/CLAUDE.md`
- `/Users/ubion/workspace/just-shot-it/docs/specs/2026-09-01-just-shot-it-design.md`
- `/Users/ubion/workspace/just-shot-it/docs/specs/2026-09-01-game-depth-design.md`
