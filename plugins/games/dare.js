const DARES = [
  'Send the last photo in your gallery.', 'Type your next 5 messages in capital letters.',
  'Voice note the alphabet backwards.', 'Text a friend "I miss you" and screenshot the reply.',
  'Change your WhatsApp status to something embarrassing for 10 minutes.',
  'Call someone in this group and sing one line.', 'Send your most recent search history word.',
  'Let the group choose your next profile photo for an hour.', 'Speak only in emojis for 10 minutes.',
  'Post a selfie right now.',
];

export default {
  name: 'dare',
  category: 'games',
  description: 'Get a dare',
  usage: '.dare',
  async run({ reply, pushName }) {
    const d = DARES[Math.floor(Math.random() * DARES.length)];
    await reply({ text: `😈 *Dare for ${pushName || 'you'}*\n\n${d}\n\n_What happens in the group stays in the group._` });
  },
};
