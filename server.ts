import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Add your key in Settings > Secrets to run automatic highlight detection."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

interface ParsedStreamUrl {
  platform: "youtube" | "twitch";
  externalId: string;
  normalizedUrl: string;
  embedUrl: string;
  kind: "video" | "clip" | "live";
}

function parseSupportedStreamUrl(rawUrl: string): ParsedStreamUrl | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = parsed.pathname.split("/").filter(Boolean)[0];
    if (!id || !/^[a-zA-Z0-9_-]{6,20}$/.test(id)) return null;
    return {
      platform: "youtube",
      externalId: id,
      normalizedUrl: `https://www.youtube.com/watch?v=${id}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1&rel=0`,
      kind: "video",
    };
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    let id = parsed.searchParams.get("v");
    if (!id && (pathParts[0] === "live" || pathParts[0] === "shorts" || pathParts[0] === "embed")) {
      id = pathParts[1] ?? null;
    }
    if (!id || !/^[a-zA-Z0-9_-]{6,20}$/.test(id)) return null;
    return {
      platform: "youtube",
      externalId: id,
      normalizedUrl: `https://www.youtube.com/watch?v=${id}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1&rel=0`,
      kind: pathParts[0] === "live" ? "live" : "video",
    };
  }

  if (host === "clips.twitch.tv") {
    const slug = parsed.pathname.split("/").filter(Boolean)[0];
    if (!slug || !/^[a-zA-Z0-9_-]{4,80}$/.test(slug)) return null;
    return {
      platform: "twitch",
      externalId: slug,
      normalizedUrl: `https://clips.twitch.tv/${slug}`,
      embedUrl: `https://clips.twitch.tv/embed?clip=${encodeURIComponent(slug)}`,
      kind: "clip",
    };
  }

  if (host === "twitch.tv") {
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts[0] === "videos" && pathParts[1] && /^\d{4,20}$/.test(pathParts[1])) {
      const vodId = pathParts[1];
      return {
        platform: "twitch",
        externalId: vodId,
        normalizedUrl: `https://www.twitch.tv/videos/${vodId}`,
        embedUrl: `https://player.twitch.tv/?video=v${encodeURIComponent(vodId)}`,
        kind: "video",
      };
    }
    if (pathParts[1] === "clip" && pathParts[2] && /^[a-zA-Z0-9_-]{4,80}$/.test(pathParts[2])) {
      const slug = pathParts[2];
      return {
        platform: "twitch",
        externalId: slug,
        normalizedUrl: `https://clips.twitch.tv/${slug}`,
        embedUrl: `https://clips.twitch.tv/embed?clip=${encodeURIComponent(slug)}`,
        kind: "clip",
      };
    }
    if (pathParts[0] && /^[a-zA-Z0-9_]{2,30}$/.test(pathParts[0])) {
      const channel = pathParts[0];
      return {
        platform: "twitch",
        externalId: channel,
        normalizedUrl: `https://www.twitch.tv/${channel}`,
        embedUrl: `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}`,
        kind: "live",
      };
    }
  }

  return null;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractMetaContent(html: string, propertyName: string): string | null {
  const escaped = propertyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }
  return null;
}

