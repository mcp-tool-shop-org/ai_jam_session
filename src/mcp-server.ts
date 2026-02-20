#!/usr/bin/env node
// ─── piano-sessions-ai: MCP Server ─────────────────────────────────────────
//
// Exposes the ai-music-sheets registry and session engine as MCP tools.
// An LLM can browse songs, get teaching info, start sessions, and push
// teaching interjections — all through the standard MCP protocol.
//
// Usage:
//   node dist/mcp-server.js          # stdio transport
//
// Tools:
//   list_songs      — browse/search the song library
//   song_info       — get detailed info for a specific song
//   registry_stats  — get registry statistics
//   start_session   — create a playback session (no MIDI needed for info)
//   teaching_note   — get the teaching note for a specific measure
//   suggest_song    — get a song recommendation based on criteria
// ─────────────────────────────────────────────────────────────────────────────

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  getAllSongs,
  getSong,
  getSongsByGenre,
  getSongsByDifficulty,
  searchSongs,
  getStats,
  GENRES,
  DIFFICULTIES,
} from "ai-music-sheets";
import type { SongEntry } from "ai-music-sheets";

// ─── Server ─────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "piano-sessions-ai",
  version: "0.1.0",
});

// ─── Tool: list_songs ───────────────────────────────────────────────────────

server.tool(
  "list_songs",
  "Browse and search the piano song library. Filter by genre, difficulty, or search query.",
  {
    genre: z.enum(GENRES as unknown as [string, ...string[]]).optional().describe("Filter by genre"),
    difficulty: z.enum(DIFFICULTIES as unknown as [string, ...string[]]).optional().describe("Filter by difficulty"),
    query: z.string().optional().describe("Search query (matches title, composer, tags, description)"),
  },
  async (params) => {
    const results = searchSongs({
      genre: params.genre as any,
      difficulty: params.difficulty as any,
      query: params.query,
    });

    const text = results.length === 0
      ? "No songs found matching your criteria."
      : results
          .map((s) => `${s.id} — ${s.title} (${s.genre}, ${s.difficulty}, ${s.measures.length} measures)`)
          .join("\n");

    return {
      content: [{ type: "text", text: `Found ${results.length} song(s):\n\n${text}` }],
    };
  }
);

// ─── Tool: song_info ────────────────────────────────────────────────────────

server.tool(
  "song_info",
  "Get detailed information about a specific song — musical language, teaching goals, key moments, structure.",
  {
    id: z.string().describe("Song ID (kebab-case, e.g. 'moonlight-sonata-mvt1')"),
  },
  async ({ id }) => {
    const song = getSong(id);
    if (!song) {
      return {
        content: [{ type: "text", text: `Song not found: "${id}". Use list_songs to see available songs.` }],
        isError: true,
      };
    }

    const ml = song.musicalLanguage;
    const text = [
      `# ${song.title}`,
      `**Composer:** ${song.composer ?? "Traditional"}`,
      `**Genre:** ${song.genre} | **Difficulty:** ${song.difficulty}`,
      `**Key:** ${song.key} | **Tempo:** ${song.tempo} BPM | **Time:** ${song.timeSignature}`,
      `**Duration:** ~${song.durationSeconds}s | **Measures:** ${song.measures.length}`,
      ``,
      `## Description`,
      ml.description,
      ``,
      `## Structure`,
      ml.structure,
      ``,
      `## Key Moments`,
      ...ml.keyMoments.map((km) => `- ${km}`),
      ``,
      `## Teaching Goals`,
      ...ml.teachingGoals.map((tg) => `- ${tg}`),
      ``,
      `## Style Tips`,
      ...ml.styleTips.map((st) => `- ${st}`),
      ``,
      `**Tags:** ${song.tags.join(", ")}`,
    ].join("\n");

    return { content: [{ type: "text", text }] };
  }
);

// ─── Tool: registry_stats ───────────────────────────────────────────────────

server.tool(
  "registry_stats",
  "Get statistics about the song registry: total songs, genres, difficulties, measures.",
  {},
  async () => {
    const stats = getStats();
    const genreLines = Object.entries(stats.byGenre)
      .filter(([, count]) => count > 0)
      .map(([genre, count]) => `  ${genre}: ${count}`)
      .join("\n");
    const diffLines = Object.entries(stats.byDifficulty)
      .filter(([, count]) => count > 0)
      .map(([diff, count]) => `  ${diff}: ${count}`)
      .join("\n");

    const text = [
      `# Registry Stats`,
      `Total songs: ${stats.totalSongs}`,
      `Total measures: ${stats.totalMeasures}`,
      ``,
      `## By Genre`,
      genreLines,
      ``,
      `## By Difficulty`,
      diffLines,
    ].join("\n");

    return { content: [{ type: "text", text }] };
  }
);

