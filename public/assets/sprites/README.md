# JUST SHOT IT! — 스프라이트 팩

Phaser 3 + React + TypeScript 프로젝트에 바로 넣을 수 있는 상태.
플레이어 1종 + 좀비 3종, 전부 **같은 좌표계**라 코드에서 시트만 갈아끼우면 된다.

---

## 1. 공통 규격 — 4종 전부 동일

| | 값 |
|---|---|
| 프레임 | **96 × 96** |
| 시트 | **864 × 768** (9열 × 8행) |
| 행 순서 | `s, se, e, ne, n, nw, w, sw` (위 → 아래) |
| 열 | 걷기 애니메이션 프레임 0~8 |
| 프레임 인덱스 | `row * 9 + col` |
| 접지선 (footY) | **86** |
| 몸 중심 (centerX) | **48** |
| 캐릭터 키 | 플레이어 80px / 좀비 78px |

**앵커는 (centerX, footY) = (48, 86)** 이다. 캐릭터의 월드 좌표가 이 점에 오도록 그린다.

```js
ctx.drawImage(sheet, col*96, row*96, 96, 96,
              screenX - 48, screenY - 86, 96, 96);
```

### 방향 → 행 매핑

조준/이동 각도(라디안, +x가 동쪽, +y가 남쪽)를 행 인덱스로:

```js
const OCT2ROW = [2,1,0,7,6,5,4,3];   // 0°=E부터 45°씩
function dirRow(ang){
  const a = (ang * 180/Math.PI + 360) % 360;
  return OCT2ROW[Math.round(a/45) % 8];
}
```

---

## 2. 파일

```
player/            hero80_walk8.png   hero80_idle8.png   hero80_walk.json
zombie_student/    zombie80_walk8.png zombie80_idle8.png zombie80_walk.json
zombie_hardhat/    hardhat80_walk8.png ...
zombie_fat/        fat80_walk8.png ...
reference/demo.html   ← 아래 내용이 전부 구현된 동작하는 데모 (단일 HTML)
```

`*_idle8.png` 는 걷기 0번 프레임을 8방향으로 모은 것(768×96). idle 상태에 쓰거나 무시해도 된다.

---

## 3. JSON 필드

```json
{ "frame": 96, "cols": 9, "dirs": ["s","se",...], "fps": 10,
  "footY": 86, "centerX": 48, "charHeight": 80,
  "walk": { "s": { "muzzle": [[x,y], ...], "bob": [...],
                   "contactFrames": [0,4], "source": "...", "mirrored": false } } }
```

- **`muzzle[frame]`** — 플레이어 전용. 프레임 로컬 좌표계(96×96)의 총구 위치.
  총구 화염, 예광탄 시작점, **손전등 원뿔의 원점**에 쓴다.
- **`contactFrames`** — 발이 땅에 닿는 프레임. 발소리·화면 흔들림 타이밍.
- **`bob`** — 프레임별 상하 흔들림(0번 프레임 기준 상대값). 참고용.
- **`limpHold` / `lurch`** — 좀비 JSON에만. §5 참고.
- **`mirrored`** — 그 방향이 반대쪽을 좌우반전해 만든 것인지. 렌더에는 영향 없음.

---

## 4. 총구 — 방향 사이 보간이 핵심

스프라이트는 8방향으로 끊기지만 마우스 조준은 연속이다.
행만 스냅하고 총구 좌표를 **인접한 두 방향 사이에서 보간**해야 화염과 조명이 안 튄다.

```js
function muzzleLocal(ang, frame){
  const a = ((ang*180/Math.PI) % 360 + 360) % 360;
  const k = a/45, i0 = Math.floor(k) % 8, i1 = (i0+1) % 8, t = k - Math.floor(k);
  const m0 = DATA.walk[DIRS[OCT2ROW[i0]]].muzzle[frame];
  const m1 = DATA.walk[DIRS[OCT2ROW[i1]]].muzzle[frame];
  return [m0[0] + (m1[0]-m0[0])*t, m0[1] + (m1[1]-m0[1])*t];
}
```

**손전등은 발밑이 아니라 총구에서 나가야 한다.** 이걸 안 하면 조준 방향과 빛이 어긋나
플레이어가 즉시 위화감을 느낀다.

---

## 5. 좀비 걸음 — 절뚝임은 코드로 만든다

스프라이트는 균일한 걷기 사이클이다. 좀비다움은 **재생 타이밍**에서 나온다.

```js
const HOLD = [1,1,3,2,1,1,1,2,1];        // 프레임별 지속 배수 (JSON limpHold)
const TOTAL = HOLD.reduce((a,b)=>a+b,0);

function limpFrame(z, t){                 // z = 좀비 인스턴스
  let u = ((t * z.fps) % TOTAL + TOTAL) % TOTAL;
  const ph = (u / TOTAL) * Math.PI * 2;
  for (let k = 0; k < HOLD.length; k++){
    const h = HOLD[(k + z.holdRot) % HOLD.length];
    if (u < h) return { f: (k + z.phase) % 9, ph };
    u -= h;
  }
  return { f: z.phase % 9, ph };
}
```

