import { ask, availableProviders, forget, recall, memorySize } from '../../src/lib/ai.js';
import { row } from '../../src/lib/ui.js';

const MAX_PROMPT = 1500;

const chatCommand = (name, description, aliases = []) => ({
  name,
  aliases,
  category: 'ai',
  description,
  usage: `.${name} <question>`,
  cooldownMs: 4000,
  async run({ argsText, reply, jid, msg, config, sock }) {
    let prompt = String(argsText || '').trim();
    // if they reply to a message, use that as context
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text;
    if (quotedText) prompt = `${prompt}\n\n[quoted message]\n${quotedText}`.trim();

    if (!prompt) return reply({ text: `Usage: .${name} <your question>` });
    if (prompt.length > MAX_PROMPT) return reply({ text: '❌ That is too long — keep it under 1500 characters.' });

    await sock.sendPresenceUpdate('composing', jid).catch(() => {});
    try {
      const out = await ask(jid, prompt);
      await sock.sendPresenceUpdate('paused', jid).catch(() => {});
      await reply({ text: `${out.text}\n\n_${out.provider}_` });
    } catch (err) {
      await reply({ text: `⚠️ ${err.message}` });
    }
  },
});

export default [
  chatCommand('ai', 'Ask the AI anything (uses your configured provider)', ['ask', 'chat', 'nova']),
  chatCommand('gpt', 'Ask via your OpenAI-compatible provider', []),
  chatCommand('gemini', 'Ask via Gemini', []),
  chatCommand('groq', 'Ask via Groq', []),

  {
    name: 'aistatus',
    aliases: ['aicfg'],
    category: 'ai',
    description: 'Which AI providers are configured',
    usage: '.aistatus',
    async run({ reply }) {
      const providers = availableProviders();
      await reply({
        text: [
          '┏❐ 《 ᴀɪ 》 ❐',
          row('providers', providers.length ? providers.join(' · ') : 'none configured'),
          row('model', process.env.OPENAI_MODEL || process.env.GROQ_MODEL || process.env.GEMINI_MODEL || 'provider default'),
          row('memory', `${memorySize()} chat(s) in RAM`),
          row('max tokens', process.env.AI_MAX_TOKENS || 512),
          '┗❐',
          '',
          providers.length ? '_Ready. Try `.ai explain webhooks`_' : '_Add GEMINI_API_KEY or GROQ_API_KEY to .env (both have free tiers)._',
        ].join('\n'),
      });
    },
  },

  {
    name: 'resetai',
    aliases: ['aiclear', 'forget'],
    category: 'ai',
    description: 'Clear the AI conversation memory for this chat',
    usage: '.resetai',
    async run({ reply, jid }) {
      const had = recall(jid).length;
      forget(jid);
      await reply({ text: had ? `🧹 Cleared ${had} stored turns for this chat.` : 'Nothing stored for this chat.' });
    },
  },
];