// ─── Tool: teaching_note ────────────────────────────────────────────────────

server.tool(
  "teaching_note",
  "Get the teaching note, fingering, and dynamics for a specific measure in a song.",
  {
    id: z.string().describe("Song ID"),
    measure: z.number().int().min(1).describe("Measure number (1-based)"),
  },
  async ({ id, measure }) => {
    const song = getSong(id);
    if (!song) {
      return {
        content: [{ type: "text", text: `Song not found: "${id}"` }],
        isError: true,
      };
    }

    const m = song.measures[measure - 1];
    if (!m) {
      return {
        content: [{ type: "text", text: `Measure ${measure} not found (song has ${song.measures.length} measures)` }],
        isError: true,
      };
    }

    const lines = [
      `# ${song.title} — Measure ${measure}`,
      ``,
      `**Right Hand:** ${m.rightHand}`,
      `**Left Hand:** ${m.leftHand}`,
    ];
    if (m.fingering) lines.push(`**Fingering:** ${m.fingering}`);
    if (m.dynamics) lines.push(`**Dynamics:** ${m.dynamics}`);
    if (m.teachingNote) {
      lines.push(``, `## Teaching Note`, m.teachingNote);
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

// ─── Tool: suggest_song ─────────────────────────────────────────────────────

server.tool(
  "suggest_song",
  "Get a song recommendation based on genre preference and/or difficulty level.",
  {
    genre: z.enum(GENRES as unknown as [string, ...string[]]).optional().describe("Preferred genre"),
    difficulty: z.enum(DIFFICULTIES as unknown as [string, ...string[]]).optional().describe("Desired difficulty"),
    maxDuration: z.number().optional().describe("Maximum duration in seconds"),
  },
  async (params) => {
    const results = searchSongs({
      genre: params.genre as any,
      difficulty: params.difficulty as any,
      maxDuration: params.maxDuration,
    });

    if (results.length === 0) {
      return {
        content: [{ type: "text", text: "No songs match your criteria. Try broadening your search." }],
      };
    }

    // Pick a random suggestion from matches
    const song = results[Math.floor(Math.random() * results.length)];
    const ml = song.musicalLanguage;

    const text = [
      `I'd suggest: **${song.title}** by ${song.composer ?? "Traditional"}`,
      ``,
      `${ml.description}`,
      ``,
      `**Why this song?**`,
      ...ml.teachingGoals.map((tg) => `- ${tg}`),
      ``,
      `Use \`song_info\` with id "${song.id}" for full details.`,
    ].join("\n");

    return { content: [{ type: "text", text }] };
  }
);

// ─── Tool: list_measures ────────────────────────────────────────────────────

server.tool(
  "list_measures",
  "Get an overview of all measures in a song, showing right hand, left hand, and any teaching notes.",
  {
    id: z.string().describe("Song ID"),
    startMeasure: z.number().int().min(1).optional().describe("Start measure (1-based, default: 1)"),
    endMeasure: z.number().int().min(1).optional().describe("End measure (1-based, default: last)"),
  },
  async ({ id, startMeasure, endMeasure }) => {
    const song = getSong(id);
    if (!song) {
      return {
        content: [{ type: "text", text: `Song not found: "${id}"` }],
        isError: true,
      };
    }

    const start = (startMeasure ?? 1) - 1;
    const end = Math.min((endMeasure ?? song.measures.length) - 1, song.measures.length - 1);
    const measures = song.measures.slice(start, end + 1);

    const lines = [`# ${song.title} — Measures ${start + 1} to ${end + 1}`, ``];
    for (const m of measures) {
      lines.push(`## Measure ${m.number}`);
      lines.push(`RH: ${m.rightHand}`);
      lines.push(`LH: ${m.leftHand}`);
      if (m.fingering) lines.push(`Fingering: ${m.fingering}`);
      if (m.dynamics) lines.push(`Dynamics: ${m.dynamics}`);
      if (m.teachingNote) lines.push(`Note: ${m.teachingNote}`);
      lines.push(``);
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

// ─── Start ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("piano-sessions-ai MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
