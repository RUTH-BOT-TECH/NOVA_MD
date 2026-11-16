import crypto from 'node:crypto';

/**
 * Board games against the bot. State lives in the store keyed per chat, so a
 * game survives other commands — and `.quit` always cleans up.
 */

const KEY = (name, jid) => `game:${name}:${jid}`;

/** store.get() hands back {} for unknown keys, so presence needs its own test. */
const live = (store, name, jid) => (store.has(KEY(name, jid)) ? store.get(KEY(name, jid)) : null);
const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

const emptyBoard = () => Array(9).fill(null);
const renderTTT = (b) => {
  const cell = (i) => b[i] ?? String(i + 1);
  return `┏❐ 《 ᴛɪᴄ ᴛᴀᴄ ᴛᴏᴇ 》 ❐\n┃ ${cell(0)} ┃ ${cell(1)} ┃ ${cell(2)}\n┃ ${cell(3)} ┃ ${cell(4)} ┃ ${cell(5)}\n┃ ${cell(6)} ┃ ${cell(7)} ┃ ${cell(8)}\n┗❐`;
};
const winnerOf = (b) => WINS.find(([a, c, d]) => b[a] && b[a] === b[c] && b[c] === b[d]) || null;

/** Minimax for the bot — small enough to be exact. */
function bestMove(board, me = 'O') {
  const other = me === 'O' ? 'X' : 'O';
  const score = (b, depth) => {
    const w = winnerOf(b);
    if (w) return b[w[0]] === me ? 10 - depth : depth - 10;
    if (b.every(Boolean)) return 0;
    const turn = (9 - b.filter(Boolean).length) % 2 === 0 ? me : other;
    const values = b.map((v, i) => v ? null : score([...b.slice(0, i), turn, ...b.slice(i + 1)], depth + 1)).filter((v) => v !== null);
    return turn === me ? Math.max(...values) : Math.min(...values);
  };
  let best = null;
  let bestScore = -Infinity;
  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    const s = score([...board.slice(0, i), me, ...board.slice(i + 1)], 0);
    if (s > bestScore) { bestScore = s; best = i; }
  }
  return best;
}

const C4_W = 7, C4_H = 6;
const emptyC4 = () => Array.from({ length: C4_H }, () => Array(C4_W).fill(null));
const renderC4 = (grid) => {
  const rows = grid.map((row) => row.map((c) => (c === 'R' ? '🔴' : c === 'Y' ? '🟡' : '⚫')).join(''));
  return ['┏❐ 《 ᴄᴏɴɴᴇᴄᴛ 4 》 ❐', ...rows.map((r) => `┃ ${r}`), '┃ 1 2 3 4 5 6 7', '┗❐'].join('\n');
};
const dropC4 = (grid, col, token) => {
  for (let r = C4_H - 1; r >= 0; r--) if (!grid[r][col]) { grid[r][col] = token; return r; }
  return -1;
};
function c4Win(grid, token) {
  for (let r = 0; r < C4_H; r++) for (let c = 0; c < C4_W; c++) {
    if (grid[r][c] !== token) continue;
    if ([[0,1],[1,0],[1,1],[1,-1]].some(([dr, dc]) => [1,2,3].every((k) => grid[r + dr * k]?.[c + dc * k] === token))) return true;
  }
  return false;
}
const c4BotMove = (grid) => {
  const valid = [...Array(C4_W).keys()].filter((c) => !grid[0][c]);
  // win if possible, block if needed, else centre-weighted random
  for (const token of ['Y', 'R']) {
    for (const c of valid) {
      const clone = grid.map((r) => [...r]);
      dropC4(clone, c, token);
      if (c4Win(clone, token)) return c;
    }
  }
  const preferred = [3, 2, 4, 1, 5, 0, 6].filter((c) => valid.includes(c));
  return preferred[0];
};

const WORDS = ['crane','audio','slope','brave','mirth','pixel','query','lodge','vapor','widen','fable','jumbo','knock','zebra','yeast','quest','mimic','ocean','prism','tulip','glide','hatch','ivory','joker'];
const WORDLE = (jid) => `game:wordle:${jid}`;
const scoreGuess = (guess, answer) => {
  const result = Array(5).fill('⬛');
  const remaining = [...answer];
  [...guess].forEach((ch, i) => {
    if (ch === answer[i]) { result[i] = '🟩'; remaining[i] = null; }
  });
  [...guess].forEach((ch, i) => {
    if (result[i] === '🟩') return;
    const at = remaining.indexOf(ch);
    if (at !== -1) { result[i] = '🟨'; remaining[at] = null; }
  });
  return result.join('');
};

