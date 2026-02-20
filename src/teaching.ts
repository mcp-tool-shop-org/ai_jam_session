// ─── piano-sessions-ai: Teaching Engine ─────────────────────────────────────
//
// Provides TeachingHook implementations that deliver teaching interjections
// during playback. The session engine calls these hooks at key moments.
//
// Implementations:
//   - ConsoleTeachingHook: logs to console (development/CLI)
//   - SilentTeachingHook: no-op (testing/benchmarks)
//   - CallbackTeachingHook: routes to custom callbacks (MCP/voice/aside)
// ─────────────────────────────────────────────────────────────────────────────

import type { TeachingHook, TeachingInterjection, TeachingPriority } from "./types.js";
import type { SongEntry } from "ai-music-sheets";

// ─── Console Hook (CLI / development) ───────────────────────────────────────

/**
 * Logs teaching interjections to the console.
 * Good for CLI mode and development.
 */
export function createConsoleTeachingHook(): TeachingHook {
  return {
    async onMeasureStart(measureNumber, teachingNote, dynamics) {
      const parts: string[] = [`  [Measure ${measureNumber}]`];
      if (dynamics) parts.push(`(${dynamics})`);
      if (teachingNote) parts.push(`— ${teachingNote}`);
      console.log(parts.join(" "));
    },

    async onKeyMoment(moment) {
      console.log(`  ★ ${moment}`);
    },

    async onSongComplete(measuresPlayed, songTitle) {
      console.log(`\n  ✓ Finished "${songTitle}" — ${measuresPlayed} measures played.`);
    },

    async push(interjection) {
      const prefix =
        interjection.priority === "high" ? "❗" :
        interjection.priority === "med" ? "💡" : "ℹ️";
      console.log(`  ${prefix} ${interjection.text}`);
    },
  };
}

// ─── Silent Hook (testing) ──────────────────────────────────────────────────

/**
 * No-op hook — swallows all interjections.
 * Use in tests where you don't want console noise.
 */
export function createSilentTeachingHook(): TeachingHook {
  return {
    async onMeasureStart() {},
    async onKeyMoment() {},
    async onSongComplete() {},
    async push() {},
  };
}

// ─── Recording Hook (testing) ───────────────────────────────────────────────

/** A recorded teaching event for assertions. */
export interface TeachingEvent {
  type: "measure-start" | "key-moment" | "song-complete" | "push";
  measureNumber?: number;
  teachingNote?: string;
  dynamics?: string;
  moment?: string;
  measuresPlayed?: number;
  songTitle?: string;
  interjection?: TeachingInterjection;
}

/**
 * Records all teaching events for test assertions.
 * Use: `const hook = createRecordingTeachingHook(); ... hook.events`
 */
export function createRecordingTeachingHook(): TeachingHook & { events: TeachingEvent[] } {
  const events: TeachingEvent[] = [];

  return {
    events,

    async onMeasureStart(measureNumber, teachingNote, dynamics) {
      events.push({ type: "measure-start", measureNumber, teachingNote, dynamics });
    },

    async onKeyMoment(moment) {
      events.push({ type: "key-moment", moment });
    },

    async onSongComplete(measuresPlayed, songTitle) {
      events.push({ type: "song-complete", measuresPlayed, songTitle });
    },

    async push(interjection) {
      events.push({ type: "push", interjection });
    },
  };
}

// ─── Callback Hook (flexible routing) ───────────────────────────────────────

/** Callbacks for a custom teaching hook. All optional — unset = no-op. */
export interface TeachingCallbacks {
  onMeasureStart?: (measureNumber: number, teachingNote?: string, dynamics?: string) => Promise<void>;
  onKeyMoment?: (moment: string) => Promise<void>;
  onSongComplete?: (measuresPlayed: number, songTitle: string) => Promise<void>;
  onPush?: (interjection: TeachingInterjection) => Promise<void>;
}

/**
 * Routes teaching events to custom callbacks.
 * Use this to wire to mcp-voice-soundboard, mcp-aside, or any other sink.
 */
export function createCallbackTeachingHook(callbacks: TeachingCallbacks): TeachingHook {
  return {
    async onMeasureStart(measureNumber, teachingNote, dynamics) {
      await callbacks.onMeasureStart?.(measureNumber, teachingNote, dynamics);
    },
    async onKeyMoment(moment) {
      await callbacks.onKeyMoment?.(moment);
    },
    async onSongComplete(measuresPlayed, songTitle) {
      await callbacks.onSongComplete?.(measuresPlayed, songTitle);
    },
    async push(interjection) {
      await callbacks.onPush?.(interjection);
    },
  };
}

// ─── Key Moment Detector ────────────────────────────────────────────────────

/**
 * Check if the current measure matches any key moments in the song.
 * Key moments in ai-music-sheets reference bars like "Bar 1:", "Bars 3-4:", etc.
 */
export function detectKeyMoments(
  song: SongEntry,
  measureNumber: number
): string[] {
  const matches: string[] = [];
  for (const km of song.musicalLanguage.keyMoments) {
    // Match patterns like "Bar 1:", "Bars 1-2:", "Bar 9:"
    const singleMatch = km.match(/^Bars?\s+(\d+)\s*:/i);
    const rangeMatch = km.match(/^Bars?\s+(\d+)\s*-\s*(\d+)\s*:/i);

    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (measureNumber >= start && measureNumber <= end) {
        matches.push(km);
      }
    } else if (singleMatch) {
      const bar = parseInt(singleMatch[1], 10);
      if (bar === measureNumber) {
        matches.push(km);
      }
    }
  }
  return matches;
}