async function fetchWithTimeout(url: string, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ClipDeck/1.0)",
        Accept: "application/json, text/html",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/stream/inspect", async (req, res) => {
    try {
      const rawUrl = typeof req.body?.url === "string" ? req.body.url.trim() : "";
      if (!rawUrl) {
        res.status(400).json({ error: "Please provide a Twitch or YouTube stream URL." });
        return;
      }

      const parsed = parseSupportedStreamUrl(rawUrl);
      if (!parsed) {
        res.status(400).json({
          error:
            "Unsupported URL. Paste a valid YouTube video/live link or a Twitch channel, VOD (/videos/...), or clip link.",
        });
        return;
      }

      let title =
        parsed.platform === "youtube"
          ? `YouTube Stream (${parsed.externalId})`
          : `Twitch Broadcast (${parsed.externalId})`;
      let channelName = parsed.platform === "youtube" ? "YouTube Creator" : parsed.externalId;
      let thumbnailUrl =
        parsed.platform === "youtube"
          ? `https://i.ytimg.com/vi/${parsed.externalId}/hqdefault.jpg`
          : "";
      let durationSec = parsed.kind === "clip" ? 45 : 1800;

      if (parsed.platform === "youtube") {
        try {
          const oembedRes = await fetchWithTimeout(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(parsed.normalizedUrl)}&format=json`
          );
          if (oembedRes.ok) {
            const oembed = (await oembedRes.json()) as {
              title?: string;
              author_name?: string;
              thumbnail_url?: string;
            };
            if (oembed.title) title = oembed.title;
            if (oembed.author_name) channelName = oembed.author_name;
            if (oembed.thumbnail_url) thumbnailUrl = oembed.thumbnail_url;
          }
        } catch {
          // Continue with watch page check or baseline metadata
        }

        try {
          const pageRes = await fetchWithTimeout(parsed.normalizedUrl, 5000);
          if (pageRes.ok) {
            const html = await pageRes.text();
            const lenMatch = html.match(/"lengthSeconds":"(\d+)"/);
            if (lenMatch?.[1]) {
              const sec = Number(lenMatch[1]);
              if (Number.isFinite(sec) && sec > 10) {
                durationSec = sec;
              }
            }
          }
        } catch {
          // Default duration remains intact
        }
      } else {
        try {
          const pageRes = await fetchWithTimeout(parsed.normalizedUrl, 5000);
          if (pageRes.ok) {
            const html = await pageRes.text();
            const ogTitle = extractMetaContent(html, "og:title");
            const ogImage = extractMetaContent(html, "og:image");
            if (ogTitle) title = ogTitle.replace(/\s*-\s*Twitch$/i, "").trim();
            if (ogImage && ogImage.startsWith("https://")) thumbnailUrl = ogImage;
          }
        } catch {
          // Continue with parsed Twitch channel/VOD metadata
        }
      }

      res.json({
        id: `${parsed.platform}-${parsed.externalId}-${Date.now()}`,
        platform: parsed.platform,
        url: parsed.normalizedUrl,
        embedUrl: parsed.embedUrl,
        externalId: parsed.externalId,
        kind: parsed.kind,
        title,
        channelName,
        thumbnailUrl,
        durationSec,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to inspect stream URL.";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/highlights/detect", async (req, res) => {
    try {
      const {
        title,
        platform,
        channelName,
        durationSec,
        transcript,
        audioPeaks,
        chatVelocity,
        targetClipDuration = "30s",
        stylePreference = "High-retention vertical shorts",
      } = req.body ?? {};

      if (!title || typeof durationSec !== "number" || durationSec < 10) {
        res.status(400).json({
          error: "Valid stream title and duration (>= 10 seconds) are required.",
        });
        return;
      }

      const ai = getGeminiClient();

      const safeDuration = Math.min(Math.max(Math.round(durationSec), 15), 43200);
      const peakSummary = Array.isArray(audioPeaks) && audioPeaks.length > 0
        ? audioPeaks
            .map((p: { timeSec?: number; level?: number }, idx: number) => ({
              timeSec:
                typeof p.timeSec === "number"
                  ? Math.round(p.timeSec)
                  : Math.round((idx / audioPeaks.length) * safeDuration),
              level: typeof p.level === "number" ? Math.round(p.level) : 0,
            }))
            .filter((p) => p.level >= 68)
            .slice(0, 18)
            .map((p) => `${p.timeSec}s (${p.level}%)`)
            .join(", ")
        : "No raw audio peak waveform provided";

      const chatSummary = Array.isArray(chatVelocity) && chatVelocity.length > 0
        ? chatVelocity
            .filter((c: { messagesPerMin?: number }) => (c.messagesPerMin ?? 0) > 40)
            .slice(0, 12)
            .map((c: { timeSec?: number; messagesPerMin?: number; keyword?: string }) =>
              `${Math.round(c.timeSec ?? 0)}s: ${c.messagesPerMin} msg/min${c.keyword ? ` ("${c.keyword}")` : ""}`
            )
            .join("; ")
        : "Standard chat cadence";

      const transcriptText =
        typeof transcript === "string" && transcript.trim().length > 0
          ? transcript.trim().slice(0, 9000)
          : `Stream Title: ${title}. Channel: ${channelName ?? "Creator"}. No verbatim transcript provided; infer pacing windows around peak timestamps and stream narrative structure.`;

      const prompt = [
        `Analyze this ${platform ?? "stream"} broadcast and detect 5 high-retention short video highlight clips.`,
        `Stream Title: ${String(title)}`,
        `Channel: ${String(channelName ?? "Creator")}`,
        `Total Duration: ${safeDuration} seconds`,
        `Target Clip Length: ${String(targetClipDuration)}`,
        `Editorial Style: ${String(stylePreference)}`,
        `Audio Energy Peaks: ${peakSummary || "Distributed peaks"}`,
        `Chat Velocity Spikes: ${chatSummary}`,
        `Stream Transcript / Cues:\n${transcriptText}`,
        `\nRules:`,
        `1. Return between 4 and 6 non-overlapping or distinct clips.`,
        `2. Every startSec and endSec MUST be within [0, ${safeDuration}], with clip length between 12 and 60 seconds (unless total duration is shorter).`,
        `3. Each clip must include 3 to 5 timed caption cues whose relative startOffsetSec and endOffsetSec fit within [0, endSec - startSec].`,
        `4. Keep titles punchy (max 8 words) and hooks direct without clickbait clichés.`,
      ].join("\n");

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            "You are an expert short-form video editor for Twitch and YouTube livestreamers. Identify exact highlight windows backed by audio spikes, chat velocity, and narrative turning points.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              highlights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    startSec: { type: Type.NUMBER },
                    endSec: { type: Type.NUMBER },
                    category: {
                      type: Type.STRING,
                      description:
                        "One of: Clutch Play, Chat Spike, Commentary Peak, Plot Twist, Reaction",
                    },
                    score: { type: Type.INTEGER },
                    hookLine: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    captions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          startOffsetSec: { type: Type.NUMBER },
                          endOffsetSec: { type: Type.NUMBER },
                          text: { type: Type.STRING },
                        },
                        required: ["startOffsetSec", "endOffsetSec", "text"],
                      },
                    },
                  },
                  required: [
                    "title",
                    "startSec",
                    "endSec",
                    "category",
                    "score",
                    "hookLine",
                    "reason",
                    "captions",
                  ],
                },
              },
            },
            required: ["highlights"],
          },
        },
      });

      const rawJson = (response.text ?? "{}").trim();
      const parsed = JSON.parse(rawJson) as {
        highlights?: Array<{
          title: string;
          startSec: number;
          endSec: number;
          category: string;
          score: number;
          hookLine: string;
          reason: string;
          captions: Array<{ startOffsetSec: number; endOffsetSec: number; text: string }>;
        }>;
      };

      const validCategories = new Set([
        "Clutch Play",
        "Chat Spike",
        "Commentary Peak",
        "Plot Twist",
        "Reaction",
      ]);

      const normalizedHighlights = (parsed.highlights ?? []).map((item, index) => {
        const start = Math.max(0, Math.min(Number(item.startSec) || 0, safeDuration - 8));
        const rawEnd = Number(item.endSec) || start + 25;
        const end = Math.min(safeDuration, Math.max(start + 8, Math.min(rawEnd, start + 65)));
        const clipLen = end - start;
        const captions = (item.captions ?? [])
          .filter((c) => c.text && c.text.trim().length > 0)
          .map((c) => {
            const cStart = Math.max(0, Math.min(Number(c.startOffsetSec) || 0, clipLen - 1));
            const cEnd = Math.min(clipLen, Math.max(cStart + 0.8, Number(c.endOffsetSec) || cStart + 3));
            return {
              startOffsetSec: Number(cStart.toFixed(1)),
              endOffsetSec: Number(cEnd.toFixed(1)),
              text: c.text.trim(),
            };
          });

        return {
          id: `hl-${Date.now()}-${index}`,
          title: String(item.title || `Highlight ${index + 1}`).slice(0, 80),
          startSec: Math.round(start * 10) / 10,
          endSec: Math.round(end * 10) / 10,
          category: validCategories.has(item.category) ? item.category : "Commentary Peak",
          score: Math.max(50, Math.min(99, Math.round(Number(item.score) || 84))),
          hookLine: String(item.hookLine || item.title || "").slice(0, 120),
          reason: String(item.reason || "").slice(0, 260),
          captions:
            captions.length > 0
              ? captions
              : [
                  {
                    startOffsetSec: 0,
                    endOffsetSec: Math.min(4, clipLen),
                    text: item.hookLine || item.title,
                  },
                ],
        };
      });

      res.json({ highlights: normalizedHighlights });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to detect highlights with Gemini.";
      const status = message.includes("GEMINI_API_KEY") ? 503 : 500;
      res.status(status).json({ error: message });
    }
  });

  app.post("/api/clips/hook-rewrite", async (req, res) => {
    try {
      const { title, hookLine, reason, targetPlatform = "YouTube Shorts" } = req.body ?? {};
      if (!title) {
        res.status(400).json({ error: "Clip title is required." });
        return;
      }

      const ai = getGeminiClient();

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Rewrite this short video clip hook and title for ${String(targetPlatform)}.\nCurrent Title: ${String(title)}\nCurrent Opening Hook: ${String(hookLine ?? "")}\nClip Context: ${String(reason ?? "")}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            "You are a concise social video editor. Return a punchy title (max 7 words), an opening 2-second on-screen hook line (max 10 words), and a short caption.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              hookLine: { type: Type.STRING },
              socialCaption: { type: Type.STRING },
            },
            required: ["title", "hookLine", "socialCaption"],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? "{}").trim());
      res.json(parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to rewrite clip hook.";
      const status = message.includes("GEMINI_API_KEY") ? 503 : 500;
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      const indexFile = path.join(distDir, "index.html");
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send("Build not found. Run npm run build first.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ClipDeck server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
