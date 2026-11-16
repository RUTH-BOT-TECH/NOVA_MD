# Command gap vs RUTHLESS-BOT

Their inventory (statically extracted): **240** commands · this bot: **299** · missing here: **172**

## owner (27)

| command | aliases | what it does |
|---|---|---|
| `apicheck` | — | Quickly probe selected external text, image, audio and downloader APIs. |
| `backupnow` | backup | Back up local bot settings to your pairing service. |
| `banchat` | — | Disable bot commands in this group for non-owners. |
| `banlist` | — | List bot-access bans privately. |
| `banuser` | — | Stop a phone number from using bot commands and autodownload. |
| `blocklist` | — | Show WhatsApp blocked accounts privately. |
| `broadcastopt` | — | Opt this chat into or out of broadcasts. |
| `clearchat-all` | — | Request WhatsApp clear on chats observed in this bot process. |
| `clearsession` | — | Delete the remote pairing record, including its session and backup. |
| `clone` | cloneprofile | Temporarily copy a visible WhatsApp profile for 24 hours. |
| `delbotpp` | — | Remove the linked account profile picture. |
| `deletedata` | — | Delete your pairing-service data. |
| `dlcheck` | downloadercheck, ytcheck | Check local downloader availability without installing or contacting APIs. |
| `list` | — | List ${labels[role]}s privately. |
| `mydata` | — | Show what the pairing service stores. |
| `ownermenu` | — | List owner-only commands and controls. |
| `reboot` | — | — |
| `restore` | — | Replace local settings with your stored backup. |
| `restoreprofile` | unclone | Restore the profile saved before cloning. |
| `selftest` | — | Safely exercise commands with synthetic inputs in an isolated environment. |
| `setbotbio` | setbotstatus | Change the linked WhatsApp account About text. |
| `setbotname` | — | Change the linked WhatsApp account profile name. |
| `setbotpp` | — | Set the linked account profile picture from an image. |
| `shutdown` | — | — |
| `unbanchat` | — | Restore bot commands in this group. |
| `unbanuser` | — | Restore a phone number’s bot access. |
| `update` | upgrade-bot | Check GitHub for changes, or request a Render deploy explicitly. |

## misc (18)

| command | aliases | what it does |
|---|---|---|
| `alarm` | — | Set an alarm at a UTC date and time. |
| `antiviewonce` | — | Per-chat opt-in: copy new view-once media privately to the owner; use only with sender permission. |
| `bookmark` | — | Save one HTTP(S) link to your personal bot bookmarks. |
| `bookmarks` | — | List your saved bookmarks. |
| `copy` | — | Copy typed text or a quoted text message into your personal bot clipboard. |
| `delreminder` | — | Delete one of your scheduled reminders. |
| `donetodo` | — | Mark one of your todo items complete. |
| `paste` | clipboard | Show your personal bot clipboard. |
| `quote-msg` | — | Repeat a replied text as a visible text quotation. |
| `reminders` | — | List your scheduled reminders. |
| `savedmsgs` | — | List your saved message text. |
| `savemsg` | — | Save text from a quoted non-view-once message. |
| `star` | — | Save a quoted message in the bot’s own star list; not WhatsApp’s native stars. |
| `starred` | — | List your bot-starred message text. |
| `stopwatch` | — | Start, stop or reset a personal stopwatch. |
| `timer` | — | Set a relative timer using the persistent reminder queue. |
| `translate-reply` | — | Translate replied text with RUTHLESS AI; the text is sent to LLM7. |
| `tts-reply` | — | Read replied text aloud; the quoted text is sent to Google Translate speech. |

## group (18)

| command | aliases | what it does |
|---|---|---|
| `allowcountry` | — | Manage allowed international phone prefixes for antifake. |
| `botprefix` | — | Manage bot message-ID prefixes for antibot detection. |
| `delpp` | — | Delete the group picture. |
| `endvote` | — | End the active bot-run vote. |
| `eventimg` | — | Enable or disable menu, welcome and goodbye images for this group. |
| `eventrsvp` | — | Create a group event and let members RSVP. |
| `gpostall` | gstatusall | Privately prepare an experimental group status for opted-in groups; confirmation required. |
| `groupdigest` | — | Summarize text deliberately contributed by group members using LLM7. |
| `grouplink` | — | Get the group invite link. |
| `groupstatus` | gstatus, gpost, grouppost | Experimentally post text, a photo or a short video as a status for this group. |
| `gstatusopt` | gpostopt | A group admin can opt this group in or out of owner multi-group status posts. |
| `listwarn` | — | List group warnings. |
| `revoke` | resetlink | Reset the group invite link. |
| `slowmode` | — | Set bot-side slowmode in seconds or off. |
| `stickercollect` | — | Opt in this group to collection of newly posted stickers. |
| `tag` | — | Mention a replied user or typed numbers. |
| `taskboard` | — | A shared group task list; creators can finish or remove their items. |
| `vote` | — | Start or vote in a bot-run vote. |

