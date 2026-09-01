const http = require('http');
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');

const config = require('./config');
const store = require('./store');
const { askOpenRouter } = require('./openrouter');

const DISCORD_MAX_LENGTH = 2000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // 메시지 본문을 읽기 위해 필수 (개발자 포털에서 켜야 함)
  ],
  partials: [Partials.Channel],
});

/** 채널별 대화 기록: channelId -> [{role, content}, ...] */
const histories = new Map();
/** 같은 채널에서 답변 생성이 겹치지 않도록 하는 잠금 */
const busyChannels = new Set();

// ───────────────────────── 슬래시 명령어 정의 ─────────────────────────

const commands = [
  new SlashCommandBuilder()
    .setName('채널설정')
    .setDescription('이 채널에서 제미나이가 모든 메시지에 답변하도록 켭니다.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild), // 관리자 전용
  new SlashCommandBuilder()
    .setName('채널해제')
    .setDescription('이 채널에서 제미나이의 자동 답변을 끕니다.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('초기화')
    .setDescription('이 채널의 대화 기억을 지웁니다.'),
  new SlashCommandBuilder()
    .setName('상태')
    .setDescription('현재 사용 중인 모델과 채널 설정을 보여줍니다.'),
].map((c) => c.toJSON());

async function registerCommands(applicationId) {
  const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(applicationId), { body: commands });
  console.log('슬래시 명령어를 등록했습니다.');
}

// ───────────────────────── 이벤트 핸들러 ─────────────────────────

client.once(Events.ClientReady, async (readyClient) => {
  console.log('봇이 준비되었습니다!');
  console.log(`로그인 계정: ${readyClient.user.tag}`);
  console.log(`사용 모델: ${config.MODEL}`);
  console.log(`활성화된 채널: ${store.list().length}개`);
  console.log(`설정 저장 위치: ${store.dataDir} (쓰기 ${store.isPersistent() ? '가능' : '불가'})`);

  try {
    await registerCommands(readyClient.user.id);
  } catch (err) {
    // 명령어 등록에 실패해도 채팅 기능은 살아 있어야 한다.
    console.error('슬래시 명령어 등록 실패:', err.message);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    switch (interaction.commandName) {
      case '채널설정': {
        const added = store.activate(interaction.channelId);
        const lines = [
          added
            ? `✅ 이제 이 채널의 모든 메시지에 **${config.BOT_NAME}**가 답변합니다.`
            : 'ℹ️ 이 채널은 이미 활성화되어 있습니다.',
        ];
        // 볼륨이 없는 환경이면 재배포 시 설정이 사라지므로 대안을 안내한다.
        if (!store.isPersistent()) {
          lines.push(
            '',
            '⚠️ 이 서버는 설정을 디스크에 저장할 수 없습니다. 재시작하면 이 설정이 사라집니다.',
            `호스팅 환경변수에 \`ACTIVE_CHANNEL_IDS=${interaction.channelId}\` 를 추가해 두세요.`
          );
        }
        await interaction.reply(lines.join('\n'));
        break;
      }
      case '채널해제': {
        const removed = store.deactivate(interaction.channelId);
        histories.delete(interaction.channelId);
        const lines = [
          removed ? '🛑 이 채널의 자동 답변을 껐습니다.' : 'ℹ️ 이 채널은 활성화되어 있지 않습니다.',
        ];
        if (store.isPinned(interaction.channelId)) {
          lines.push(
            '⚠️ 이 채널은 `ACTIVE_CHANNEL_IDS` 환경변수에 고정돼 있어, 봇을 재시작하면 다시 켜집니다.'
          );
        }
        await interaction.reply(lines.join('\n'));
        break;
      }
      case '초기화': {
        histories.delete(interaction.channelId);
        await interaction.reply('🧹 이 채널의 대화 기억을 지웠습니다.');
        break;
      }
      case '상태': {
        await interaction.reply({
          content: [
            `**모델**: \`${config.MODEL}\``,
            `**이 채널 활성화**: ${store.isActive(interaction.channelId) ? '예' : '아니오'}`,
            `**전체 활성 채널 수**: ${store.list().length}개`,
            `**기억 중인 대화**: ${(histories.get(interaction.channelId)?.length ?? 0) / 2}턴`,
            `**설정 영구 저장**: ${store.isPersistent() ? '예' : '아니오 (재시작 시 초기화)'}`,
            `**가동 시간**: ${formatUptime(process.uptime())}`,
          ].join('\n'),
          flags: MessageFlags.Ephemeral,
        });
        break;
      }
    }
  } catch (err) {
    console.error('명령어 처리 중 오류:', err);
  }
});

client.on(Events.MessageCreate, async (message) => {
  // 봇/웹훅 메시지와 비활성 채널은 무시
  if (message.author.bot || message.system) return;
  if (!store.isActive(message.channelId)) return;

  const content = message.content?.trim();
  if (!content) return; // 첨부파일만 있는 메시지 등
  if (content.startsWith('//') || content.startsWith('!')) return; // 잡담/명령 제외용 접두사

  if (busyChannels.has(message.channelId)) {
    await message.reply('⏳ 앞선 질문에 답하는 중입니다. 잠시만 기다려 주세요!').catch(() => {});
    return;
  }
  busyChannels.add(message.channelId);

  // 답변이 오는 동안 "입력 중..." 표시를 유지한다 (디스코드는 10초마다 갱신 필요)
  const typing = setInterval(() => message.channel.sendTyping().catch(() => {}), 8000);
  message.channel.sendTyping().catch(() => {});

  try {
    const history = histories.get(message.channelId) ?? [];
    const messages = [
      { role: 'system', content: config.SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: `${message.author.displayName}: ${content}` },
    ];

    const answer = await askOpenRouter(messages);

    // 성공했을 때만 기록에 남긴다.
    const updated = [
      ...history,
      { role: 'user', content: `${message.author.displayName}: ${content}` },
      { role: 'assistant', content: answer },
    ];
    histories.set(message.channelId, updated.slice(-config.HISTORY_TURNS * 2));

    for (const chunk of splitMessage(answer)) {
      await message.reply(chunk);
    }
  } catch (err) {
    console.error(`[${message.channelId}] 답변 생성 실패:`, err.message);
    await message
      .reply(`⚠️ 답변을 만들지 못했습니다.\n\`\`\`\n${String(err.message).slice(0, 500)}\n\`\`\``)
      .catch(() => {}); // 오류 안내조차 실패해도 봇은 계속 동작
  } finally {
    clearInterval(typing);
    busyChannels.delete(message.channelId);
  }
});

// ───────────────────────── 유틸 ─────────────────────────

/** 디스코드 2000자 제한에 맞춰, 되도록 줄 단위로 잘라 나눈다. */
function splitMessage(text, limit = DISCORD_MAX_LENGTH) {
  if (text.length <= limit) return [text];

  const chunks = [];
  let rest = text;

  while (rest.length > limit) {
    const window = rest.slice(0, limit);
    // 문단 → 줄 → 공백 순으로 자연스러운 분할 지점을 찾는다.
    let cut = window.lastIndexOf('\n\n');
    if (cut < limit * 0.5) cut = window.lastIndexOf('\n');
    if (cut < limit * 0.5) cut = window.lastIndexOf(' ');
    if (cut < limit * 0.5) cut = limit; // 적당한 지점이 없으면 그냥 자른다

    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return [d && `${d}일`, h && `${h}시간`, `${m}분`].filter(Boolean).join(' ');
}

// ───────────────────────── 헬스체크 (선택) ─────────────────────────
// PORT 환경변수가 있을 때만 뜬다. Northflank 등에서 포트를 요구할 경우 사용.

if (process.env.PORT) {
  http
    .createServer((req, res) => {
      const healthy = client.isReady();
      res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: healthy ? 'ok' : 'starting',
          bot: client.user?.tag ?? null,
          channels: store.list().length,
          uptime: Math.floor(process.uptime()),
        })
      );
    })
    .listen(Number(process.env.PORT), () => {
      console.log(`헬스체크 서버 실행 중 (포트 ${process.env.PORT})`);
    })
    .on('error', (err) => console.error('헬스체크 서버 오류:', err.message));
}

// ───────────────────────── 전역 예외 처리 ─────────────────────────
// 예기치 못한 오류로 프로세스가 죽는 것을 막는다.

process.on('unhandledRejection', (reason) => {
  console.error('처리되지 않은 Promise 오류:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('처리되지 않은 예외:', err);
});
client.on(Events.Error, (err) => console.error('디스코드 클라이언트 오류:', err));

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log('\n봇을 종료합니다...');
    client.destroy();
    process.exit(0);
  });
}

client.login(config.DISCORD_TOKEN).catch((err) => {
  console.error('디스코드 로그인 실패. DISCORD_TOKEN을 확인해 주세요:', err.message);
  process.exit(1);
});
