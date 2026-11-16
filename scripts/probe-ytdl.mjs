/** Probe: can @distube/ytdl-core fetch from this host without cookies? */
const t0 = Date.now();
const mod = await import('@distube/ytdl-core').catch(() => null);
if (!mod) { console.log('not installed'); process.exit(0); }
const ytdl = mod.default;
const url = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ';
try {
  const info = await ytdl.getInfo(url);
  console.log('✓ getInfo OK:', info.videoDetails.title.slice(0, 45), '| formats:', info.formats.length);
  const fmt = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
  console.log('  audio:', fmt.itag, fmt.mimeType, fmt.contentLength ? (fmt.contentLength / 1048576).toFixed(1) + 'MB' : '(size unknown)');
  const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
  let bytes = 0;
  await new Promise((resolve) => {
    stream.on('data', (c) => { bytes += c.length; if (bytes > 200000) { stream.destroy(); resolve(); } });
    stream.on('error', (e) => { console.log('  ✗ stream:', e.message.slice(0, 110)); resolve(); });
    stream.on('end', resolve);
  });
  console.log(`  ✓ streamed ${(bytes / 1024).toFixed(0)} KB in ${Date.now() - t0}ms`);
} catch (err) {
  console.log('✗ getInfo failed:', err.message.slice(0, 220));
}