## search (16)

| command | aliases | what it does |
|---|---|---|
| `aqi` | pollution | Show modeled current air-quality estimates from Open-Meteo. |
| `breaking` | — | Show recent top headlines; not an emergency alert service. |
| `distance` | — | Calculate straight-line distance between two coordinates. |
| `earthquake` | — | Show recent worldwide earthquakes from the USGS feed. |
| `flights` | — | Create a Google Flights link; results, availability and prices are not fetched. |
| `google` | — | Create a Google Search link; results are opened in your browser, not fetched by the bot. |
| `headlines` | — | Show recent Google News RSS headlines for NG, US or GB. |
| `moonphase` | moon | Estimate the lunar phase for a UTC date. |
| `nearby` | — | Create a Google Maps search link for a place type and city; does not calculate proximity. |
| `phonetic` | — | Show available English phonetic transcriptions from Free Dictionary API. |
| `pronounce` | — | Speak an English word; the word is sent to unofficial Google Translate text-to-speech. |
| `route` | — | Create a Google Maps directions link; route results are not fetched. |
| `thesaurus` | — | Find synonyms and antonyms using Datamuse. |
| `urban` | urbandict, slang | Look up community-submitted slang on Urban Dictionary; entries may be offensive. |
| `uv` | — | Show the modeled current UV index from Open-Meteo. |
| `weather5` | — | Show a five-day weather forecast from Open-Meteo. |

## games (16)

| command | aliases | what it does |
|---|---|---|
| `blackjack` | — | Play free blackjack against a dealer who stands on 17. |
| `chess` | — | Two-player chess using chess.js rules, legal moves and draw detection. |
| `connect4` | — | Two-player Connect 4 with real turn and win validation. |
| `lottery` | — | Draw six unique numbers; for fun, not real betting. |
| `lovecalc` | ship | Make a fictional compatibility score or ship name. |
| `palm` | — | Generate a fictional palm-reading-style prompt for entertainment. |
| `roll20` | — | Roll a 20-sided die. |
| `roulette` | — | Play free European roulette by choosing red, black or 0–36. |
| `speedtype` | — | Measure how fast you retype a short phrase. |
| `tarot` | — | Draw a random fictional tarot card for entertainment. |
| `tictactoe` | ttt | Two-player tic-tac-toe in a group. |
| `trivia` | quiz | Play one multiple-choice Open Trivia Database question. |
| `typerace` | — | Run a timed group typing race with a leaderboard. |
| `wheel` | spin | Randomly pick from a list of choices. |
| `wordle` | — | Play a five-letter Wordle-style game with six guesses. |
| `zodiac` | — | Find a Western zodiac sign from a month and day. |

## downloaders (12)

| command | aliases | what it does |
|---|---|---|
| `apk` | apkdl | Search F-Droid or look up an Android package (F-Droid only). |
| `applemusic` | — | Find a matching track using Apple Music, iTunes and YouTube. |
| `capcut` | — | Download the preview video of a public CapCut template. |
| `deezer` | — | Find a matching track using Deezer metadata, iTunes and YouTube. |
| `gitclone` | — | Download a public GitHub repository as a ZIP (max 50 MB). Source: GitHub. |
| `happymod` | — | Search happymod.cloud and return third-party app listing links. |
| `igstory` | — | Download available public Instagram stories by username via third-party StoryLurk. |
| `imdbdl` | — | Find IMDb title information and a possible YouTube trailer link (no full movie). |
| `spotify` | spotifydl | Find a matching track using Spotify metadata, iTunes and YouTube. |
| `spotifysearch` | — | Search the iTunes music catalog for songs. |
| `tidal` | — | Find a matching track using TIDAL metadata, iTunes and YouTube. |
| `tiktokslide` | — | Download the images from a public TikTok photo post (maximum 20 slides and 50 MB total). |

## economy (12)

| command | aliases | what it does |
|---|---|---|
| `apply` | — | Choose a virtual job. |
| `buy` | — | Buy virtual shop items. |
| `farm` | crops | Show your virtual corn crop and its growth timer. |
| `harvest` | — | Harvest grown virtual corn. |
| `inventory` | — | Show your virtual items. |
| `job` | — | Show your virtual job. |
| `jobs` | — | List virtual jobs and their work bonus. |
| `plant` | — | Plant virtual seeds to grow corn in five minutes. |
| `rank` | level | Show your level and XP from economy activities. |
| `resign` | quit | Leave your virtual job. |
| `sell` | — | Sell gathered fish or ore for virtual coins. |
| `shop` | — | Show the virtual-item shop. |

## ai (11)

