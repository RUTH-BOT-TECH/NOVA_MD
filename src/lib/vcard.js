/**
 * Contact (vCard) messages.
 *
 * Sending a contact card gives you that familiar card UI — accent bar, avatar,
 * "Contact:" label — and the name on it is whatever string we put in FN.
 * That is how bots show a ✓ next to their name: the tick is a character in the
 * display name, not Meta verification (only Meta can grant that, server-side).
 */

const clean = (n = '') => String(n).replace(/[^0-9]/g, '');

export function buildVcard({ name, phone, org = '', url = '' }) {
  const num = clean(phone);
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${name}`,
    org && `ORG:${org}`,
    `TEL;type=CELL;type=VOICE;waid=${num}:+${num}`,
    url && `URL:${url}`,
    'END:VCARD',
  ];
  return lines.filter(Boolean).join('\n');
}

/** One card. */
export function contactMessage({ name, phone, org, url }) {
  return {
    contacts: {
      displayName: name,
      contacts: [{ vcard: buildVcard({ name, phone, org, url }) }],
    },
  };
}

/** Several cards in one message (WhatsApp caps a batch at 5). */
export function contactsMessage(list = []) {
  const items = list.slice(0, 5).map((c) => ({ vcard: buildVcard(c) }));
  return { contacts: { displayName: list.length === 1 ? list[0].name : `${list.length} contacts`, contacts: items } };
}

/** Is this a plausible international number? */
export const looksLikeNumber = (v = '') => /^\d{8,15}$/.test(clean(v));
