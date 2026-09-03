# 인수인계 메모

## Phase 1 완료 상태

### ✅ 구현 완료

- 이동 (WASD) + 대각선 정규화
- 달리기 (Shift) + 스태미너 (소모/회복)
- ADS 조준사격 (우클릭) + 탄퍼짐 (hip-fire 10도 / ADS 3도)
- 재장전 (R키) + 장탄수 15발
- 좀비 스폰 (플레이어 기준 500px 원형) + 추적
- 좀비 사살 + 피격 시스템
- 경험치 젬 드랍 + 수집 + 자석 효과 (50px)
- 레벨업 시스템 (경험치 곡선 적용)
- 카메라 팔로우 + 줌아웃 (0.5)
- 플래시라이트 (별도 Canvas 오버레이, 5겹 부채꼴 + 끝부분 글로우)
- 시야 밖 좀비 빨간 눈 (거리 기반 밝기)
- 시야 시스템 (플래시라이트 안=보임, 밖=투명, 발밑 140px=무조건 보임)
- HUD 컴포넌트 분리 (React + Tailwind)
- EventBus로 Phaser → React 데이터 전달

### 🔧 다음에 할 것

#### 1. HUD 디자인 시안 + 구현 (우선!)

HUD 컴포넌트는 분리되어 있고 EventBus 연결도 되어있음. 디자인만 입히면 됨.

**파일 구조:**

```
src/ui/
├── HUD.tsx                ← 컨테이너 (레이아웃만)
├── hud.css                ← CSS 변수 정의됨
├── components/
│   ├── HealthBar.tsx      ← EventBus 연결 완료, 스타일만 입히면 됨
│   ├── StaminaBar.tsx     ← 뼈대만 있음
│   ├── ExpBar.tsx         ← 뼈대만 있음
│   └── AmmoDisplay.tsx    ← 뼈대만 있음
src/types/
└── hud.ts                 ← HudData 타입 정의
```

**Tailwind 설치 완료** — `className`에 바로 사용 가능.

**HUD 레이아웃:**

```
┌──────────────────────────────────────────┐
│ [HP 바]          좌상단                    │
│ [스태미너 바]                              │
│                                           │
│                                           │
│                                           │
│                     [탄약 12/15] 우하단    │
│                     [ADS] [RELOADING]     │
│ LV 3 [경험치 바 ━━━━━━━━━━━━━━] 하단     │
└──────────────────────────────────────────┘
```

**디자인 시안 요청 방법:**
클로드 코드에게 "HUD 디자인 시안을 HTML로 만들어줘"라고 하면 브라우저에서 바로 확인 가능.
참고할 컬러 토큰 (hud.css에 정의됨):

- HP: `#e4584a` (빨강) / 배경: `#3a1512`
- 스태미너: `#c6b189` (황토) / 배경: `#2a2418`
- 경험치: `#79d2dc` (시안) / 배경: `#1a2e30`
- 탄약: `#dde3d8` (밝은 회색)
- 잔탄 부족: `#e4584a` (빨강)
- 보조 텍스트: `#6b7566`

분위기: 다크 미니멀, 도트 게임 감성, 화면 가리지 않게 얇고 작게

**EventBus 데이터 수신 패턴 (모든 컴포넌트 동일):**

```tsx
import { useEffect, useState } from "react";
import EventBus from "../../EventBus";
import { type HudData } from "../../types/hud";

export const 컴포넌트 = () => {
  const [값, set값] = useState(초기값);

  useEffect(() => {
    const handler = (data: HudData) => {
      set값(data.필요한값);
    };
    EventBus.on("hud-update", handler);
    return () => { EventBus.off("hud-update", handler); };
  }, []);

  return ( /* tailwind로 스타일 */ );
};
```

**GameScene에서 보내는 데이터:**

```typescript
EventBus.emit("hud-update", {
  hp,
  maxHp,
  stamina,
  maxStamina,
  currentAmmo,
  magazineSize,
  level,
  currentXp,
  xpToNext,
  isADS,
  isReloading,
});
```

#### 2. Phase 2 시작 (HUD 끝나면)

- 근접무기 (야구방망이) + 3슬롯 스왑 (1/2/3키)
- 보스 시스템 (10레벨마다)
- 패시브 스킬 4종 (지뢰, 철조망, 드론, 섬광탄)
- 레벨업 카드 5장 선택 시스템
- 난이도 스케일링 (좀비 속도/스폰 증가)

---

## 플래시라이트 구현 기록 (중요!)

### ❌ 실패한 방식들

| 방식                              | 왜 안 됐나                         |
| --------------------------------- | ---------------------------------- |
| Phaser Graphics + MULTIPLY 블렌드 | WebGL에서 블렌드모드 불안정        |
| RenderTexture draw() + erase()    | setVisible(false) 객체 무시 버그   |
| Phaser canvas에 직접 Canvas2D     | WebGL 모드면 getContext('2d') null |

### ✅ 작동하는 방식: 별도 HTML Canvas 오버레이

- `document.createElement('canvas')`로 Phaser 위에 겹침
- `pointerEvents: none` + `zIndex: 1`
- `globalCompositeOperation: destination-out`으로 어둠에 구멍 뚫기
- 5겹 레이어로 부드러운 페이드 + 끝부분 글로우

### 좌표 변환 (줌 보정)

카메라 줌 0.5 사용 중. 월드좌표 → 화면좌표 변환 공식:

```typescript
const playerScreen = cam.getWorldPoint(0, 0); // 카메라 좌상단
const screenX = (worldX - playerScreen.x) * cam.zoom;
const screenY = (worldY - playerScreen.y) * cam.zoom;
```

### 시야 밖 좀비

- 플래시라이트 안: `setAlpha(1.0)` + 빨간 틴트
- 플래시라이트 밖: `setAlpha(0.01)` (0으로 하면 충돌 무시됨!)
- 발밑 140px 이내: 무조건 보임
- 시야 밖 좀비는 Canvas2D로 빨간 눈 2개 그림 (거리 기반 밝기)

---

## 주의사항

- HUD `z-index: 2` (플래시라이트 캔버스가 1)
