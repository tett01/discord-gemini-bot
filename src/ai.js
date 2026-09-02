const config = require('./config');

const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * AI 챗 API 호출 (구글 AI Studio / OpenRouter 공용).
 * 구글도 OpenAI 호환 엔드포인트를 제공하므로 요청 형식은 동일하다.
 * @param {{role: 'system'|'user'|'assistant', content: string}[]} messages
 * @returns {Promise<string>} 모델의 답변 텍스트
 * @throws {Error} 호출자가 잡아서 사용자에게 안내할 수 있도록 한국어 메시지를 담은 에러
 */
async function askAI(messages) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // 응답이 오지 않아 요청이 영원히 매달리는 것을 막는다.
    const timer = AbortSignal.timeout(config.REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(config.API_URL, {
        method: 'POST',
        signal: timer,
        headers: {
          Authorization: `Bearer ${config.API_KEY}`,
          'Content-Type': 'application/json',
          // OpenRouter 대시보드 통계용(구글에서는 무시됨).
          // HTTP 헤더는 ASCII 만 허용하므로 한글 봇 이름을 그대로 넣으면 안 된다.
          'X-Title': 'discord-groq-bot',
        },
        body: JSON.stringify({
          model: config.MODEL,
          messages,
          max_tokens: config.MAX_TOKENS,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const detail = (await res.text().catch(() => '')).slice(0, 300);
        if (RETRYABLE.has(res.status) && attempt < MAX_ATTEMPTS) {
          lastError = new Error(`HTTP ${res.status}: ${detail}`);
          await sleep(1000 * attempt); // 1초, 2초 후 재시도
          continue;
        }
        throw new Error(describeStatus(res.status, detail));
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim();

      if (!text) {
        // 모델이 빈 응답을 돌려주는 경우(필터링 등)도 방어한다.
        throw new Error('모델이 빈 응답을 반환했습니다. 질문을 조금 바꿔서 다시 시도해 주세요.');
      }
      return text;
    } catch (err) {
      const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
      lastError = isTimeout
        ? new Error(`응답이 ${config.REQUEST_TIMEOUT_MS / 1000}초 안에 오지 않았습니다.`)
        : err;

      const networkIssue = isTimeout || err instanceof TypeError; // fetch 실패 = 네트워크 문제
      if (networkIssue && attempt < MAX_ATTEMPTS) {
        await sleep(1000 * attempt);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error('알 수 없는 오류로 요청에 실패했습니다.');
}

function describeStatus(status, detail) {
  // 구글은 키가 잘못돼도 400 으로 응답하므로, 본문을 보고 키 문제인지 판별한다.
  if (status === 400 && /api[ _-]?key/i.test(detail)) {
    return `${config.PROVIDER_NAME} API 키가 올바르지 않습니다. 키를 다시 발급받아 주세요: ${config.KEY_PAGE}`;
  }

  const messages = {
    400: `요청 형식이 올바르지 않습니다. 모델 ID(AI_MODEL=${config.MODEL})를 확인해 주세요.`,
    401: `${config.PROVIDER_NAME} API 키가 올바르지 않습니다. 키를 다시 발급받아 주세요: ${config.KEY_PAGE}`,
    402: `${config.PROVIDER_NAME} 크레딧이 부족합니다.`,
    403: '해당 모델에 접근 권한이 없습니다.',
    404: `모델을 찾을 수 없습니다: ${config.MODEL}`,
    429: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요. (무료 등급 사용량 제한일 수 있습니다)',
  };
  const base = messages[status] ?? `${config.PROVIDER_NAME} 오류 (HTTP ${status})`;
  return detail ? `${base}\n${detail}` : base;
}

module.exports = { askAI };