| command | aliases | what it does |
|---|---|---|
| `aiavatar` | — | Create a stylized avatar; the image and prompt are sent to AI Horde volunteers. |
| `aiinfo` | — | Learn about RUTHLESS AI and its text provider. |
| `askpdf` | — | Ask RUTHLESS AI about text from a PDF. Extracted text is sent to LLM7. |
| `clearchat` | — | Clear your recent AI chat history in this chat. |
| `imagine` | dalle, image-gen, txt2img, aiart | Generate one image with the volunteer AI Horde, using Stable Diffusion (not DALL-E). |
| `img2img` | — | Transform an image; the image and prompt are sent to AI Horde volunteers. |
| `ocr` | readtext, scan | Read English text from an image locally with Tesseract OCR. |
| `stt` | speech2text, transcribe | Transcribe short English voice notes locally with Whisper Tiny English. |
| `studyquiz` | — | Create a personal three-question AI quiz from supplied notes sent to LLM7. |
| `tts` | aivoice, text2speech | Speak text as an Opus voice note; the text is sent to the unofficial Google Translate speech endpoint. |
| `vision` | describe, caption, identify, whatisthis | Describe an image or answer a question about it via BlockRun vision. |

## tools (10)

| command | aliases | what it does |
|---|---|---|
| `barcode` | barcodegen | Generate a local Code 128 barcode. |
| `bcrypt` | — | Hash or verify a sample password locally in a private chat. |
| `cipher` | — | Encrypt or decrypt local text with AES-GCM in a private chat. |
| `decrypt` | — | Decrypt a token created by this bot in a private chat. |
| `dns` | dnslookup | Look up public DNS records using Google Public DNS. |
| `encrypt` | — | Encrypt text locally with a passphrase in a private chat. |
| `ffinfo` | freefireinfo | Look up Free Fire profile, career stats and equipment through an unofficial external service. |
| `fflike` | freefirelike | Like requests are disabled until a verified provider is configured; fail-closed notice only. |
| `screenshot` | ss | Capture a public website using Thum.io; the URL is sent to that provider. |
| `vigenere` | — | Apply a Vigenère cipher for education; not secure encryption. |

## media (10)

| command | aliases | what it does |
|---|---|---|
| `emoji` | — | Show a large Twemoji image. |
| `emojimix` | — | Mix two supported emoji with Google Emoji Kitchen. |
| `meme` | memegen, smeme, mememaker | Add top and bottom meme captions. |
| `removebg` | remove-bg | Remove the background locally with IMG.LY. |
| `rotate` | — | Rotate an image by degrees. |
| `tomp4` | — | Convert replied video to MP4. |
| `tourl` | upload, tourl2, imgtourl | Upload replied media to Uguu for a temporary public link. |
| `tovideo` | togif | Convert an animated sticker to MP4. |
| `tovn` | — | Convert audio to a WhatsApp voice note. |
| `watermark` | — | Add text to the lower corner. |

## extras (7)

| command | aliases | what it does |
|---|---|---|
| `anticall` | — | Reject incoming calls; optionally block verified non-owner callers. |
| `chatbot` | — | Toggle automatic AI chat per group or globally for DMs. |
| `commandreact` | — | Turn command acknowledgement reactions on or off. |
| `inactive` | listinactive | List members with no observed messages for N days; never removes them. |
| `savestatus` | — | Save a replied status to your own private chat. |
| `setprefix` | — | Set the stored bot command prefix. |
| `tickle` | — | Send a tickle reaction GIF from OtakuGIFs. |

## social (7)

| command | aliases | what it does |
|---|---|---|
| `getbio` | — | Read a WhatsApp About status only when visible to the bot. |
| `ghstalk` | — | Look up a public GitHub profile using the GitHub API. |
| `mcserver` | — | Check public Minecraft Java server status with mcsrvstat.us. |
| `mcskin` | — | Show a Minecraft Java skin using Mojang and Crafatar. |
| `mcuser` | minecraft | Look up a Minecraft Java username and UUID via Mojang. |
| `npmstalk` | — | Find public npm packages maintained by a username. |
| `stalk` | — | Create an Instagram or TikTok profile link; no data is fetched. |

## general (3)

| command | aliases | what it does |
|---|---|---|
| `calendar` | — | Show the current month. |
| `language` | setlang | Save your default language for future translation commands. |
| `support` | — | — |

## anime (2)

| command | aliases | what it does |
|---|---|---|
| `anilist` | — | Search AniList anime or manga. |
| `animevoice` | — | — |

## converters (2)

| command | aliases | what it does |
|---|---|---|
| `dogecoin` | — | — |
| `ethereum` | — | — |

## audio (1)

| command | aliases | what it does |
|---|---|---|
| `trim-audio` | trim, cut-audio | Trim an audio or video soundtrack to a segment, locally. |
