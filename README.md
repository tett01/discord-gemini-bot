# 제미나이 — AI 디스코드 챗봇

관리자가 `/채널설정`으로 지정한 채널에서, **멘션이나 접두사 없이** 올라오는 모든 메시지에 AI가 답변하는 디스코드 봇입니다.

**구글 AI Studio**, **OpenRouter**, 그리고 **OpenAI 호환 API 를 제공하는 모든 서비스**(Groq, Cerebras, Mistral, GitHub Models 등)를 지원합니다. `.env` 에 넣은 키에 따라 자동으로 선택됩니다.

## 1. 설치

```bash
npm install
```

## 2. 디스코드 봇 준비

1. https://discord.com/developers/applications 에서 **New Application** 생성
2. 왼쪽 **Bot** 메뉴 → **Reset Token** → 토큰 복사 (`.env`의 `DISCORD_TOKEN`)
3. 같은 화면 아래 **Privileged Gateway Intents** 에서 **MESSAGE CONTENT INTENT** 를 **반드시 켜기**
   (이걸 안 켜면 봇이 메시지 내용을 못 읽어서 아무 반응도 하지 않습니다)
4. 왼쪽 **OAuth2 → URL Generator** 에서
   - SCOPES: `bot`, `applications.commands`
   - BOT PERMISSIONS: `Send Messages`, `Read Message History`, `View Channels`
   - 생성된 URL로 서버에 초대

## 3. `.env` 작성

프로젝트 루트에 `.env` 파일을 만들고 (`.env.example` 복사) 값을 채웁니다.

```bash
cp .env.example .env
```

```env
DISCORD_TOKEN=<디스코드_개발자_포털에서_복사한_봇_토큰>
# 아래 둘 중 하나만 채우면 됩니다
GEMINI_API_KEY=<aistudio.google.com/apikey 에서_발급>
# OPENROUTER_API_KEY=<openrouter.ai/settings/keys 에서_발급>
```

## 4. 실행

```bash
npm start
```

터미널에 `봇이 준비되었습니다!` 가 찍히면 성공입니다.

## 5. 사용법

| 명령어 | 설명 | 권한 |
|---|---|---|
| `/채널설정` | 지금 채널의 모든 메시지에 봇이 답변 | 서버 관리 권한 |
| `/채널해제` | 자동 답변 끄기 | 서버 관리 권한 |
| `/초기화` | 그 채널의 대화 기억 삭제 | 누구나 |
| `/상태` | 모델 · 채널 설정 확인 | 누구나 |

- 활성 채널에서 `!` 또는 `//` 로 시작하는 메시지는 봇이 무시합니다 (사람끼리 잡담할 때 사용).
- 활성 채널 목록은 `data/channels.json` 에 저장되어 재시작해도 유지됩니다.
- 채널마다 최근 대화를 기억하며(기본 10턴), 봇 재시작 시 초기화됩니다.

## 파일 구조

```
index.js           호스팅 패널용 진입점 (src/index.js 를 실행)
src/index.js       봇 본체 (이벤트 처리, 슬래시 명령어)
src/ai.js          AI API 호출 (구글/OpenRouter 공용) + 재시도/타임아웃
src/store.js       활성 채널 저장 (data/channels.json)
src/config.js      .env 로딩 및 기본값
Dockerfile         컨테이너 배포용
DEPLOY.md          Katabump / Pella / Northflank 배포 가이드
```

## 문제 해결

| 증상 | 원인 |
|---|---|
| 봇이 아무 반응 없음 | MESSAGE CONTENT INTENT 미설정 / `/채널설정` 안 함 |
| `401` / 키 오류 | API 키가 잘못됨. 키를 다시 발급 |
| `404 모델을 찾을 수 없습니다` | `AI_MODEL` ID 오타 (구글은 `gemini-2.5-flash`, OpenRouter는 `google/gemini-2.5-flash`) |
| 슬래시 명령어가 안 보임 | 전역 등록은 반영에 몇 분 걸릴 수 있음. 디스코드 재시작 |
