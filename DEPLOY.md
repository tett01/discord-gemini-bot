# Northflank 배포 가이드

이 저장소는 `Dockerfile` 기반으로 Northflank에 바로 배포할 수 있게 준비돼 있습니다.

## 0. 준비물

- Northflank 계정 (https://northflank.com — GitHub 계정으로 가입 가능)
- 이 코드가 올라간 GitHub 저장소 (**반드시 Private**)
- 디스코드 봇 토큰, OpenRouter API 키

> ⚠️ `.env` 파일은 절대 깃허브에 올리지 마세요. `.gitignore`에 이미 포함돼 있습니다.
> 토큰은 아래 4단계처럼 Northflank의 Secret에 넣습니다.

## 1. GitHub 저장소 연결

Northflank 대시보드 → **Integrations** → **GitHub** → *Connect* →
봇 저장소에 접근 권한을 부여합니다.

## 2. 프로젝트 생성

**Create new** → **Project**
- Name: `discord-gemini-bot`
- Region: `Europe (West)` 또는 가까운 지역 아무거나

## 3. 서비스 생성

프로젝트 안에서 **Create new** → **Service** → **Combined service**
(빌드와 실행을 한 번에 하는 타입입니다)

| 항목 | 값 |
|---|---|
| Service name | `gemini-bot` |
| Repository | 방금 연결한 저장소 |
| Branch | `main` |
| Build type | **Dockerfile** |
| Dockerfile path | `/Dockerfile` |
| Build context | `/` |
| Instance / Plan | 가장 작은 것 (`nf-compute-10` 등) |
| **Ports** | **전부 삭제하세요** ← 중요 |

> **Ports를 지우는 이유**: 디스코드 봇은 웹서버가 아니라 상시 실행 프로세스입니다.
> 포트를 열어두면 Northflank가 HTTP 응답을 기다리다 헬스체크 실패로 처리할 수 있습니다.
> 굳이 포트를 열고 싶다면 환경변수 `PORT=8080`을 추가하세요 — 그때만 상태 확인용
> HTTP 서버가 함께 뜹니다.

## 4. 환경변수 등록 (가장 중요)

서비스 생성 화면의 **Environment variables** 또는 생성 후 **Environment** 탭에서
아래 값을 넣습니다. 토큰과 키는 반드시 **Secret** 으로 표시하세요.

| Key | Value | 비고 |
|---|---|---|
| `DISCORD_TOKEN` | 봇 토큰 | 🔒 Secret |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` | 🔒 Secret |
| `OPENROUTER_MODEL` | `google/gemini-2.5-flash` | |
| `BOT_NAME` | `제미나이` | |
| `DATA_DIR` | `/data` | 5단계에서 볼륨을 붙일 경우 |

## 5. 설정을 유지하는 방법 (둘 중 하나 선택)

컨테이너는 재배포하면 파일이 초기화됩니다. `/채널설정`으로 지정한 채널을 유지하려면:

**방법 A — 볼륨 붙이기 (권장)**
프로젝트에서 **Create new → Volume** → 크기 1GB →
Attach to service `gemini-bot`, Mount path `/data`
→ 환경변수 `DATA_DIR=/data` 유지

**방법 B — 환경변수로 고정 (무료 플랜에서 볼륨을 못 쓸 때)**
디스코드에서 채널 우클릭 → *채널 ID 복사* (개발자 모드를 켜야 보입니다)
→ Northflank 환경변수에 추가:
```
ACTIVE_CHANNEL_IDS=123456789012345678,987654321098765432
```
이렇게 고정한 채널은 `/채널해제`를 해도 재시작하면 다시 켜집니다.

## 6. 배포 및 확인

**Deploy** 를 누르고 빌드가 끝나면 서비스의 **Logs** 탭을 엽니다.
아래처럼 찍히면 성공입니다:

```
봇이 준비되었습니다!
로그인 계정: 제미나이#1234
사용 모델: google/gemini-2.5-flash
슬래시 명령어를 등록했습니다.
```

이제 디스코드에서 원하는 채널에 `/채널설정` 을 입력하면 됩니다.

## 7. 이후 업데이트

`main` 브랜치에 push 하면 Northflank가 자동으로 다시 빌드·배포합니다.

```bash
git add -A && git commit -m "봇 수정" && git push
```

## 문제 해결

| 로그/증상 | 원인과 해결 |
|---|---|
| `환경 변수 DISCORD_TOKEN 가 비어 있습니다` | 4단계 환경변수 누락. Secret 저장 후 **재배포** 필요 |
| `디스코드 로그인 실패` | 토큰 오타이거나, 토큰을 Reset해서 예전 값이 무효해진 경우 |
| 봇은 온라인인데 반응 없음 | 디스코드 개발자 포털의 **MESSAGE CONTENT INTENT** 미설정, 또는 `/채널설정` 안 함 |
| `401` / `402` 오류 응답 | OpenRouter 키가 틀렸거나 크레딧 부족 |
| 컨테이너가 계속 재시작됨 | Ports를 열어둔 채 헬스체크가 실패하는 경우. 3단계대로 포트를 지우세요 |
| 재배포하면 채널 설정이 사라짐 | 5단계(볼륨 또는 `ACTIVE_CHANNEL_IDS`) 미적용 |
