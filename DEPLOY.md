# 배포 가이드

실행 진입점은 어느 방식이든 동일합니다: 루트의 `index.js` 또는 `npm start`.

- **A. Katabump** — Pterodactyl 패널 기반 무료 호스팅 (아래)
- **B. Pella** — 디스코드 봇 전용 무료 호스팅
- **C. Northflank** — Docker 기반

---

# A. Katabump 배포

Katabump은 **Pterodactyl 패널**을 씁니다. Pella 같은 자동 배포형이 아니라,
"서버를 만들고 → 파일을 올리고 → 시작 버튼을 누르는" 게임 서버식 흐름입니다.

## 1. 서버 생성

1. https://katabump.com 가입 → 대시보드 → **Create Server**
2. 사양은 무료 등급에서 고를 수 있는 것으로 (봇 하나엔 RAM 512MB면 충분합니다)
3. **Egg / Software: Node.js** 를 선택합니다 (Minecraft 아님!)
4. 생성 후 **Manage / Panel** 을 눌러 Pterodactyl 패널로 들어갑니다

> ⚠️ **무료 서버는 주기적으로 갱신(Renew)해야 합니다.** 대시보드에 남은 기간이
> 표시되며, 기간이 지나면 서버가 삭제될 수 있습니다. 달력에 알림을 걸어두세요.
> 코드는 GitHub(https://github.com/tett01/discord-gemini-bot)에 있으니 삭제돼도
> 다시 만들면 됩니다.

## 2. 파일 업로드

패널 상단의 **Files** 탭으로 들어갑니다. 작업 폴더는 `/home/container` 입니다.

**방법 1 — ZIP 업로드 (간단)**
1. `Upload` 로 받으신 ZIP 파일을 올립니다
2. 목록에서 ZIP 우클릭 → **Unarchive**
3. 압축이 풀리면 ZIP 파일은 지워도 됩니다

**방법 2 — GitHub에서 바로 받기 (Console 사용)**
저장소가 Public이라 토큰 없이 받을 수 있습니다. **Console** 탭에서:
```
git clone https://github.com/tett01/discord-gemini-bot.git .
```

압축을 푼 뒤 `/home/container` 바로 아래에 `index.js`, `package.json`, `src/` 가
보여야 합니다. 폴더 안에 한 겹 더 들어가 있으면 파일들을 밖으로 꺼내주세요.

## 3. `.env` 파일 만들기 (직접 하셔야 하는 부분)

Pterodactyl 패널은 임의의 환경변수를 추가하기 어렵기 때문에, **`.env` 파일을
직접 만드는 방식**을 씁니다. 이 봇은 두 방식을 모두 지원합니다.

**Files** 탭 → **New File** → 파일명 `.env` → 아래 내용을 넣고 값 채우기:

```env
DISCORD_TOKEN=여기에_봇_토큰
GEMINI_API_KEY=여기에_구글_AI_스튜디오_키
BOT_NAME=제미나이
```

> `.env.example` 파일이 함께 들어있으니, 그걸 복사해서 이름만 `.env` 로 바꿔도 됩니다.
> 이 파일은 절대 GitHub에 올리지 마세요 (`.gitignore` 에 이미 등록돼 있습니다).

## 4. 시작 설정 확인

**Startup** 탭에서:

| 항목 | 값 |
|---|---|
| Main File / JS File | `index.js` |
| Auto Update | 꺼도 됩니다 |
| Node.js 버전 | **18 이상** (가능하면 20 / 22) |

`npm install` 은 보통 시작할 때 자동으로 실행됩니다. 안 되면 **Console** 에서
직접 `npm install` 을 한 번 실행하세요.

## 5. 시작 및 확인

**Console** 탭에서 **Start**. 아래처럼 나오면 성공입니다.

```
봇이 준비되었습니다!
로그인 계정: 제미나이#1234
사용 모델: google/gemini-2.5-flash
슬래시 명령어를 등록했습니다.
```

## 6. 채널 지정

Katabump은 디스크가 유지되므로, 디스코드에서 `/채널설정` 만 하면 됩니다.
설정은 `/home/container/data/channels.json` 에 저장되고 **재시작해도 유지됩니다.**

서버를 재설치(Reinstall)할 계획이 있다면, `.env` 에 채널 ID를 고정해 두는 것이
더 안전합니다 (채널 우클릭 → 채널 ID 복사, 개발자 모드 필요):
```env
ACTIVE_CHANNEL_IDS=123456789012345678
```

## 7. 코드 수정 후 반영

Files 탭에서 파일을 직접 수정하거나, Console 에서 `git pull` 후 **Restart**.

---

# B. Pella 배포

1. https://pella.app → 디스코드 계정으로 로그인 → 봇 생성
2. GitHub 저장소 `tett01/discord-gemini-bot` 연결 (또는 ZIP 업로드)
3. Runtime **Node.js 18+**, Main file `index.js`
4. **Environment / Variables** 메뉴에 아래 입력
   (메뉴가 없으면 A안 3번처럼 `.env` 파일을 만들어도 됩니다)

| Key | Value |
|---|---|
| `DISCORD_TOKEN` | 봇 토큰 |
| `GEMINI_API_KEY` | 구글 AI Studio 키 (또는 `OPENROUTER_API_KEY`) |

| `ACTIVE_CHANNEL_IDS` | 채널 ID (컨테이너 재생성 대비) |

5. Start → 로그에서 `봇이 준비되었습니다!` 확인

---

# C. Northflank 배포 (Docker)

1. **Integrations → GitHub** 연결 → **Create new → Project**
2. **Create new → Service → Combined service**
   - Repository `tett01/discord-gemini-bot`, Branch `main`
   - Build type **Dockerfile** (`/Dockerfile`, context `/`)
   - **Ports 전부 삭제** (열어두면 헬스체크 실패로 계속 재시작될 수 있음.
     굳이 열려면 환경변수 `PORT=8080` 을 함께 넣으세요)
3. 환경변수는 B안 표와 동일, 토큰·키는 **Secret** 으로 저장
4. 설정 유지가 필요하면 **Volume** 1GB 를 `/data` 에 붙이고 `DATA_DIR=/data` 추가

---

# 공통 문제 해결

| 증상 | 원인과 해결 |
|---|---|
| `환경 변수 DISCORD_TOKEN 가 비어 있습니다` | `.env` 파일 위치/철자 확인 (`/home/container/.env`). 저장 후 **재시작** |
| `디스코드 로그인 실패: An invalid token was provided` | 토큰 오타, 또는 Reset Token으로 예전 값이 무효해짐 |
| `Cannot find module 'discord.js'` | `npm install` 미실행. Console 에서 직접 실행 |
| 봇은 온라인인데 아무 반응 없음 | ① 개발자 포털의 **MESSAGE CONTENT INTENT** 미설정 ② `/채널설정` 안 함 |
| 슬래시 명령어가 안 보임 | 전역 등록은 반영에 시간이 걸립니다. 디스코드 앱 재시작 (Ctrl+R) |
| 채널에 키 오류 답변 | API 키가 잘못됨. 키를 다시 발급받아 교체 |
| 채널에 크레딧 부족 답변 | 사용량 한도 초과. 잠시 후 재시도하거나 크레딧 충전 |
| 채널에 `404 모델을 찾을 수 없습니다` | `AI_MODEL` ID 오타 (구글: `gemini-2.5-flash`) |
| 서버가 갑자기 사라짐 | 무료 등급 갱신(Renew) 기한 초과. 재생성 후 다시 업로드 |
