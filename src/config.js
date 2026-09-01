require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    console.error(`[설정 오류] 환경 변수 ${name} 가 비어 있습니다. .env 파일을 확인해 주세요.`);
    process.exit(1);
  }
  return value.trim();
}

module.exports = {
  // 필수 값
  DISCORD_TOKEN: required('DISCORD_TOKEN'),
  OPENROUTER_API_KEY: required('OPENROUTER_API_KEY'),

  // 선택 값 (없으면 아래 기본값 사용)
  MODEL: process.env.OPENROUTER_MODEL?.trim() || 'google/gemini-2.5-flash',
  BOT_NAME: process.env.BOT_NAME?.trim() || '제미나이',
  SYSTEM_PROMPT:
    process.env.SYSTEM_PROMPT?.trim() ||
    '당신은 디스코드 서버에서 활동하는 "제미나이"라는 이름의 AI 도우미입니다. ' +
      '한국어로, 친절하고 정확하게 답변하세요. 답변은 되도록 2000자를 넘지 않게 정리해서 말합니다.',

  // 한 채널에서 기억할 대화 턴 수(사용자+봇 메시지 쌍)
  HISTORY_TURNS: Number(process.env.HISTORY_TURNS) || 10,
  // OpenRouter 응답 대기 제한 시간(ms)
  REQUEST_TIMEOUT_MS: Number(process.env.REQUEST_TIMEOUT_MS) || 60000,
  MAX_TOKENS: Number(process.env.MAX_TOKENS) || 1500,
};
