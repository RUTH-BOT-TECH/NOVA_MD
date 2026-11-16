import { bareJid } from '../lib/message.js';
import { getGroupMetadata } from '../lib/group.js';

const DEFAULT_WELCOME = '👋 Welcome {user} to *{group}*!\nYou are member #{count}.';
const DEFAULT_GOODBYE = '👋 {user} left *{group}*. {count} members left.';

export function render(template, { user, group, count }) {
  return String(template)
    .replaceAll('{user}', user ?? 'member')
    .replaceAll('{group}', group ?? 'this group')
    .replaceAll('{count}', String(count ?? '?'));
}

/**
 * group-participants.update → welcome / goodbye cards.
 * Settings live in the JSON store per group, so this costs nothing when off.
 */
export async function onParticipantsUpdate({ sock, update, store, config, logger }) {
  const { id, participants = [], action, author } = update || {};
  if (!id || !['add', 'remove', 'promote', 'demote'].includes(action)) return;

  const kind = action === 'add' ? 'welcome' : action === 'remove' ? 'goodbye' : null;
  if (!kind) return;
  if (!store.get(id, `${kind}Enabled`, false)) return;

  let metadata = null;
  try { metadata = await getGroupMetadata(sock, id, { fresh: true }); } catch { /* best effort */ }

  const template = store.get(id, `${kind}Text`, kind === 'welcome' ? DEFAULT_WELCOME : DEFAULT_GOODBYE);
  const groupName = metadata?.subject || 'the group';
  const count = metadata?.participants?.length ?? participants.length;

  for (const jid of participants) {
    try {
      await sock.sendMessage(id, {
        text: render(template, { user: `@${bareJid(jid)}`, group: groupName, count }),
        mentions: [jid],
      });
    } catch (err) {
      logger?.warn({ err, jid }, `${kind} message failed`);
    }
  }
  logger?.info(`${kind} sent in ${id} (${participants.length} participant${participants.length === 1 ? '' : 's'})`);
}

/** Optional: log joins/promotions for admins. */
export async function onGroupsUpdate({ update, logger }) {
  for (const u of update || []) {
    if (u.subject) logger?.info(`group ${u.id} renamed → ${u.subject}`);
    if (u.announce !== undefined) logger?.info(`group ${u.id} announce=${u.announce}`);
  }
}
