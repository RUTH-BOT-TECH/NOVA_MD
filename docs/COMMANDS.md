# Command catalogue

Generated from the registry — **314 commands**, 584 names with aliases, 22 categories.

Regenerate with `npm run docs`.

| Category | Commands |
|---|---|
| [general](#general) | 21 |
| [group](#group) | 24 |
| [owner](#owner) | 17 |
| [tools](#tools) | 8 |
| [text](#text) | 23 |
| [converter](#converter) | 29 |
| [image](#image) | 25 |
| [media](#media) | 7 |
| [anime](#anime) | 17 |
| [fun](#fun) | 12 |
| [games](#games) | 20 |
| [download](#download) | 11 |
| [ai](#ai) | 6 |
| [misc](#misc) | 4 |
| [audio](#audio) | 10 |
| [dev](#dev) | 10 |
| [economy](#economy) | 12 |
| [faith](#faith) | 3 |
| [reactions](#reactions) | 18 |
| [search](#search) | 11 |
| [social](#social) | 3 |
| [textmaker](#textmaker) | 23 |

## general

| Command | Aliases | Access | What it does |
|---|---|---|---|
| `alive` | `runtime` | everyone | Uptime, memory and connection status |
| `botinfo` | — | everyone | Name, version, host, library, commands |
| `changelog` | — | everyone | Recent changes |
| `date` | — | everyone | Today’s date in the bot timezone |
| `donate` | — | everyone | Support the project |
| `faq` | — | everyone | Common questions |
| `getsession` | — | everyone | Get your own SESSION_ID from the pairing site |
| `menu` | `help` `commands` | everyone | Bot info + every command grouped by category |
| `owner` | — | everyone | Contact the bot owner |
| `ping` | `p` | everyone | Check that the bot is alive and how fast it replies |
| `privacy` | — | everyone | What the bot stores |
| `profile` | `me` | everyone | Your profile in this chat |
| `repo` | `source` `script` | everyone | Show this bot's name, version and source link |
| `report` | `bug` | everyone | Report a bug to the owner |
| `rules` | — | everyone | Group rules template |
| `speed` | `latency` | everyone | Measure WhatsApp API round-trip (3 samples) |
| `suggest` | `request` | everyone | Send a feature request to the owner |
| `sysinfo` | `stats` `runtime2` | everyone | Host, CPU, memory and process details |
| `time` | — | everyone | Current time in the bot timezone |
| `tos` | — | everyone | Terms of service |
| `uptime` | — | everyone | How long the bot has been running |

## group

| Command | Aliases | Access | What it does |
|---|---|---|---|
| `admins` | `adminlist` | group | List the group admins |
| `antilink` | — | 🛡️ admin | Delete links posted by non-admins (on | off) |
| `delmsg` | — | 🛡️ admin | Delete a message (reply to it) |
| `demote` | `unadmin` | 🛡️ admin | Take admin rights away from someone |
| `goodbye` | `setgoodbye` | 🛡️ admin | Announce members leaving — on | off | set <text> |
| `groupinfo` | `ginfo` `infogroup` | group | Group name, owner, size, settings |
| `hidetag` | — | 🛡️ admin | Mention everyone without listing names |
| `kick` | `remove` `boot` | 🛡️ admin | Remove a member (reply to them or pass @mention / number) |
| `link` | `invite` `gclink` | 🛡️ admin | Get or reset the group invite link |
| `mute` | `close` `lock` | 🛡️ admin | Admins-only mode: only admins can talk |
| `pinmsg` | — | 🛡️ admin | Pin a message (reply to it) |
| `poll` | — | 🛡️ admin | Create a poll — .poll question | opt1 | opt2 |
| `promote` | `admin` | 🛡️ admin | Make someone a group admin |
| `resetlink` | — | 🛡️ admin | Revoke the current invite link |
| `resetwarn` | — | 🛡️ admin | Clear warnings for a member (or all) |
| `setdesc` | — | 🛡️ admin | Change the group description |
| `setname` | — | 🛡️ admin | Rename the group |
| `setpp` | — | 🛡️ admin | Set the group icon (reply to an image) |
| `tagadmins` | — | 🛡️ admin | Mention only the admins |
| `tagall` | `everyone` | 🛡️ admin | Mention every member of the group |
| `unmute` | `open` `unlock` | 🛡️ admin | Everyone can talk again |
| `warn` | — | 🛡️ admin | Warn a member; 3 warnings = kick |
| `warnings` | `warns` | group | Show warning counts in this group |
| `welcome` | `setwelcome` | 🛡️ admin | Greet new members — on | off | set <text> |

## owner

| Command | Aliases | Access | What it does |
|---|---|---|---|
| `autoread` | — | 👑 owner | Toggle blue ticks on incoming messages |
| `autotyping` | — | 👑 owner | Show "typing…" before replies |
| `blacklist` | `block` | 👑 owner | Make the bot ignore a user |
| `blocked` | `blacklisted` | 👑 owner | Show the block list |
| `botname` | `rename` | 👑 owner | Rename the bot at runtime |
| `broadcast` | `bc` | 👑 owner | Send a message to every group the bot is in |
| `cleartmp` | `purgetmp` | 👑 owner | Delete leftover download temp folders |
| `join` | `joingroup` | 👑 owner | Join a group from an invite link |
| `leave` | `exit` | 👑 owner | Leave this group (or another) |
| `maintenance` | `maintain` | 👑 owner | Only owners can use the bot while on |
| `mode` | — | 👑 owner | Switch between public and self (owner-only) mode |
| `prefix` | — | 👑 owner | Change command prefixes at runtime |
| `reload` | `restart` | 👑 owner | Hot-reload every plugin from disk without dropping the session |
| `setbotpic` | `botpic` `setpic` | 👑 owner | Set the bot profile photo from a replied image |
| `sudo` | `addowner` | 👑 owner | Grant owner rights to a user |
| `unblacklist` | `unblock` | 👑 owner | Let a blocked user back in |
| `unsudo` | `delowner` | 👑 owner | Revoke owner rights |

## tools

| Command | Aliases | Access | What it does |
|---|---|---|---|
| `getpp` | `pfp` `avatar` | everyone | Get a profile picture by reply, mention or number |
| `qr` | `qrcode` | everyone | Turn text or a link into a QR image |
| `sticker` | `s` `stiker` | everyone | Reply to an image to turn it into a sticker |
| `toimg` | `toimage` `unsticker` | everyone | Turn a sticker back into a normal image |
| `vcard` | `contact` `savecontact` | everyone | Send a contact card — yours, or anyone's by number |
| `vv` | `viewonce` `reveal` | everyone | Re-send a view-once photo/video/voice note as normal media |
| `weather` | `forecast` `wttr` | everyone | Current weather + 3-day forecast for any city |
| `whoami` | `myid` `id` | everyone | Your JID, chat id, role and device info |

## text

| Command | Aliases | Access | What it does |
|---|---|---|---|
| `atbash` | — | everyone | Atbash cipher (a↔z) |
| `base64` | `b64` | everyone | Base64 encode or decode text |
| `bigtext` | — | everyone | Spoiler-free big block |
| `caesar` | `shift` | everyone | Caesar shift — .caesar <n> <text> |
| `calc` | `math` `calculate` | everyone | Evaluate a math expression |
| `fancy` | `style` `font` | everyone | Convert text into unicode styles for names and bios |
| `hash` | — | everyone | Hash text with any algorithm |
| `lorem` | `lipsum` | everyone | Placeholder lorem ipsum text |
| `md5` | — | everyone | MD5 hash of text |
| `mock` | — | everyone | sPoNgEbOb mock case |
| `morse` | — | everyone | Text → Morse code |
| `password` | `pass` `gen` | everyone | Generate a strong random password |
| `random-string` | `randstr` `randomstring` | everyone | Random string — .random-string [length] [hex|alnum|base64] |
| `readmore` | — | everyone | "Read more" trick — hides the rest behind the button |
| `reverse` | `rev` | everyone | Reverse the characters |
| `rot13` | — | everyone | ROT13 cipher |
| `sha1` | — | everyone | SHA1 hash of text |
| `sha256` | — | everyone | SHA256 hash of text |
| `sha512` | — | everyone | SHA512 hash of text |
| `spoiler` | — | everyone | Wrap text in a WhatsApp spoiler |
| `unmorse` | — | everyone | Morse code → text |
| `uuid` | `guid` | everyone | Generate a random UUID v4 |
| `vaporwave` | `aesthetic` | everyone | Ｆｕｌｌ－ｗｉｄｔｈ ｖａｐｏｒｗａｖｅ text |

## converter

| Command | Aliases | Access | What it does |
|---|---|---|---|
| `base64dec` | `b64dec` | everyone | Base64 → text |
| `base64enc` | `b64enc` | everyone | Text → base64 |
| `bin2dec` | — | everyone | Binary → decimal |
| `binary2text` | — | everyone | Binary → text |
| `celsius` | `c2f` | everyone | Celsius → Fahrenheit |
| `cm2inch` | `inch` | everyone | Centimetres → inches |
| `datasize` | `bytes` | everyone | Bytes → human readable size |
| `dec2bin` | — | everyone | Decimal → binary |
| `dec2hex` | — | everyone | Decimal → hexadecimal |
| `dec2oct` | `octal` | everyone | Decimal → octal |
| `fahrenheit` | `f2c` | everyone | Fahrenheit → Celsius |
| `ft2m` | — | everyone | Feet → metres |
| `g2oz` | — | everyone | Grams → ounces |
| `hex2dec` | — | everyone | Hexadecimal → decimal |
| `hex2text` | — | everyone | Hexadecimal → text |
| `inch2cm` | — | everyone | Inches → centimetres |
| `kelvin` | — | everyone | Celsius → Kelvin |
| `kg2lbs` | — | everyone | Kilograms → pounds |
| `km2miles` | `km2mi` | everyone | Kilometres → miles |
| `lbs2kg` | — | everyone | Pounds → kilograms |
| `m2ft` | — | everyone | Metres → feet |
| `miles2km` | `mi2km` | everyone | Miles → kilometres |
| `num2roman` | `toroman` | everyone | Arabic number → Roman numeral |
| `number2words` | `words` | everyone | Number → English words |
| `oz2g` | — | everyone | Ounces → grams |
| `roman2num` | `fromroman` | everyone | Roman numeral → Arabic number |
| `text2binary` | `binary` | everyone | Text → binary |
| `text2hex` | — | everyone | Text → hexadecimal |
| `ton2kg` | — | everyone | Metric tons → kilograms |

## image

| Command | Aliases | Access | What it does |
|---|---|---|---|
| `blur` | — | everyone | Gaussian blur |
| `brighten` | — | everyone | Raise brightness |
| `circle` | — | everyone | Crop into a circle |
| `compress` | — | everyone | Crush the file size |
| `contrast` | — | everyone | Increase contrast |
| `darken` | — | everyone | Lower brightness |
| `deepfry` | — | everyone | Deep-fried meme |
| `desaturate` | — | everyone | Drain the colours |
| `edges` | `edge` | everyone | Edge detect |
| `emboss` | — | everyone | Emboss filter |
| `glitch` | — | everyone | Chromatic glitch |
| `grayscale` | `gray` `bw` | everyone | Black and white |
| `invert` | — | everyone | Invert colours |
| `mirror` | — | everyone | Mirror horizontally |
| `oldfilm` | — | everyone | Aged film look |
| `pixelate` | — | everyone | Pixelate |
| `resize` | `scale` | everyone | Resize an image — .resize <width> |
| `rotate180` | — | everyone | Rotate 180° |
| `rotate270` | — | everyone | Rotate 270° |
| `rotate90` | — | everyone | Rotate 90° |
| `saturate` | — | everyone | Punch the colours |
| `sepia` | — | everyone | Warm sepia tone |
| `sharpen` | — | everyone | Sharpen details |
| `vflip` | `flip` | everyone | Flip vertically |
| `vignette` | — | everyone | Darken the edges |

## media

| Command | Aliases | Access | What it does |
|---|---|---|---|
| `save` | `getmedia` | everyone | Save whatever media you reply to |
| `saveaudio` | `aud2doc` | everyone | Save an audio clip as a document |
| `savedoc` | `doc2doc` | everyone | Re-send a replied document |
| `saveimg` | `img2doc` | everyone | Save an image as a document |
| `savevideo` | `vid2doc` | everyone | Save a video as a document |
| `stickerinfo` | `sinfo` | everyone | Read a sticker's pack name, author and dimensions |
| `take` | `steal` `renamesticker` | everyone | Change a sticker's pack name and author |

## anime

| Command | Aliases | Access | What it does |
|---|---|---|---|
| `anime` | `animeinfo` `animesearch` | everyone | Search anime by title |
| `animepic` | `neko` `waifu` `husbando` | everyone | Random SFW anime picture |
| `animequote` | `aquote` | everyone | Random anime quote |
| `animescene` | `scene` `whatanime` | everyone | Identify the anime from a replied screenshot |
| `blush` | — | everyone | Anime reaction gif — blushes at |
| `character` | `animechar` `char` | everyone | Look up an anime character |
| `cuddle` | — | everyone | Anime reaction gif — cuddles |
| `hug` | — | everyone | Anime reaction gif — hugs |
| `kiss` | — | everyone | Anime reaction gif — kisses |
| `manga` | `mangasearch` | everyone | Search manga by title |
| `ongoing` | `airing` `seasonnow` | everyone | Currently airing anime |
| `pat` | — | everyone | Anime reaction gif — pats |
| `poke` | — | everyone | Anime reaction gif — pokes |
| `randomanime` | `ranime` | everyone | A random anime with cover art |
| `slap` | — | everyone | Anime reaction gif — slaps |
| `topanime` | `topanimes` | everyone | Highest rated anime |
| `wave` | — | everyone | Anime reaction gif — waves at |

## fun

| Command | Aliases | Access | What it does |
|---|---|---|---|
| `answer` | — | everyone | Answer the active riddle |
| `coinflip` | `cointoss` | everyone | Heads or tails |
| `compliment` | — | everyone | Compliment someone |
| `fact` | — | everyone | Random fact |
| `horoscope` | `horoscopes` | everyone | Daily horoscope — .horoscope leo |
| `insult` | — | everyone | Playful insult |
| `joke` | `jokes` | everyone | Random programming joke |
| `neverhaveiever` | `nhie` | everyone | Never have I ever… |
| `riddle` | — | everyone | A riddle — answer with .answer |
| `rps` | — | everyone | Rock paper scissors — .rps rock |
| `ship` | `lovemeter` | everyone | Ship two people — .ship Name1 & Name2 |
| `wouldyourather` | `wyr` | everyone | Would you rather… |

## games

| Command | Aliases | Access | What it does |
|---|---|---|---|
| `8ball` | `eightball` | everyone | Ask the magic 8-ball a yes/no question |
| `blackjack` | `bj` `21` | everyone | Play a hand of blackjack against the dealer |
| `connect4` | `c4` | everyone | Play Connect 4 against the bot |
| `dare` | — | everyone | Get a dare |
| `dice` | `roll` | everyone | Roll dice — .dice 2d6 |
| `drop` | — | everyone | Drop a disc in Connect 4 |
| `guess` | — | everyone | Submit a Wordle guess |
| `hit` | `hitme` | everyone | Take another card |
| `lottery` | `lotto` | everyone | Pick 5 numbers from 1–50 |
| `lovecalc` | `love` `match` | everyone | Deterministic love score between two names |
| `move` | `play` | everyone | Place your mark in tic-tac-toe |
| `quit` | `abort` | everyone | Abandon the game in this chat |
| `quote` | `quotes` | everyone | A random quote |
| `roll` | `roll20` `dice20` | everyone | Roll dice — .roll 2d6 or .roll 20 |
| `roulette` | — | everyone | Bet red, black or a number |
| `stand` | — | everyone | Hold your hand and let the dealer play |
| `tictactoe` | `ttt` | everyone | Play tic-tac-toe against the bot |
| `truth` | — | everyone | Get a truth question |
| `wheel` | `spinwheel` | everyone | Spin a prize wheel |
| `wordle` | — | everyone | Guess a five-letter word in six tries |

## download

| Command | Aliases | Access | What it does |
|---|---|---|---|
| `dl` | `download` | everyone | Download any supported link (audio) |
| `dlstatus` | `ytdlp` `strategies` | everyone | Which download strategies are available on this host |
| `facebook` | — | everyone | Download from facebook (yt-dlp extractor) |
| `instagram` | — | everyone | Download from instagram (yt-dlp extractor) |
| `play` | `song` `ytmp3` `music` | everyone | Search and send a song as audio |
| `reddit` | — | everyone | Download from reddit (yt-dlp extractor) |
| `tiktok` | — | everyone | Download from tiktok (yt-dlp extractor) |
| `twitter` | `x` | everyone | Download from twitter (yt-dlp extractor) |
| `ytinfo` | `yt` | everyone | Metadata for a video link (no download) |
| `yts` | `ytsearch` `find` | everyone | Search YouTube and list results |
| `ytv` | `ytmp4` `video` | everyone | Search and send a video |

## ai

| Command | Aliases | Access | What it does |
|---|---|---|---|
| `ai` | `ask` `chat` `nova` | everyone | Ask the AI anything (uses your configured provider) |
| `aistatus` | `aicfg` | everyone | Which AI providers are configured |
| `gemini` | — | everyone | Ask via Gemini |
| `gpt` | — | everyone | Ask via your OpenAI-compatible provider |
| `groq` | — | everyone | Ask via Groq |
| `resetai` | `aiclear` `forget` | everyone | Clear the AI conversation memory for this chat |

## misc

| Command | Aliases | Access | What it does |
|---|---|---|---|
| `note` | `notes` | everyone | Per-chat notes: add · list · del · clear |
| `remind` | `reminder` | everyone | Set a reminder (10m, 2h, 90s) |
| `short` | `tinyurl` `shorten` | everyone | Shorten a URL |
| `translate` | `tr` | everyone | Translate text (source auto-detected) |

## audio

| Command | Aliases | Access | What it does |
|---|---|---|---|
| `audiospeed` | `tempo` | everyone | Change audio speed without pitch — .audiospeed 1.5 |
| `audiostatus` | `ffstatus` `ffmpeg` | everyone | Whether this host can convert audio |
| `reverseaudio` | `revaudio` | everyone | Play audio backwards |
| `toaudio` | `extractaudio` | everyone | Extract audio from a video |
| `togif` | — | everyone | Convert a short video to a GIF |
| `tomp3` | `mp3` | everyone | Convert audio/video to mp3 |
| `tovoice` | `toptt` `voicenote` | everyone | Convert to a WhatsApp voice note (ogg/opus) |
| `trim` | `cut` | everyone | Cut a clip — .trim 0:30 1:00 |
| `volume` | — | everyone | Change loudness — .volume 2 (×N) |
| `waveform` | `wavepic` | everyone | Render an audio waveform image |

## dev

| Command | Aliases | Access | What it does |
|---|---|---|---|
| `age` | `howold` | everyone | Exact age from a birth date |
| `bmi` | — | everyone | Body mass index with the category |
| `color` | `colour` `hex` | everyone | Convert a colour and preview it |
| `entropy` | `passcheck` | everyone | Estimate password strength |
| `json` | `formatjson` `jq` | everyone | Validate and pretty-print JSON |
| `jwt` | `decodejwt` | everyone | Decode a JWT payload (no signature check) |
| `rand` | `randomnum` | everyone | Cryptographically random number |
| `regex` | `regexp` | everyone | Test a regular expression against text |
| `timestamp` | `ts` `epoch` | everyone | Convert between unix time and dates |
| `url` | `parseurl` `urlinfo` | everyone | Break a URL into its parts |

## economy

| Command | Aliases | Access | What it does |
|---|---|---|---|
| `balance` | `bal` `wallet` `bank` | everyone | Your wallet and bank balance |
| `beg` | — | everyone | Beg for a little change (10m cooldown) |
| `daily` | `claim` | everyone | Claim your daily reward (streak multiplies it) |
| `deposit` | `dep` | everyone | Move cash into the bank (safer from robbery) |
| `ecoreset` | `reseteco` | 👑 owner | Wipe one user or everyone (owner) |
| `gamble` | `bet` | everyone | Bet an amount on a coin toss (48% win) |
| `pay` | `transfer` `give` | everyone | Send money to someone (2% fee) |
| `rich` | `leaderboard` `top` | everyone | Richest users |
| `rob` | — | everyone | Try to rob someone — you can get caught |
| `slots` | — | everyone | Spin the slot machine |
| `withdraw` | `with` | everyone | Move money out of the bank |
| `work` | — | everyone | Do a job for coins (1h cooldown) |

## faith

| Command | Aliases | Access | What it does |
|---|---|---|---|
| `prayer` | `salah` `salat` `prayertimes` | everyone | Prayer times for a city |
| `qibla` | `qiblah` | everyone | Qibla direction for a city |
| `verse` | `bible` `scripture` | everyone | A verse from the King James Bible |

## reactions

| Command | Aliases | Access | What it does |
|---|---|---|---|
| `angry` | `mad` | everyone | React with 😠  (aka .mad) |
| `clap` | `bravo` | everyone | React with 👏  (aka .bravo) |
| `eyes` | `look` | everyone | React with 👀  (aka .look) |
| `fire` | `lit` | everyone | React with 🔥  (aka .lit) |
| `hundred` | `perfect` | everyone | React with 💯  (aka .perfect) |
| `laugh` | `lol` `lmao` | everyone | React with 😂  (aka .lol .lmao) |
| `love` | `heart` | everyone | React with ❤️  (aka .heart) |
| `nope` | `dislike` | everyone | React with 👎  (aka .dislike) |
| `ok` | `okay` | everyone | React with 👌  (aka .okay) |
| `party` | `celebrate` | everyone | React with 🥳  (aka .celebrate) |
| `pray` | `thanks` | everyone | React with 🙏  (aka .thanks) |
| `react` | — | everyone | React with any emoji you type |
| `sad` | `cry` | everyone | React with 😢  (aka .cry) |
| `salute` | `respect` | everyone | React with 🫡  (aka .respect) |
| `skull` | `dead` | everyone | React with 💀  (aka .dead) |
| `think` | `hmm` | everyone | React with 🤔  (aka .hmm) |
| `unreact` | `noreact` | everyone | Remove your reaction |
| `wow` | `shock` | everyone | React with 😮  (aka .shock) |

## search

| Command | Aliases | Access | What it does |
|---|---|---|---|
| `book` | `books` | everyone | Search Open Library |
| `crypto` | `coin` | everyone | Crypto price |
| `currency` | `fx` `rate` | everyone | Exchange rates |
| `define` | `dict` `meaning` | everyone | Dictionary definition |
| `github` | `gh` | everyone | Search GitHub repositories |
| `ip` | `ipinfo` | everyone | IP address lookup |
| `lyrics` | — | everyone | Song lyrics |
| `news` | — | everyone | Headlines from Google News |
| `npm` | `package` | everyone | npm package details |
| `tv` | `show` `series` | everyone | TV show lookup |
| `wiki` | `wikipedia` | everyone | Wikipedia summary |

## social

| Command | Aliases | Access | What it does |
|---|---|---|---|
| `afk` | `brb` | everyone | Mark yourself away — mentions get an auto-reply |
| `back` | `unafk` `iamhere` | everyone | Clear your AFK status |
| `birthday` | `bday` `dob` | everyone | Save or show birthdays |

## textmaker

| Command | Aliases | Access | What it does |
|---|---|---|---|
| `bolditalic` | `heavyital` | everyone | Bold italic |
| `circled` | `round` `encircle` | everyone | Circled letters |
| `cursive` | `calligraphy` | everyone | Cursive script |
| `double` | `outline` `blackboard` | everyone | Double-struck (outline) |
| `gothic` | `fraktur` `blackletter` | everyone | Gothic / fraktur |
| `leet` | `1337` `hacker` | everyone | Leetspeak |
| `mirrortext` | `backwards` `mirrored` | everyone | Mirrored |
| `monospace` | `code` `typewriter` | everyone | Monospace / code |
| `negcircled` | `negcircle` | everyone | Negative circled letters |
| `regional` | `flags` `indicator` | everyone | Regional indicator letters |
| `sansbold` | `thick` | everyone | Sans-serif bold |
| `sansitalic` | `slanted` | everyone | Sans-serif italic |
| `sarcasm` | `sarcastic` `spongebob` | everyone | Mocking case |
| `spaced` | `wide` `spread` | everyone | Spaced out |
| `squared` | `square` `boxed` | everyone | Squared letters |
| `strike` | `strikethru` `crossout` | everyone | Strikethrough |
| `subscript` | `sub` | everyone | Subscript |
| `superscript` | `super` | everyone | Superscript |
| `textmaker` | `styles` `allfonts` | everyone | Show your text in every style at once |
| `underline` | `under` | everyone | Underline |
| `unstyle` | `plain` | everyone | Best-effort plain text: strips unicode letters + combining marks |
| `upside` | `upsidedown` `down` | everyone | Upside down (reversed) |
| `zalgo` | `cursed` `chaos` | everyone | Zalgo (glitch text) |
