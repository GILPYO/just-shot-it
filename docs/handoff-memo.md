# 인수인계 메모

## 현재 Phase 1 진행 상태

- ✅ 이동 (WASD) + 대각선 정규화
- ✅ 달리기 (Shift) + 스태미너
- ✅ ADS 조준사격 (우클릭) + 탄퍼짐
- ✅ 재장전 (R키) + 장탄수
- ✅ 경험치 젬 + 레벨업 + 자석 효과
- ✅ 플래시라이트 (별도 Canvas + 부채꼴)
- ✅ 시야 밖 좀비 눈 빛나기 (빨간 눈)
- ✅ 시야 시스템 (플래시라이트 안=선명, 밖=투명)
- 🔧 HUD (React) ← 다음에 할 것

## 다음에 할 것: HUD (React 오버레이)

Phaser 위에 React 컴포넌트로 HUD를 겹치는 방식.
EventBus로 GameScene → React 데이터 전달.

표시할 정보:
- HP 바 (빨간색)
- 스태미너 바 (노란색)
- 경험치 바 (시안)
- 레벨 표시
- 잔탄수 (현재/최대)
- ADS/재장전 상태

## 플래시라이트 구현 (삽질 기록)

### ❌ 실패한 방식들

| 방식 | 왜 안 됐나 |
|------|-----------|
| Phaser Graphics + MULTIPLY 블렌드 | WebGL에서 블렌드모드가 불안정 |
| RenderTexture draw() + erase() | setVisible(false)인 Graphics를 무시하는 버그 |
| Phaser canvas에 직접 Canvas2D | Phaser가 WebGL 모드면 getContext('2d')가 null |

### ✅ 작동하는 방식: 별도 HTML Canvas 오버레이

핵심 코드:

```typescript
// create()에서: Phaser 위에 별도 Canvas 생성
const gameContainer = document.getElementById('game-container');
const lightCanvas = document.createElement('canvas');
lightCanvas.width = 1280;
lightCanvas.height = 720;
lightCanvas.style.position = 'absolute';
lightCanvas.style.top = '0';
lightCanvas.style.left = '0';
lightCanvas.style.pointerEvents = 'none';
lightCanvas.style.zIndex = '1';
gameContainer.appendChild(lightCanvas);
const ctx = lightCanvas.getContext('2d');

// drawFlashLight()에서 매 프레임:
// 1. 전체 어둡게
ctx.clearRect(0, 0, 1280, 720);
ctx.globalCompositeOperation = 'source-over';
ctx.fillStyle = 'rgba(0,0,0,0.80)';
ctx.fillRect(0, 0, 1280, 720);

// 2. 빛 영역 잘라내기
ctx.globalCompositeOperation = 'destination-out';
// 발밑 원형 + 부채꼴 그리기...

// 3. 그리기 모드로 전환 후 좀비 눈 그리기
ctx.globalCompositeOperation = 'source-over';
// 빨간 눈 그리기...
```

### 시야 밖 좀비 처리

- update()에서 좀비가 플래시라이트 안이면 `setAlpha(1.0)`, 밖이면 `setAlpha(0)`
- drawFlashLight()에서 시야 밖 좀비의 빨간 눈 2개를 Canvas2D로 그림
- 거리에 따라 눈 밝기 조절 (가까울수록 밝음, 400px 이상이면 안 보임)
- debug: false 해야 물리 충돌 박스가 안 보임

## 기획서 위치

- `/Users/ubion/workspace/just-shot-it/CLAUDE.md`
- `/Users/ubion/workspace/just-shot-it/docs/specs/2026-09-01-just-shot-it-design.md`
- `/Users/ubion/workspace/just-shot-it/docs/specs/2026-09-01-game-depth-design.md`
