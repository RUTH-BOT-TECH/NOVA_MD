/** Applies every image op to a generated test image. Run: npm run test:image */
import sharp from 'sharp';
import ops, { applyOp } from '../plugins/image/edit.js';

const src = await sharp({ create: { width: 900, height: 600, channels: 3, background: '#25d366' } }).png().toBuffer();
let pass = 0;
const fails = [];

for (const op of ops) {
  try {
    const out = await applyOp(op.name, src, op.name === 'resize' ? ['300'] : []);
    const meta = await sharp(out).metadata();
    if (!out.length || !meta.width) throw new Error('empty output');
    pass++;
    process.stdout.write(`✓ ${op.name}(${meta.format} ${meta.width}x${meta.height})  `);
  } catch (err) {
    fails.push([op.name, err.message.slice(0, 70)]);
  }
}

console.log(`\n\nimage ops: ${pass}/${ops.length} passed`);
if (fails.length) console.log('FAILED:\n' + fails.map(([n, m]) => `  ${n}: ${m}`).join('\n'));
process.exit(fails.length ? 1 : 0);
