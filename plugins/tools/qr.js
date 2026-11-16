export default {
  name: 'qr',
  aliases: ['qrcode'],
  category: 'tools',
  description: 'Turn text or a link into a QR image',
  usage: '.qr https://example.com',
  async run({ argsText, reply }) {
    if (!argsText) return reply({ text: 'Usage: .qr <text or link>' });
    let QRCode;
    try { QRCode = (await import('qrcode')).default; }
    catch { return reply({ text: '❌ Run `npm i qrcode` to enable this command.' }); }

    const buffer = await QRCode.toBuffer(argsText.slice(0, 900), {
      type: 'png', width: 640, margin: 1, errorCorrectionLevel: 'M',
      color: { dark: '#0b0b0b', light: '#ffffff' },
    });
    await reply({ image: buffer, caption: `🔳 QR for: ${argsText.slice(0, 120)}` });
  },
};
