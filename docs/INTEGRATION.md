# Integration report

Generated 2026-11-16T05:42:30.976Z · fake Baileys socket · real handler

**280 passed · 19 env-limited · 0 failed** of 299

| command | category | status | ms | detail |
|---|---|---|---|---|
| `ai` | ai | PASS | 1 | 1 payload: text |
| `aistatus` | ai | PASS | 15 | 1 payload: text |
| `gemini` | ai | PASS | 0 | 1 payload: text |
| `gpt` | ai | PASS | 0 | 1 payload: text |
| `groq` | ai | PASS | 0 | 1 payload: text |
| `resetai` | ai | PASS | 0 | 1 payload: text |
| `anime` | anime | PASS | 986 | 1 payload: text |
| `animepic` | anime | PASS | 493 | 1 payload: image |
| `animequote` | anime | PASS | 756 | 1 payload: text |
| `animescene` | anime | PASS | 374 | 1 payload: text |
| `blush` | anime | PASS | 483 | 1 payload: video |
| `character` | anime | PASS | 161 | 1 payload: image |
| `cuddle` | anime | PASS | 226 | 1 payload: video |
| `hug` | anime | PASS | 155 | 1 payload: video |
| `kiss` | anime | PASS | 463 | 1 payload: video |
| `manga` | anime | PASS | 454 | 1 payload: text |
| `ongoing` | anime | PASS | 448 | 1 payload: text |
| `pat` | anime | PASS | 156 | 1 payload: video |
| `poke` | anime | PASS | 156 | 1 payload: video |
| `randomanime` | anime | PASS | 541 | 1 payload: image |
| `slap` | anime | PASS | 154 | 1 payload: video |
| `topanime` | anime | PASS | 992 | 1 payload: text |
| `wave` | anime | PASS | 156 | 1 payload: video |
| `audiospeed` | audio | ENV | 2 | host dependency missing (expected here) |
| `audiostatus` | audio | PASS | 0 | 1 payload: text |
| `reverseaudio` | audio | ENV | 0 | host dependency missing (expected here) |
| `toaudio` | audio | ENV | 0 | host dependency missing (expected here) |
| `togif` | audio | ENV | 0 | host dependency missing (expected here) |
| `tomp3` | audio | ENV | 0 | host dependency missing (expected here) |
| `tovoice` | audio | ENV | 1 | host dependency missing (expected here) |
| `trim` | audio | ENV | 0 | host dependency missing (expected here) |
| `volume` | audio | ENV | 0 | host dependency missing (expected here) |
| `waveform` | audio | ENV | 0 | host dependency missing (expected here) |
| `base64dec` | converter | PASS | 0 | 1 payload: text |
| `base64enc` | converter | PASS | 0 | 1 payload: text |
| `bin2dec` | converter | PASS | 0 | 1 payload: text |
| `binary2text` | converter | PASS | 0 | 1 payload: text |
| `celsius` | converter | PASS | 0 | 1 payload: text |
| `cm2inch` | converter | PASS | 0 | 1 payload: text |
| `datasize` | converter | PASS | 0 | 1 payload: text |
| `dec2bin` | converter | PASS | 0 | 1 payload: text |
| `dec2hex` | converter | PASS | 0 | 1 payload: text |
| `dec2oct` | converter | PASS | 0 | 1 payload: text |
| `fahrenheit` | converter | PASS | 0 | 1 payload: text |
| `ft2m` | converter | PASS | 0 | 1 payload: text |
| `g2oz` | converter | PASS | 0 | 1 payload: text |
| `hex2dec` | converter | PASS | 0 | 1 payload: text |
| `hex2text` | converter | PASS | 0 | 1 payload: text |
| `inch2cm` | converter | PASS | 0 | 1 payload: text |
| `kelvin` | converter | PASS | 0 | 1 payload: text |
| `kg2lbs` | converter | PASS | 0 | 1 payload: text |
| `km2miles` | converter | PASS | 0 | 1 payload: text |
| `lbs2kg` | converter | PASS | 0 | 1 payload: text |
| `m2ft` | converter | PASS | 0 | 1 payload: text |
| `miles2km` | converter | PASS | 0 | 1 payload: text |
| `num2roman` | converter | PASS | 1 | 1 payload: text |
| `number2words` | converter | PASS | 0 | 1 payload: text |
| `oz2g` | converter | PASS | 0 | 1 payload: text |
| `roman2num` | converter | PASS | 0 | 1 payload: text |
| `text2binary` | converter | PASS | 0 | 1 payload: text |
| `text2hex` | converter | PASS | 0 | 1 payload: text |
| `ton2kg` | converter | PASS | 0 | 1 payload: text |
| `age` | dev | PASS | 2 | 1 payload: text |
| `bmi` | dev | PASS | 0 | 1 payload: text |
| `color` | dev | PASS | 1 | 1 payload: text |
| `entropy` | dev | PASS | 0 | 1 payload: text |
| `json` | dev | PASS | 1 | 1 payload: text |
| `jwt` | dev | PASS | 0 | 1 payload: text |
| `rand` | dev | PASS | 0 | 1 payload: text |
| `regex` | dev | PASS | 1 | 1 payload: text |
| `timestamp` | dev | PASS | 0 | 1 payload: text |
| `url` | dev | PASS | 1 | 1 payload: text |
| `dl` | download | ENV | 1121 | needs a download strategy / API key |
| `dlstatus` | download | PASS | 5 | 1 payload: text |
| `facebook` | download | ENV | 0 | host dependency missing (expected here) |
| `instagram` | download | ENV | 0 | host dependency missing (expected here) |
| `play` | download | ENV | 3 | host dependency missing (expected here) |
| `reddit` | download | ENV | 0 | host dependency missing (expected here) |
| `tiktok` | download | ENV | 0 | host dependency missing (expected here) |
| `twitter` | download | ENV | 0 | host dependency missing (expected here) |
| `ytinfo` | download | ENV | 904 | host dependency missing (expected here) |
| `yts` | download | ENV | 3 | host dependency missing (expected here) |
| `ytv` | download | ENV | 3 | host dependency missing (expected here) |
| `balance` | economy | PASS | 7 | 1 payload: text |
| `beg` | economy | PASS | 1 | 1 payload: text |
| `daily` | economy | PASS | 1 | 1 payload: text |
| `deposit` | economy | PASS | 0 | 1 payload: text |
| `ecoreset` | economy | PASS | 0 | 1 payload: text |
| `gamble` | economy | PASS | 0 | 1 payload: text |
| `pay` | economy | PASS | 1 | 1 payload: text |
| `rich` | economy | PASS | 1 | 1 payload: text |
| `rob` | economy | PASS | 0 | 1 payload: text |
| `slots` | economy | PASS | 1 | 1 payload: text |
| `withdraw` | economy | PASS | 0 | 1 payload: text |
| `work` | economy | PASS | 0 | 1 payload: text |
| `prayer` | faith | PASS | 1921 | 1 payload: text |
| `qibla` | faith | PASS | 1014 | 1 payload: text |
| `verse` | faith | PASS | 0 | 1 payload: text |
| `answer` | fun | PASS | 3 | 1 payload: text |
| `coinflip` | fun | PASS | 0 | 1 payload: text |
| `compliment` | fun | PASS | 0 | 1 payload: text |
| `fact` | fun | PASS | 0 | 1 payload: text |
| `horoscope` | fun | PASS | 0 | 1 payload: text |
| `insult` | fun | PASS | 0 | 1 payload: text |
| `joke` | fun | PASS | 0 | 1 payload: text |
| `neverhaveiever` | fun | PASS | 1 | 1 payload: text |
| `riddle` | fun | PASS | 0 | 1 payload: text |
| `rps` | fun | PASS | 0 | 1 payload: text |
| `ship` | fun | PASS | 0 | 1 payload: text |
| `wouldyourather` | fun | PASS | 0 | 1 payload: text |
| `8ball` | games | PASS | 3 | 1 payload: text |
| `dare` | games | PASS | 0 | 1 payload: text |
| `dice` | games | PASS | 1 | 1 payload: text |
| `quote` | games | PASS | 0 | 1 payload: text |
| `truth` | games | PASS | 0 | 1 payload: text |
| `alive` | general | PASS | 17 | 1 payload: text |
| `botinfo` | general | PASS | 2 | 1 payload: text |
| `changelog` | general | PASS | 0 | 1 payload: text |
| `date` | general | PASS | 4 | 1 payload: text |
| `donate` | general | PASS | 1 | 1 payload: text |
| `faq` | general | PASS | 0 | 1 payload: text |
| `getsession` | general | PASS | 0 | 1 payload: text |
| `menu` | general | PASS | 2 | 1 payload: text |
| `owner` | general | PASS | 0 | 1 payload: text |
| `ping` | general | PASS | 0 | 2 payloads: text |
| `privacy` | general | PASS | 0 | 1 payload: text |
| `profile` | general | PASS | 1 | 1 payload: text |
| `repo` | general | PASS | 0 | 1 payload: text |
| `report` | general | PASS | 0 | 1 payload: text |
| `rules` | general | PASS | 0 | 1 payload: text |
| `speed` | general | PASS | 0 | 1 payload: text |
| `suggest` | general | PASS | 0 | 1 payload: text |
| `sysinfo` | general | PASS | 1 | 1 payload: text |
| `time` | general | PASS | 1 | 1 payload: text |
| `tos` | general | PASS | 0 | 1 payload: text |
| `uptime` | general | PASS | 0 | 1 payload: text |
| `admins` | group | PASS | 2 | 1 payload: text |
| `antilink` | group | PASS | 0 | 1 payload: text |
| `delmsg` | group | PASS | 0 | 1 payload: delete |
| `demote` | group | PASS | 0 | 1 payload: text |
| `goodbye` | group | PASS | 0 | 1 payload: text |
| `groupinfo` | group | PASS | 0 | 1 payload: text |
| `hidetag` | group | PASS | 0 | 1 payload: text |
| `kick` | group | PASS | 0 | 1 payload: text |
| `link` | group | PASS | 0 | 1 payload: text |
| `mute` | group | PASS | 0 | 1 payload: text |
| `pinmsg` | group | PASS | 0 | 1 payload: text |
| `poll` | group | PASS | 0 | 1 payload: poll |
| `promote` | group | PASS | 0 | 1 payload: text |
| `resetlink` | group | PASS | 1 | 1 payload: text |
| `resetwarn` | group | PASS | 0 | 1 payload: text |
| `setdesc` | group | PASS | 0 | 1 payload: text |
| `setname` | group | PASS | 1 | 1 payload: text |
| `setpp` | group | PASS | 0 | 1 payload: text |
| `tagadmins` | group | PASS | 0 | 1 payload: text |
| `tagall` | group | PASS | 1 | 1 payload: text |
| `unmute` | group | PASS | 0 | 1 payload: text |
| `warn` | group | PASS | 0 | 1 payload: text |
| `warnings` | group | PASS | 0 | 1 payload: text |
| `welcome` | group | PASS | 1 | 1 payload: text |
| `blur` | image | PASS | 0 | 1 payload: text |
| `brighten` | image | PASS | 0 | 1 payload: text |
| `circle` | image | PASS | 0 | 1 payload: text |
| `compress` | image | PASS | 0 | 1 payload: text |
| `contrast` | image | PASS | 0 | 1 payload: text |
| `darken` | image | PASS | 0 | 1 payload: text |
| `deepfry` | image | PASS | 0 | 1 payload: text |
| `desaturate` | image | PASS | 0 | 1 payload: text |
| `edges` | image | PASS | 0 | 1 payload: text |
| `emboss` | image | PASS | 0 | 1 payload: text |
| `glitch` | image | PASS | 0 | 1 payload: text |
| `grayscale` | image | PASS | 0 | 1 payload: text |
| `invert` | image | PASS | 1 | 1 payload: text |
| `mirror` | image | PASS | 0 | 1 payload: text |
| `oldfilm` | image | PASS | 0 | 1 payload: text |
| `pixelate` | image | PASS | 0 | 1 payload: text |
| `resize` | image | PASS | 7 | 1 payload: image |
| `rotate180` | image | PASS | 0 | 1 payload: text |
| `rotate270` | image | PASS | 0 | 1 payload: text |
| `rotate90` | image | PASS | 0 | 1 payload: text |
| `saturate` | image | PASS | 0 | 1 payload: text |
| `sepia` | image | PASS | 0 | 1 payload: text |
| `sharpen` | image | PASS | 0 | 1 payload: text |
| `vflip` | image | PASS | 1 | 1 payload: text |
| `vignette` | image | PASS | 0 | 1 payload: text |
| `save` | media | PASS | 0 | 1 payload: document |
| `saveaudio` | media | PASS | 0 | 1 payload: document |
| `savedoc` | media | PASS | 0 | 1 payload: document |
| `saveimg` | media | PASS | 0 | 1 payload: document |
| `savevideo` | media | PASS | 0 | 1 payload: document |
| `stickerinfo` | media | PASS | 2 | 1 payload: text |
| `take` | media | PASS | 2 | 1 payload: sticker |
| `note` | misc | PASS | 0 | 1 payload: text |
| `remind` | misc | PASS | 0 | 1 payload: text |
| `short` | misc | PASS | 79 | 1 payload: text |
| `translate` | misc | PASS | 1125 | 1 payload: text |
| `autoread` | owner | PASS | 0 | 1 payload: text |
| `autotyping` | owner | PASS | 0 | 1 payload: text |
| `blacklist` | owner | PASS | 0 | 1 payload: text |
| `blocked` | owner | PASS | 0 | 1 payload: text |
| `botname` | owner | PASS | 0 | 1 payload: text |
| `broadcast` | owner | PASS | 0 | 1 payload: text |
| `cleartmp` | owner | PASS | 0 | 1 payload: text |
| `join` | owner | PASS | 0 | 1 payload: text |
| `leave` | owner | PASS | 0 | 1 payload: text |
| `maintenance` | owner | PASS | 0 | 1 payload: text |
| `mode` | owner | PASS | 0 | 1 payload: text |
| `prefix` | owner | PASS | 0 | 1 payload: text |
| `reload` | owner | PASS | 0 | 1 payload: text |
| `setbotpic` | owner | PASS | 0 | 1 payload: text |
| `sudo` | owner | PASS | 0 | 1 payload: text |
| `unblacklist` | owner | PASS | 0 | 1 payload: text |
| `unsudo` | owner | PASS | 0 | 1 payload: text |
| `angry` | reactions | PASS | 17 | 1 payload: text +1 react |
| `clap` | reactions | PASS | 0 | 1 payload: text +1 react |
| `eyes` | reactions | PASS | 0 | 1 payload: text +1 react |
| `fire` | reactions | PASS | 0 | 1 payload: text +1 react |
| `hundred` | reactions | PASS | 0 | 1 payload: text +1 react |
| `laugh` | reactions | PASS | 0 | 1 payload: text +1 react |
| `love` | reactions | PASS | 0 | 1 payload: text +1 react |
| `nope` | reactions | PASS | 0 | 1 payload: text +1 react |
| `ok` | reactions | PASS | 0 | 1 payload: text +1 react |
| `party` | reactions | PASS | 0 | 1 payload: text +1 react |
| `pray` | reactions | PASS | 0 | 1 payload: text +1 react |
| `react` | reactions | PASS | 0 | 1 payload: text |
| `sad` | reactions | PASS | 0 | 1 payload: text +1 react |
| `salute` | reactions | PASS | 0 | 1 payload: text +1 react |
| `skull` | reactions | PASS | 0 | 1 payload: text +1 react |
| `think` | reactions | PASS | 0 | 1 payload: text +1 react |
| `unreact` | reactions | PASS | 0 |  |
| `wow` | reactions | PASS | 0 | 1 payload: text +1 react |
| `book` | search | PASS | 591 | 1 payload: text |
| `crypto` | search | PASS | 151 | 1 payload: text |
| `currency` | search | PASS | 59 | 1 payload: text |
| `define` | search | PASS | 171 | 1 payload: text |
| `github` | search | PASS | 332 | 1 payload: text |
| `ip` | search | PASS | 70 | 1 payload: text |
| `lyrics` | search | PASS | 601 | 1 payload: text |
| `news` | search | PASS | 539 | 1 payload: text |
| `npm` | search | PASS | 95 | 1 payload: text |
| `tv` | search | PASS | 666 | 1 payload: text |
| `wiki` | search | PASS | 69 | 1 payload: text |
| `afk` | social | PASS | 1 | 1 payload: text |
| `back` | social | PASS | 0 | 1 payload: text |
| `birthday` | social | PASS | 0 | 1 payload: text |
| `atbash` | text | PASS | 0 | 1 payload: text |
| `base64` | text | PASS | 0 | 1 payload: text |
| `bigtext` | text | PASS | 0 | 1 payload: text |
| `caesar` | text | PASS | 0 | 1 payload: text |
| `calc` | text | PASS | 0 | 1 payload: text |
| `fancy` | text | PASS | 1 | 1 payload: text |
| `hash` | text | PASS | 0 | 1 payload: text |
| `lorem` | text | PASS | 0 | 1 payload: text |
| `md5` | text | PASS | 0 | 1 payload: text |
| `mock` | text | PASS | 0 | 1 payload: text |
| `morse` | text | PASS | 0 | 1 payload: text |
| `password` | text | PASS | 0 | 1 payload: text |
| `random-string` | text | PASS | 0 | 1 payload: text |
| `readmore` | text | PASS | 0 | 1 payload: text |
| `reverse` | text | PASS | 0 | 1 payload: text |
| `rot13` | text | PASS | 0 | 1 payload: text |
| `sha1` | text | PASS | 0 | 1 payload: text |
| `sha256` | text | PASS | 0 | 1 payload: text |
| `sha512` | text | PASS | 0 | 1 payload: text |
| `spoiler` | text | PASS | 0 | 1 payload: text |
| `unmorse` | text | PASS | 0 | 1 payload: text |
| `uuid` | text | PASS | 0 | 1 payload: text |
| `vaporwave` | text | PASS | 0 | 1 payload: text |
| `bolditalic` | textmaker | PASS | 0 | 1 payload: text |
| `circled` | textmaker | PASS | 0 | 1 payload: text |
| `cursive` | textmaker | PASS | 0 | 1 payload: text |
| `double` | textmaker | PASS | 0 | 1 payload: text |
| `gothic` | textmaker | PASS | 0 | 1 payload: text |
| `leet` | textmaker | PASS | 0 | 1 payload: text |
| `mirrortext` | textmaker | PASS | 0 | 1 payload: text |
| `monospace` | textmaker | PASS | 0 | 1 payload: text |
| `negcircled` | textmaker | PASS | 0 | 1 payload: text |
| `regional` | textmaker | PASS | 0 | 1 payload: text |
| `sansbold` | textmaker | PASS | 0 | 1 payload: text |
| `sansitalic` | textmaker | PASS | 0 | 1 payload: text |
| `sarcasm` | textmaker | PASS | 0 | 1 payload: text |
| `spaced` | textmaker | PASS | 0 | 1 payload: text |
| `squared` | textmaker | PASS | 0 | 1 payload: text |
| `strike` | textmaker | PASS | 0 | 1 payload: text |
| `subscript` | textmaker | PASS | 0 | 1 payload: text |
| `superscript` | textmaker | PASS | 0 | 1 payload: text |
| `textmaker` | textmaker | PASS | 0 | 1 payload: text |
| `underline` | textmaker | PASS | 0 | 1 payload: text |
| `unstyle` | textmaker | PASS | 0 | 1 payload: text |
| `upside` | textmaker | PASS | 0 | 1 payload: text |
| `zalgo` | textmaker | PASS | 0 | 1 payload: text |
| `getpp` | tools | PASS | 0 | 1 payload: image |
| `qr` | tools | PASS | 81 | 1 payload: image |
| `sticker` | tools | PASS | 30 | 1 payload: sticker |
| `toimg` | tools | PASS | 32 | 1 payload: image |
| `vcard` | tools | PASS | 0 | 1 payload: contacts |
| `vv` | tools | PASS | 0 | 1 payload: image |
| `weather` | tools | PASS | 239 | 1 payload: text |
| `whoami` | tools | PASS | 0 | 1 payload: text |