그리기 직전에 사이클당 1주기 흔들림을 얹는다 (JSON `lurch`):

```js
ctx.translate(Math.sin(ph)*2, Math.cos(ph)*1);
ctx.rotate(Math.sin(ph) * 3 * Math.PI/180);   // 축은 발끝 (48, 86)
```

### 개체별 랜덤화가 제일 중요하다

스폰할 때 좀비마다 다르게 준다. 안 하면 좀비 떼가 **군대처럼 발을 맞춰 걷는다.**

```js
z.fps     = 7 * (0.85 + Math.random()*0.3);          // ±15%
z.phase   = (Math.random()*9)|0;                     // 시작 프레임
z.holdRot = (Math.random()*HOLD.length)|0;           // 긴 프레임 위치 = 끄는 발
```

스프라이트 한 장으로 좀비마다 다르게 절뚝인다.

---

## 6. 좀비 3종 — 스탯으로 갈라야 의미가 있다

| 종 | HP | 속도 | 역할 |
|---|---|---|---|
| student (교복) | 3 | 38~52 | 잔몹, 빠름 |
| hardhat (안전모) | 6 | 25~35 | 중간 |
| fat (뚱땡이) | 9 | 19~27 | **폭 73px — 뒤를 가린다** |

fat의 존재 이유는 탱킹이 아니라 **시야 차단**이다. 손전등 원뿔 안에 들어오면 그 뒤가
안 보여서 "저 뒤에 뭐가 있는지 모르겠다"는 압박이 생긴다.

**접촉 데미지**다. 공격 애니메이션이 없고, 닿으면 깎인다. 무적 시간 0.5초 권장.

---

## 7. 사망 / 피격 — 전부 코드, 에셋 없음

시트를 한 번만 흰색으로 구워두면 피격·사망 플래시에 재사용한다.

```js
function bakeWhite(img){
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  return c;
}
```

**사망 (0.3초):**
1. 흰 실루엣 2프레임
2. 발끝(48, 86)을 축으로 `rotate ±20°`, `scaleY 1 → 0.14`, `alpha → 0`
3. **피 데칼을 바닥 레이어에 영구 배치** + 총알 방향 넉백
4. 파편 몇 개

피 데칼이 이 게임에서 제일 값싼 재미다. 시체는 0.3초에 사라져도 피는 남아서
**지나온 길이 화면에 그려진다.** 손전등으로 뒤를 비추면 방금 뚫고 온 자리가 보인다.

**피격:** 흰 플래시 1프레임 + 3px 넉백. 그게 전부.

---

## 8. 렌더 순서 — 어둠 레이어가 있는 게임이라 중요하다

1. 지면 타일
2. **피 데칼**
3. **좀비** — 어둠 레이어 *아래*. 손전등이 비춰야 보인다
4. 탄피, 예광탄
5. **어둠 레이어 합성** (오프스크린 캔버스에 `destination-out` 으로 원뿔 뚫기)
6. **피격·사망 중인 좀비** — 어둠 *위*. 어둠 속에서도 맞은 게 보여야 한다
7. **플레이어** — 항상 어둠 위
8. 발광 (`lighter`): 손전등 블룸, 총구 화염, 파편

좀비를 `y` 순으로 정렬해서 그리면 겹칠 때 깊이가 맞는다.

---

## 9. 성능

- 시트 4장 = **VRAM 약 12MB**. 텍스처 예산은 수백 MB라 여유가 크다
- 8방향 × 전 프레임을 **한 장에** 몰아넣은 게 중요하다. 좀비 50마리가 있어도
  텍스처 바인드가 1번이라 한 배치로 그려진다. 방향별로 파일을 쪼개면 8배 깨진다
- 프레임 드랍의 원인은 거의 항상 텍스처가 아니라 **좀비마다 도는 JS 로직**이다.
  경로/충돌은 스페이셜 그리드로

---

## 10. 아직 없는 것

- 사격 반동 프레임 (코드로 반동 밀기만 구현됨)
- 재장전 / 플레이어 피격·사망 애니메이션
- 좀비 3종 추가분, 보스
- 타일, 프롭, 사운드
- 한글 픽셀 폰트 (AI로 만들 수 없음 — 갈무리 등 무료 폰트 사용)

`reference/demo.html` 를 브라우저에서 열면 §4~§8이 전부 동작하는 걸 볼 수 있다.
단일 HTML이고 스프라이트가 base64로 박혀 있어 서버 없이 그냥 열린다.
