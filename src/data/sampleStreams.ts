import { StreamSource } from "../types/clip";

export const SAMPLE_STREAMS: StreamSource[] = [
  {
    id: "twitch-arena-finals",
    platform: "twitch",
    title: "Apex Masters Qualifier — 1v3 Overtime Clutch on Foundry",
    channelName: "KairoFPS",
    url: "https://www.twitch.tv/videos/2319481042",
    thumbnailUrl: "/src/assets/images/stream_esports_arena_1795316681920.jpg",
    durationSec: 210,
    sourceKind: "demo",
    transcript: `[00:08] Alright chat, map three, tied 11-11. Economy is scuffed, we are on a force buy.
[00:26] Pushing B catwalk silently—wait, footsteps right under rafters! Two of them rotated early.
[00:41] Flash out! Downed the entry fragger—no way, smoke popped right in front of me, one HP left!
[00:54] Reloading behind pillar... 12 seconds on the spike. I hear the defuse tap!
[01:02] Faked the swing, double headshot through the smoke! ONE MORE! Last player is elbow!
[01:12] CLUTCHED IT! 1V3 WITH ZERO POINT FOUR SECONDS ON THE CLOCK! Chat is completely unreadable right now!
[01:38] Let's replay that micro-flick in slow motion. Watch the radar ping on the left wall before I peeked.
[01:58] Coach just dropped a timeout call because nobody expected that angle from upper catwalk.
[02:34] Round 24 reset—stay locked in, one round away from LAN qualification.`,
    audioPeaks: [
      { timeSec: 0, level: 24 },
      { timeSec: 10, level: 30 },
      { timeSec: 20, level: 38 },
      { timeSec: 30, level: 54 },
      { timeSec: 40, level: 76 },
      { timeSec: 50, level: 68 },
      { timeSec: 60, level: 92 },
      { timeSec: 70, level: 98 },
      { timeSec: 80, level: 85 },
      { timeSec: 90, level: 48 },
      { timeSec: 100, level: 55 },
      { timeSec: 110, level: 42 },
      { timeSec: 120, level: 59 },
      { timeSec: 130, level: 44 },
      { timeSec: 140, level: 36 },
      { timeSec: 150, level: 64 },
      { timeSec: 160, level: 79 },
      { timeSec: 170, level: 51 },
      { timeSec: 180, level: 34 },
      { timeSec: 195, level: 45 },
    ],
    chatVelocity: [
      { timeSec: 42, messagesPerMin: 185, keyword: "ONE HP" },
      { timeSec: 71, messagesPerMin: 640, keyword: "INSANE CLUTCH" },
      { timeSec: 158, messagesPerMin: 230, keyword: "WALLBANG?" },
    ],
    highlights: [
      {
        id: "hl-arena-1",
        title: "0.4s Overtime 1v3 Smoke Clutch",
        startSec: 40,
        endSec: 78,
        category: "Clutch Play",
        score: 96,
        hookLine: "1 HP, 12 seconds left, and the entire squad down.",
        reason: "Simultaneous peak audio (98%) and massive Twitch chat spike (640 msg/min) during the smoke double-elimination.",
        captions: [
          { startOffsetSec: 0, endOffsetSec: 6, text: "Smoke popped right in front of me—1 HP left!" },
          { startOffsetSec: 12, endOffsetSec: 19, text: "12 seconds on the spike. I hear the defuse tap." },
          { startOffsetSec: 21, endOffsetSec: 28, text: "Double headshot through the smoke—one more!" },
          { startOffsetSec: 29, endOffsetSec: 36, text: "0.4 seconds left on the clock!" },
        ],
      },
      {
        id: "hl-arena-2",
        title: "Breakdown: The Radar Ping Pre-Aim",
        startSec: 94,
        endSec: 126,
        category: "Commentary Peak",
        score: 84,
        hookLine: "Why that blind wall-peek wasn't luck.",
        reason: "High educational replay value explaining the audio/radar cue immediately after the round win.",
        captions: [
          { startOffsetSec: 0, endOffsetSec: 7, text: "Watch the radar ping on the left wall before I peeked." },
          { startOffsetSec: 14, endOffsetSec: 23, text: "Coach called timeout because nobody expected upper catwalk." },
        ],
      },
    ],
  },
  {
    id: "yt-podcast-live",
    platform: "youtube",
    title: "Late Night Creator Roundtable — Why 90% of Shorts Die at Second 3",
    channelName: "Mina Lin Studio",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnailUrl: "/src/assets/images/stream_creator_desk_1795316681822.jpg",
    durationSec: 240,
    sourceKind: "demo",
    transcript: `[00:12] Welcome back to the live breakdown. Tonight we audited 140 creator channels that switched from Twitch VODs to vertical Shorts.
[00:36] Everyone blames the algorithm, right? Look at the retention graph on screen—half the viewers leave before you finish saying 'Hey guys'.
[01:02] Cut the throat-clearing. Start inside the tension! If your clip begins with 'So yesterday I was playing...', you already lost 40% of your swipe-away rate.
[01:29] Wait—someone in Super Chat just asked: 'What if the funny moment takes 45 seconds of setup?'
[01:44] Put the punchline reaction in the first 1.5 seconds as a cold open, then rewind! Retention jumps from 38% to 74% overnight.
[02:15] Let's pull up the live audio waveform from last week's stream to show how dead air kills pacing.`,
    audioPeaks: [
      { timeSec: 0, level: 32 },
      { timeSec: 15, level: 44 },
      { timeSec: 30, level: 58 },
      { timeSec: 45, level: 71 },
      { timeSec: 62, level: 89 },
      { timeSec: 75, level: 82 },
      { timeSec: 90, level: 60 },
      { timeSec: 105, level: 91 },
      { timeSec: 120, level: 74 },
      { timeSec: 135, level: 55 },
      { timeSec: 155, level: 66 },
      { timeSec: 180, level: 49 },
      { timeSec: 210, level: 40 },
    ],
    chatVelocity: [
      { timeSec: 63, messagesPerMin: 290, keyword: "GUILTY" },
      { timeSec: 106, messagesPerMin: 410, keyword: "COLD OPEN" },
    ],
    highlights: [
      {
        id: "hl-pod-1",
        title: "Stop Starting Clips With 'Hey Guys'",
        startSec: 35,
        endSec: 76,
        category: "Commentary Peak",
        score: 92,
        hookLine: "Why 40% of viewers swipe away in 2 seconds.",
        reason: "Crisp contrarian takeaway with high vocal emphasis and live Super Chat validation.",
        captions: [
          { startOffsetSec: 0, endOffsetSec: 9, text: "Half the viewers leave before you finish saying 'Hey guys'." },
          { startOffsetSec: 18, endOffsetSec: 29, text: "Start inside the tension—cut the throat-clearing." },
          { startOffsetSec: 30, endOffsetSec: 40, text: "Never start a short with 'So yesterday I was playing...'" },
        ],
      },
      {
        id: "hl-pod-2",
        title: "The 1.5s Cold-Open Rewind Trick",
        startSec: 88,
        endSec: 124,
        category: "Chat Spike",
        score: 88,
        hookLine: "How to make a 45-second setup go viral.",
        reason: "Direct Super Chat Q&A with concrete retention jump numbers (38% to 74%).",
        captions: [
          { startOffsetSec: 0, endOffsetSec: 10, text: "What if the funny moment needs 45 seconds of setup?" },
          { startOffsetSec: 14, endOffsetSec: 24, text: "Put the reaction in the first 1.5 seconds, then rewind." },
          { startOffsetSec: 25, endOffsetSec: 34, text: "Retention jumps from 38% to 74% overnight." },
        ],
      },
    ],
  },
  {
    id: "twitch-boss-speedrun",
    platform: "twitch",
    title: "No-Hit Cathedral Boss Attempt #47 — Phase 3 Parry Miracle",
    channelName: "VaelRun",
    url: "https://www.twitch.tv/videos/2318029911",
    thumbnailUrl: "/src/assets/images/stream_speedrun_boss_1795316681241.jpg",
    durationSec: 195,
    sourceKind: "demo",
    transcript: `[00:10] Attempt 47. No armor, no healing flasks, level 1 broadsword. Phase 2 transition coming up right now.
[00:34] Watch the flame arc—dodge left, punish twice, backstep! Clean!
[00:58] Oh no, he queued the five-hit cathedral slam early! My stamina bar is completely empty!
[01:12] PARRY! PARRY! THIRD PARRY! FOURTH! NO WAY I SURVIVED THE STAMINA LOCK!
[01:28] ONE MORE HIT! DON'T GREED! Wait for the recovery frame... DONE! ZERO DAMAGE TAKEN!
[01:48] Three hours on this boss without getting touched once. Hands are actually shaking.`,
    audioPeaks: [
      { timeSec: 0, level: 28 },
      { timeSec: 18, level: 42 },
      { timeSec: 36, level: 63 },
      { timeSec: 58, level: 88 },
      { timeSec: 72, level: 99 },
      { timeSec: 88, level: 96 },
      { timeSec: 105, level: 74 },
      { timeSec: 125, level: 48 },
      { timeSec: 150, level: 35 },
    ],
    chatVelocity: [
      { timeSec: 73, messagesPerMin: 780, keyword: "PARRY GOD" },
      { timeSec: 90, messagesPerMin: 910, keyword: "NO HIT GG" },
    ],
    highlights: [
      {
        id: "hl-boss-1",
        title: "Zero-Stamina 4-Hit Cathedral Parry",
        startSec: 56,
        endSec: 96,
        category: "Reaction",
        score: 98,
        hookLine: "Empty stamina bar against a 5-hit boss combo.",
        reason: "Highest audio peak (99%) and chat spike (910 msg/min) across the entire run.",
        captions: [
          { startOffsetSec: 0, endOffsetSec: 10, text: "He queued the 5-hit slam—my stamina bar is empty!" },
          { startOffsetSec: 15, endOffsetSec: 24, text: "Four frame-perfect parries in a row!" },
          { startOffsetSec: 28, endOffsetSec: 38, text: "Zero damage taken after 3 hours of attempts!" },
        ],
      },
    ],
  },
];
