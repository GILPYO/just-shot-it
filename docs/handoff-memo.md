# 인수인계 메모

## 현재 상태: Phase 2 진행 중

### ✅ Phase 1 완료
- 이동 (WASD) + 대각선 정규화
- 달리기 (Shift) + 스태미너
- ADS 조준사격 (우클릭) + 탄퍼짐
- 재장전 (R키) + 장탄수 15발
- 좀비 스폰 (플레이어 기준 500px 원형) + 추적
- 좀비 사살 + 피격 시스템
- 경험치 젬 + 레벨업 + 자석 효과
- 카메라 팔로우 + 줌아웃 (0.5)
- 플래시라이트 (별도 Canvas, 5겹 부채꼴 페이드 + 글로우)
- 시야 밖 좀비 빨간 눈
- HUD (HP/스태미너 세그먼트 게이지 + 탄약 + 경험치바)
- Tailwind CSS 설치 완료

### ✅ Phase 2 진행 중 — 레벨업 카드 UI 기본 완성
- `src/types/cards.ts` — CardType, LevelUpCard 타입 + 색상/라벨 상수
- `src/ui/levelup/LevelUpCard.tsx` — 카드 1장 컴포넌트 (도트 감성)
- `src/ui/levelup/LevelUpOverlay.tsx` — 오버레이 (배경 + 타이틀 + 카드 5장)
- `GameScene.ts` — generateCards() + levelup-open emit + levelup-select 수신
- `App.tsx` — EventBus 연동 + 오버레이 표시/닫기

### 🔧 다음에 할 것

#### 1. 카드 선택 효과 적용 (바로 이어서!)
현재 카드 선택하면 콘솔에 index만 찍히고 실제 효과 없음.
`GameScene.ts`의 `levelup-select` 리스너에서 TODO 부분:

```typescript
EventBus.on("levelup-select", (data: { index: number }) => {
  //TODO: 선택한 카드 효과 적용
  this.time.delayedCall(1, () => {
    this.input.enabled = true;
    this.scene.resume();
  });
});
```

generateCards()에서 만든 카드 배열을 클래스 변수에 저장해두고, 선택된 index의 카드 효과 적용 필요:
- weapon → 보조무기/근접무기 장착
- ammo → 탄종 장착
- stat → 스탯 증가 (데미지/이속/HP)
- passive → 패시브 스킬 활성화

#### 2. 보조무기 자동 발사 시스템
#### 3. 근접무기 자동 공격 (6종 고유 패턴)
#### 4. 탄종 시스템 (무기별 장착, Lv.1~8)
#### 5. 보스 시스템
#### 6. 패시브 스킬

---

## 카드 시스템 EventBus 흐름

```
레벨업 → GameScene: generateCards()
       → EventBus.emit("levelup-open", {level, cards})
       → App.tsx: setLevelUp(data) → <LevelUpOverlay> 표시
       → 유저 카드 클릭
       → EventBus.emit("levelup-select", {index})
       → GameScene: 효과 적용 → delayedCall(1) → scene.resume()
```

### 카드 5장 생성 규칙
- 1장: 무기 카드 보장
- 4장: 전체 풀(무기/탄종/스탯/패시브)에서 랜덤

---

## 기획 대규모 변경 (2026-09-04)

### 무기 시스템
- 스왑 시스템 삭제
- 3무기 + 6패시브 (딥락 서바이버 스타일)
  - 주무기: 캐릭터 고정, 직접 조준 (교체 불가)
  - 보조무기: 카드 획득, 자동 발사 (1개)
  - 근접무기: 카드 획득, 자동 고유공격 (1개)

### 탄종 시스템 (파츠 교체)
- 무기별 탄종 1개 장착, Lv.1~8
- 교체 시 Lv.1 리셋
- 에볼루션: 주무기 MAX + 특정 탄종 = 진화

### 캐릭터: 세계 특수부대 + 대표 총기

### 근접무기 6종
- 필드 대거(날아감), 구르카(선회), 장검(채찍), 철퇴(둔화), 전투도끼(360도), 마체테(연타)

---

## Phaser 4 pause/resume 삽질 기록 (중요!)

### ❌ 실패한 방식들

| 방식 | 에러 |
|------|------|
| `this.scene.pause()` + `this.scene.resume()` | `Cannot read properties of null (reading 'queueOp')` |
| `this.physics.pause()` + `this.physics.resume()` | `Cannot read properties of null (reading 'resume')` |
| `this.time.delayedCall()` 안에서 resume | pause 중에는 delayedCall 실행 안 됨 |
| `setTimeout` + `this.scene.resume()` | 같은 queueOp 에러 |

### ✅ 작동하는 방식: isPaused 플래그로 직접 관리

Phaser 4에서는 `scene.pause()/resume()`이 제대로 안 먹힘. **우리가 직접 플래그로 관리:**

```typescript
// 클래스 변수
private isPaused: boolean = false;

// 멈출 때 (레벨업 시)
this.isPaused = true;
EventBus.emit("levelup-open", { level, cards });

// 재개할 때 (카드 선택 시)
this.isPaused = false;

// update() 맨 위에서 체크
update(time: number, delta: number) {
  if (this.isPaused) return;  // 여기서 전부 멈춤
  // ...
}
```

**scene.pause(), physics.pause(), input.enabled 전부 사용하지 않음!**
isPaused가 true면 update()가 return해서 게임 로직 전체가 멈추고,
false로 바꾸면 다음 프레임부터 다시 돌아감.

## 주의사항
- Phaser 4에서 scene.pause/resume 쓰지 마! (위 삽질 참고)
- isPaused 플래그로 직접 관리
- 파일명 대소문자 주의: `LevelUpOverlay.tsx` (L 대문자)
- HUD z-index: 2 / 플래시라이트: 1 / 카드 오버레이: 50

## 플래시라이트 좌표 변환 (줌 0.5)
```typescript
const playerScreen = cam.getWorldPoint(0, 0);
const screenX = (worldX - playerScreen.x) * cam.zoom;
```

## 기획서 위치
- `/Users/ubion/workspace/just-shot-it/CLAUDE.md`
- `/Users/ubion/workspace/just-shot-it/docs/specs/2026-09-01-just-shot-it-design.md`
- `/Users/ubion/workspace/just-shot-it/docs/specs/2026-09-01-game-depth-design.md`
