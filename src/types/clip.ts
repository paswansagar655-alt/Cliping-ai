export type StreamPlatform = "twitch" | "youtube" | "local";

export type HighlightCategory =
  | "Clutch Play"
  | "Chat Spike"
  | "Commentary Peak"
  | "Plot Twist"
  | "Reaction"
  | "Manual";

export type FramingMode = "center-fill" | "facecam-split" | "blur-fit";
export type CaptionStyle = "bold-impact" | "clean-minimal" | "broadcast-lower";
export type TargetPlatform = "YouTube Shorts" | "TikTok" | "Instagram Reels";

export interface CaptionCue {
  startOffsetSec: number;
  endOffsetSec: number;
  text: string;
}

export interface AudioPeakPoint {
  timeSec: number;
  level: number;
}

export interface ChatSpikePoint {
  timeSec: number;
  messagesPerMin: number;
  keyword: string;
}

export interface HighlightClip {
  id: string;
  title: string;
  startSec: number;
  endSec: number;
  category: HighlightCategory;
  score: number;
  hookLine: string;
  reason: string;
  captions: CaptionCue[];
}

export interface StreamSource {
  id: string;
  platform: StreamPlatform;
  title: string;
  channelName: string;
  url: string;
  embedUrl?: string;
  localVideoUrl?: string;
  thumbnailUrl: string;
  durationSec: number;
  transcript: string;
  audioPeaks: AudioPeakPoint[];
  chatVelocity: ChatSpikePoint[];
  highlights: HighlightClip[];
  sourceKind: "demo" | "remote" | "local-file";
}

export interface ExportedClip {
  id: string;
  streamTitle: string;
  platform: StreamPlatform;
  title: string;
  hookLine: string;
  startSec: number;
  endSec: number;
  framingMode: FramingMode;
  targetPlatform: TargetPlatform;
  createdAt: string;
  videoUrl?: string;
  fileSizeBytes?: number;
  captions: CaptionCue[];
  mimeType: string;
}