export default [
  {
    name: 'tictactoe',
    aliases: ['ttt'],
    category: 'games',
    description: 'Play tic-tac-toe against the bot',
    usage: '.tictactoe  →  .move 5  ·  .quit',
    async run({ jid, store, reply }) {
      if (live(store, 'ttt', jid)) return reply({ text: 'A game is already running — *.move <1-9>* or *.quit*' });
      store.set(KEY('ttt', jid), { board: emptyBoard() });
      await reply({ text: `${renderTTT(emptyBoard())}\n\nYou are ✖ — *.move 5*` });
    },
  },

  {
    name: 'move',
    category: 'games',
    description: 'Place your mark in tic-tac-toe',
    usage: '.move 5',
    async run({ jid, store, argsText, reply }) {
      const state = live(store, 'ttt', jid);
      if (!state) return reply({ text: 'No game running. Start with .tictactoe' });
      const spot = Number(String(argsText).trim()) - 1;
      if (!Number.isInteger(spot) || spot < 0 || spot > 8) return reply({ text: 'Pick a square 1–9.' });
      if (state.board[spot]) return reply({ text: 'That square is taken.' });

      state.board[spot] = 'X';
      if (winnerOf(state.board)) {
        store.delete(KEY('ttt', jid));
        return reply({ text: `${renderTTT(state.board)}\n\n🎉 *You win!*` });
      }
      if (state.board.every(Boolean)) {
        store.delete(KEY('ttt', jid));
        return reply({ text: `${renderTTT(state.board)}\n\n🤝 Draw.` });
      }

      state.board[bestMove(state.board)] = 'O';
      if (winnerOf(state.board)) {
        store.delete(KEY('ttt', jid));
        return reply({ text: `${renderTTT(state.board)}\n\n🤖 *I win.*` });
      }
      if (state.board.every(Boolean)) {
        store.delete(KEY('ttt', jid));
        return reply({ text: `${renderTTT(state.board)}\n\n🤝 Draw.` });
      }
      store.set(KEY('ttt', jid), state);
      await reply({ text: `${renderTTT(state.board)}\n\nYour move: *.move <1-9>*` });
    },
  },

  {
    name: 'connect4',
    aliases: ['c4'],
    category: 'games',
    description: 'Play Connect 4 against the bot',
    usage: '.connect4  →  .drop 4  ·  .quit',
    async run({ jid, store, reply }) {
      if (live(store, 'c4', jid)) return reply({ text: 'A game is running — *.drop <1-7>* or *.quit*' });
      const grid = emptyC4();
      store.set(KEY('c4', jid), { grid });
      await reply({ text: `${renderC4(grid)}\n\nYou are 🔴 — *.drop 4*` });
    },
  },

  {
    name: 'drop',
    category: 'games',
    description: 'Drop a disc in Connect 4',
    usage: '.drop 4',
    async run({ jid, store, argsText, reply }) {
      const state = live(store, 'c4', jid);
      if (!state) return reply({ text: 'No game running. Start with .connect4' });
      const col = Number(String(argsText).trim()) - 1;
      if (!Number.isInteger(col) || col < 0 || col > 6) return reply({ text: 'Pick a column 1–7.' });
      if (dropC4(state.grid, col, 'R') === -1) return reply({ text: 'That column is full.' });

      if (c4Win(state.grid, 'R')) {
        store.delete(KEY('c4', jid));
        return reply({ text: `${renderC4(state.grid)}\n\n🎉 *You win!*` });
      }
      dropC4(state.grid, c4BotMove(state.grid), 'Y');
      if (c4Win(state.grid, 'Y')) {
        store.delete(KEY('c4', jid));
        return reply({ text: `${renderC4(state.grid)}\n\n🤖 *I win.*` });
      }
      if (state.grid[0].every(Boolean)) {
        store.delete(KEY('c4', jid));
        return reply({ text: `${renderC4(state.grid)}\n\n🤝 Board full — draw.` });
      }
      store.set(KEY('c4', jid), state);
      await reply({ text: `${renderC4(state.grid)}\n\nYour move: *.drop <1-7>*` });
    },
  },

  {
    name: 'wordle',
    category: 'games',
    description: 'Guess a five-letter word in six tries',
    usage: '.wordle  →  .guess crane',
    async run({ jid, store, reply }) {
      if (live(store, 'wordle', jid)) return reply({ text: 'A word is already live — *.guess <word>*' });
      const answer = WORDS[crypto.randomInt(WORDS.length)];
      store.set(WORDLE(jid), { answer, tries: [] });
      await reply({ text: '🟩 *Wordle* — guess the five-letter word.\n\n6 tries. Send *.guess crane*' });
    },
  },

  {
    name: 'guess',
    category: 'games',
    description: 'Submit a Wordle guess',
    usage: '.guess crane',
    async run({ jid, store, argsText, reply }) {
      const game = live(store, 'wordle', jid);
      if (!game) return reply({ text: 'No word live. Start with .wordle' });
      const guess = String(argsText).trim().toLowerCase();
      if (!/^[a-z]{5}$/.test(guess)) return reply({ text: 'Five letters only.' });

      game.tries.push(`${scoreGuess(guess, game.answer)}  ${guess}`);
      if (guess === game.answer) {
        store.delete(WORDLE(jid));
        return reply({ text: `${game.tries.join('\n')}\n\n🎉 Correct in ${game.tries.length}/6!` });
      }
      if (game.tries.length >= 6) {
        store.delete(WORDLE(jid));
        return reply({ text: `${game.tries.join('\n')}\n\n💀 Out of tries — the word was *${game.answer}*.` });
      }
      store.set(WORDLE(jid), game);
      await reply({ text: `${game.tries.join('\n')}\n\n${6 - game.tries.length} tries left.` });
    },
  },

  {
    name: 'quit',
    aliases: ['abort'],
    category: 'games',
    description: 'Abandon the game in this chat',
    usage: '.quit',
    async run({ jid, store, reply }) {
      let cleared = 0;
      for (const name of ['ttt', 'c4']) if (live(store, name, jid)) { store.delete(KEY(name, jid)); cleared++; }
      if (live(store, 'wordle', jid)) { store.delete(WORDLE(jid)); cleared++; }
      await reply({ text: cleared ? '🛑 Game cleared.' : 'No game running.' });
    },
  },
];
