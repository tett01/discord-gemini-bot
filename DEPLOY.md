# 배포 가이드

이 봇은 두 가지 방식으로 배포할 수 있게 준비돼 있습니다.

- **A. Pella** — 디스코드 봇 전용 무료 호스팅. 가장 간단합니다. (아래)
- **B. Northflank** — Docker 기반. 확장성이 필요할 때. (문서 아래쪽)

실행 진입점은 둘 다 동일합니다: 루트의 `index.js` 또는 `npm start` 모두 동작합니다.

---

# A. Pella 배포 (권장 · 무료)

## 1. 가입 및 봇 생성

1. https://pella.app 접속 → **Discord 계정으로 로그인**
2. 대시보드에서 **Create / New Bot** (또는 **Deploy**) 선택
3. 코드 업로드 방식을 고릅니다:
   - **GitHub 연결** (권장): `tett01/discord-gemini-bot` 저장소 선택, 브랜치 `main`
   - 또는 ZIP 업로드: 저장소 페이지 → Code → Download ZIP

## 2. 실행 설정

| 항목 | 값 |
|---|---|
| Language / Runtime | **Node.js** (버전 18 이상, 가능하면 20 또는 22) |
| Main file / Startup file | `index.js` |
| Start command | `npm start` (직접 입력해야 할 경우) |
| Install command | `npm install` (보통 자동 실행됩니다) |

> 루트에 `index.js`를 둔 이유가 이것입니다. 패널이 기본값으로 `index.js`를 찾아도
> 바로 실행되도록 해두었습니다. 실제 코드는 `src/index.js` 에 있습니다.

## 3. 환경변수 입력 (직접 하셔야 하는 부분)

Pella 패널의 **Environment / Variables / Secrets** 메뉴에 아래를 넣습니다.

| Key | Value |
|---|---|
| `DISCORD_TOKEN` | 디스코드 개발자 포털의 봇 토큰 |
| `OPENROUTER_API_KEY` | `sk-or-v1-` 로 시작하는 키 |
| `OPENROUTER_MODEL` | `google/gemini-2.5-flash` |
| `BOT_NAME` | `제미나이` |
| `ACTIVE_CHANNEL_IDS` | 봇이 답변할 채널 ID (아래 5번 참고) |

**환경변수 메뉴가 없다면**, 파일 관리자(File Manager)에서 루트에 `.env` 파일을
직접 만들어도 됩니다. 내용은 `.env.example` 을 그대로 베껴 값만 채우면 됩니다.
이 코드는 두 방식을 모두 지원합니다.

> ⚠️ 이 저장소는 **Public** 입니다. `.env` 는 절대 커밋하지 마세요.
> (`.gitignore` 에 이미 등록돼 있습니다.)

## 4. 실행 및 확인

**Start** 버튼을 누르고 콘솔(Console / Logs)을 봅니다. 아래처럼 나오면 성공입니다.

```
봇이 준비되었습니다!
로그인 계정: 제미나이#1234
사용 모델: google/gemini-2.5-flash
슬래시 명령어를 등록했습니다.
```

## 5. 채널 지정 — 무료 호스팅에서는 환경변수 방식을 권장

디스코드에서 `/채널설정` 을 쓰면 `data/channels.json` 에 저장되는데, 무료 호스팅은
컨테이너를 재생성할 때 파일이 사라질 수 있습니다. 확실하게 하려면:

1. 디스코드 **설정 → 고급 → 개발자 모드** 켜기
2. 원하는 채널 우클릭 → **채널 ID 복사**
3. Pella 환경변수에 추가 (여러 개면 쉼표로 구분):
   ```
   ACTIVE_CHANNEL_IDS=123456789012345678,987654321098765432
   ```
4. 봇 재시작

이렇게 고정한 채널은 재배포·재시작해도 항상 살아있습니다.

## 6. 코드 수정 후 반영

GitHub 연결 방식이면 push 후 패널에서 **Redeploy / Restart** 를 누릅니다.

```bash
git add -A && git commit -m "수정 내용" && git push
```

---

# B. Northflank 배포 (Docker)

## 1~2. 저장소 연결 및 프로젝트 생성

Northflank → **Integrations → GitHub** 연결 →
**Create new → Project** (이름 자유, 지역은 가까운 곳)

## 3. 서비스 생성

**Create new → Service → Combined service**

| 항목 | 값 |
|---|---|
| Repository | `tett01/discord-gemini-bot` / Branch `main` |
| Build type | **Dockerfile** (`/Dockerfile`, context `/`) |
| Instance | 가장 작은 플랜 |
| **Ports** | **전부 삭제** |

> 포트를 열어두면 Northflank가 HTTP 응답을 기다리다 헬스체크 실패로 컨테이너를
> 계속 재시작할 수 있습니다. 굳이 열려면 환경변수 `PORT=8080` 을 함께 넣으세요.
> 그때만 상태 확인용 HTTP 서버가 같이 뜹니다.

## 4. 환경변수

A안 3번 표와 동일하되, 토큰과 키는 **Secret** 으로 저장합니다.
볼륨을 붙일 경우 `DATA_DIR=/data` 를 추가합니다.

## 5. 볼륨 (선택)

**Create new → Volume** → 1GB → 서비스에 attach, Mount path `/data`
→ 이러면 `/채널설정` 결과가 재배포 후에도 유지됩니다.

---

# 공통 문제 해결

| 증상 | 원인과 해결 |
|---|---|
| `환경 변수 DISCORD_TOKEN 가 비어 있습니다` | 환경변수 누락. 입력 후 **재시작** 필요 |
| `디스코드 로그인 실패: An invalid token was provided` | 토큰 오타, 또는 Reset Token으로 예전 값이 무효해짐 |
| 봇은 온라인인데 아무 반응 없음 | ① 개발자 포털의 **MESSAGE CONTENT INTENT** 미설정 ② `/채널설정` 안 함 |
| 슬래시 명령어가 안 보임 | 전역 등록은 반영에 시간이 걸립니다. 디스코드 앱 재시작 (Ctrl+R) |
| 채널에 `401` 오류 답변 | `OPENROUTER_API_KEY` 오류 |
| 채널에 `402` 오류 답변 | OpenRouter 크레딧 부족 |
| 채널에 `404 모델을 찾을 수 없습니다` | `OPENROUTER_MODEL` ID 오타. https://openrouter.ai/models 확인 |
| 재시작하면 채널 설정이 사라짐 | `ACTIVE_CHANNEL_IDS` 환경변수로 고정 (A안 5번) |
| `npm ERR! Cannot find module` | `npm install` 이 실행되지 않음. Install command 확인 |
