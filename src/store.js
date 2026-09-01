const fs = require('fs');
const path = require('path');

// 클라우드에서는 볼륨 경로(예: /data)를 DATA_DIR 로 지정한다. 없으면 로컬 ./data 사용.
const DATA_DIR = process.env.DATA_DIR?.trim() || path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'channels.json');

/**
 * 환경변수로 고정해 둔 채널 ID들.
 * 볼륨 없이 배포해도 재배포 후 설정이 살아있게 하는 안전장치.
 * 여기 적힌 채널은 /채널해제 로 지워도 재시작하면 되살아난다.
 */
const PINNED = new Set(
  (process.env.ACTIVE_CHANNEL_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
);

/** 활성화된 채널 ID 집합 (메모리 캐시) */
let channels = new Set(PINNED);
/** 디스크에 쓸 수 없는 환경(읽기 전용 파일시스템)인지 */
let writable = true;

function load() {
  try {
    if (!fs.existsSync(FILE)) return;
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    if (Array.isArray(raw.channels)) {
      for (const id of raw.channels) channels.add(id);
    }
  } catch (err) {
    // 파일이 깨져 있어도 봇은 계속 떠 있어야 하므로 경고만 남긴다.
    console.warn('[저장소] 채널 설정을 불러오지 못했습니다. 환경변수 설정만 사용합니다.', err.message);
  }
}

function save() {
  if (!writable) return;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify({ channels: [...channels] }, null, 2), 'utf8');
  } catch (err) {
    writable = false; // 매 요청마다 같은 오류를 반복해서 찍지 않는다
    console.error(
      `[저장소] ${DATA_DIR} 에 저장할 수 없습니다 (${err.message}).\n` +
        '        재시작하면 설정이 사라집니다. 볼륨을 붙이거나 ACTIVE_CHANNEL_IDS 환경변수를 사용하세요.'
    );
  }
}

load();

module.exports = {
  isActive: (channelId) => channels.has(channelId),
  isPinned: (channelId) => PINNED.has(channelId),
  isPersistent: () => writable,
  dataDir: DATA_DIR,
  /** @returns {boolean} 새로 추가되었으면 true, 이미 등록돼 있었으면 false */
  activate(channelId) {
    if (channels.has(channelId)) return false;
    channels.add(channelId);
    save();
    return true;
  },
  /** @returns {boolean} 실제로 해제되었으면 true */
  deactivate(channelId) {
    if (!channels.delete(channelId)) return false;
    save();
    return true;
  },
  list: () => [...channels],
};
