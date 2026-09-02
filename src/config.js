require('dotenv').config();

const GOOGLE_KEY = process.env.GEMINI_API_KEY?.trim();
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY?.trim();
// 아래 둘을 지정하면 OpenAI 호환 API 를 쓰는 어떤 서비스든 연결할 수 있다.
const CUSTOM_KEY = process.env.AI_API_KEY?.trim();
const CUSTOM_URL = process.env.AI_BASE_URL?.trim();

if (!GOOGLE_KEY && !OPENROUTER_KEY && !CUSTOM_KEY) {
  console.error(
    '[설정 오류] AI API 키가 없습니다. .env 파일에 아래 중 하나를 넣어 주세요.\n' +
      '  GEMINI_API_KEY=...      (구글 AI Studio: https://aistudio.google.com/apikey)\n' +
      '  OPENROUTER_API_KEY=...  (OpenRouter: https://openrouter.ai/settings/keys)\n' +
      '  AI_API_KEY=... + AI_BASE_URL=...  (그 밖의 OpenAI 호환 서비스)'
  );
  process.exit(1);
}

if (CUSTOM_KEY && !CUSTOM_URL) {
  console.error('[설정 오류] AI_API_KEY 를 쓰려면 AI_BASE_URL 도 함께 지정해야 합니다.');
  process.exit(1);
}

// 우선순위: 직접 지정 > 구글 > OpenRouter
const selected = CUSTOM_KEY ? 'custom' : GOOGLE_KEY ? 'google' : 'openrouter';
const useGoogle = selected === 'google';

if (!process.env.DISCORD_TOKEN?.trim()) {
  console.error('[설정 오류] 환경 변수 DISCORD_TOKEN 가 비어 있습니다. .env 파일을 확인해 주세요.');
  process.exit(1);
}

// 구글의 OpenAI 호환 엔드포인트를 쓰기 때문에 요청 형식은 양쪽이 동일하다.
const PROVIDERS = {
  google: {
    name: '구글 AI Studio',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    key: GOOGLE_KEY,
    defaultModel: 'gemini-2.5-flash',
    keyPage: 'https://aistudio.google.com/apikey',
  },
  custom: {
    name: process.env.AI_PROVIDER_NAME?.trim() || '사용자 지정 AI 서비스',
    // 주소 끝에 /chat/completions 가 없으면 붙여 준다 (흔한 실수 방지)
    url: /\/chat\/completions\/?$/.test(CUSTOM_URL || '')
      ? CUSTOM_URL
      : `${(CUSTOM_URL || '').replace(/\/$/, '')}/chat/completions`,
    key: CUSTOM_KEY,
    defaultModel: 'gpt-4o-mini',
    keyPage: '사용 중인 서비스의 API 키 페이지',
  },
  openrouter: {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    key: OPENROUTER_KEY,
    defaultModel: 'google/gemini-2.5-flash',
    keyPage: 'https://openrouter.ai/settings/keys',
  },
};

const provider = PROVIDERS[selected];

module.exports = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN.trim(),

  PROVIDER: selected,
  PROVIDER_NAME: provider.name,
  API_URL: provider.url,
  API_KEY: provider.key,
  KEY_PAGE: provider.keyPage,
  // 모델을 직접 지정하지 않으면 각 서비스에 맞는 기본 모델을 쓴다.
  // OPENROUTER_MODEL 은 OpenRouter 를 쓸 때만 적용한다.
  // (구글과 OpenRouter 는 모델 ID 형식이 달라서, 그대로 넘기면 404 가 난다)
  MODEL:
    process.env.AI_MODEL?.trim() ||
    (!useGoogle && process.env.OPENROUTER_MODEL?.trim()) ||
    provider.defaultModel,

  BOT_NAME: process.env.BOT_NAME?.trim() || '그록',
  SYSTEM_PROMPT:
    process.env.SYSTEM_PROMPT?.trim() ||
    '당신은 디스코드 서버에서 활동하는 "그록"이라는 이름의 AI 도우미입니다. ' +
      '한국어로, 친절하고 정확하게 답변하세요. 답변은 되도록 2000자를 넘지 않게 정리해서 말합니다.',

  HISTORY_TURNS: Number(process.env.HISTORY_TURNS) || 10,
  REQUEST_TIMEOUT_MS: Number(process.env.REQUEST_TIMEOUT_MS) || 60000,
  MAX_TOKENS: Number(process.env.MAX_TOKENS) || 1500,
};
