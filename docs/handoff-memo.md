# 인수인계 메모

## 현재 상태: Phase 2 진행 중 (거의 완성!)

### ✅ Phase 1 완료
- 이동/달리기/스태미너/ADS/재장전/장탄수
- 좀비 스폰/추적/HP/데미지 계산
- 경험치 젬/레벨업/자석 효과
- 카메라 팔로우 + 줌아웃 (0.5)
- 플래시라이트 (5겹 부채꼴 + 글로우)
- 시야 밖 좀비 빨간 눈
- HUD (세그먼트 게이지 + Tailwind)

### ✅ Phase 2 완료된 것
- 레벨업 카드 선택 UI (React + EventBus)
- 카드 효과 적용 (stat/weapon/ammo/passive)
- 주무기 시스템 (G17 고정, 레벨업)
- 보조무기 자동 발사 (가장 가까운 적)
- 근접무기 필드 대거 (부메랑 패턴)
- 좀비 HP + 탄종 데미지 배율 반영
- 탄종 시스템 (FMJ/HP/AP 장착 + 레벨업)
- 패시브: 지뢰 (자동 설치 + 범위 폭발)
- 패시브: 가시 철조망 (틱 데미지 + 점선 원 시각화)
- 패시브: 드론 (빙글빙글 선회 + 자동 발사 + 보라색 시각화)
- isPaused 시스템 (스폰/사살/피격/좀비이동 전부 멈춤)

### 🔧 다음에 할 것 — 보스 시스템!

#### 보스 구현 순서:
1. **레벨 10 도달 시 보스 스폰** — 큰 좀비 (HP 높음, 크기 크게)
2. **보스 HP 바** — 화면 상단에 보스 체력 표시
3. **보스 처치 보상** — 패시브 3개 중 선택 or 상점

#### 보스 후에:
- 난이도 스케일링 (좀비 속도/HP/스폰 간격이 레벨에 따라 증가)
- 게임오버 화면 (React)
- 메인메뉴 화면

---

## 기획 대규모 변경 (2026-09-07)

### 무기 시스템 최종 확정
- 주무기: 캐릭터 고정, 직접 조준 (교체 불가)
- 보조무기: 카드 획득, 자동 발사 (1개)
- 근접무기: 카드 획득, 자동 고유공격 (1개)
- 최대: 3무기 + 6패시브

### 탄종 시스템 (파츠 완전 폐기)
- 탄종 = 총알 업그레이드 (구경 구분 없음, 모든 총에 적용)
- 확장탄(갯수↑), 속도탄(탄속↑), 소이탄(화염), 장갑탄(관통↑), 데미지탄(딜↑), 예광탄(크리↑)
- 각 무기별 탄종 1개 장착, Lv.1~8
- 교체 시 Lv.1 리셋

### 조합 시스템
- 무기 MAX + 특정 탄종 = 에볼루션 (진화)
- 패시브 MAX + 특정 탄종 = 합체 패시브
- 조합 레시피는 1:1 고정 (유저가 발견하는 재미)

### 캐릭터: 세계 특수부대
- 각 나라 특수부대 + 대표 총기 (경찰특공대/G17, 707/MR-4, UDT/SMG-5 등)

### 근접무기 6종 (고유 공격)
- 필드 대거(부메랑), 구르카(선회), 장검(채찍), 철퇴(둔화), 전투도끼(360도), 마체테(연타)

---

## 코드 구조 참고

### isPaused 시스템 (Phaser 4 주의!)
```
scene.pause/resume 사용 금지! (Phaser 4에서 에러남)
isPaused 플래그로 직접 관리:
- update() 맨 위에서 if (this.isPaused) return;
- 좀비 스폰 콜백에서 if (this.isPaused) return;
- 좀비 사살/피격 overlap에서 if (this.isPaused) return;
- isPaused 설정 시: player.setVelocity(0,0) + 좀비 전체 setVelocity(0,0)
```

### 카드 시스템 EventBus 흐름
```
레벨업 → generateCards() → isPaused=true → emit("levelup-open")
→ React LevelUpOverlay 표시 → 유저 클릭
→ emit("levelup-select") → applyCard() → isPaused=false
```

### 플래시라이트 좌표 변환 (줌 0.5)
```typescript
const playerScreen = cam.getWorldPoint(0, 0);
const screenX = (worldX - playerScreen.x) * cam.zoom;
```

### 패시브 구조
```typescript
private passiveSkills: Map<string, { level: number }> = new Map();
// has("landmine") → 보유 여부
// get("landmine")!.level → 현재 레벨
// set("landmine", { level: 1 }) → 장착
```

---

## 기획서 위치
- `/Users/ubion/workspace/just-shot-it/CLAUDE.md`
- `/Users/ubion/workspace/just-shot-it/docs/specs/2026-09-01-just-shot-it-design.md`
- `/Users/ubion/workspace/just-shot-it/docs/specs/2026-09-01-game-depth-design.md`

## 주의사항
- `landmineTimer` 오타 주의 (landminerTimer 아님!)
- Phaser 4에서 scene.pause/resume 쓰지 마!
- isPaused일 때 모든 물리 충돌에 체크 필요
- 파일명 대소문자: LevelUpOverlay.tsx (L 대문자)
- HUD z-index: 2 / 플래시라이트: 1 / 카드 오버레이: 50
