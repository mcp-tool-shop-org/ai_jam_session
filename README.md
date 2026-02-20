# piano-sessions-ai

MCP server + CLI for AI-powered piano teaching — plays through VMPK via MIDI with voice feedback.

[![Tests](https://img.shields.io/badge/tests-49_passing-brightgreen)](https://github.com/mcp-tool-shop-org/piano-ai)
[![Smoke](https://img.shields.io/badge/smoke-11_passing-brightgreen)](https://github.com/mcp-tool-shop-org/piano-ai)
[![Songs](https://img.shields.io/badge/songs-10_(via_ai--music--sheets)-blue)](https://github.com/mcp-tool-shop-org/ai-music-sheets)

## What is this?

A TypeScript CLI and MCP server that loads piano songs from [ai-music-sheets](https://github.com/mcp-tool-shop-org/ai-music-sheets), parses them into MIDI, and plays them through [VMPK](https://vmpk.sourceforge.io/) (Virtual MIDI Piano Keyboard) via a virtual MIDI port.

The session engine supports four playback modes:
- **Full** — play the entire song straight through
- **Measure** — step through one measure at a time
- **Hands** — play each hand separately, then both together
- **Loop** — loop a range of measures indefinitely

## Prerequisites

1. **[loopMIDI](https://www.tobias-erichsen.de/software/loopmidi.html)** — create a virtual MIDI port (e.g., "loopMIDI Port")
2. **[VMPK](https://vmpk.sourceforge.io/)** — set MIDI input to your loopMIDI port
3. **Node.js 18+**

## Quick Start

```bash
pnpm install
pnpm build

# List all songs
node dist/cli.js list

# Show song details + teaching notes
node dist/cli.js info moonlight-sonata-mvt1

# Play a song through VMPK
node dist/cli.js play let-it-be

# Play with tempo override
node dist/cli.js play basic-12-bar-blues --tempo 80

# Step through measure by measure
node dist/cli.js play autumn-leaves --mode measure
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `list [--genre <genre>]` | List available songs, optionally filtered by genre |
| `info <song-id>` | Show song details: musical language, teaching notes, structure |
| `play <song-id> [opts]` | Play a song through VMPK via MIDI |
| `stats` | Registry statistics (songs, genres, measures) |
| `ports` | List available MIDI output ports |
| `help` | Show usage information |

### Play Options

| Flag | Description |
|------|-------------|
| `--port <name>` | MIDI port name (default: auto-detect loopMIDI) |
| `--tempo <bpm>` | Override the song's default tempo |
| `--mode <mode>` | Playback mode: `full`, `measure`, `hands`, `loop` |

## Programmatic API

```typescript
import { getSong } from "ai-music-sheets";
import { createSession, createVmpkConnector } from "piano-sessions-ai";

// Connect to VMPK
const connector = createVmpkConnector({ portName: /loop/i });
await connector.connect();

// Load and play a song
const song = getSong("autumn-leaves")!;
const session = createSession(song, connector, {
  mode: "measure",
  tempo: 100,
});

await session.play();          // plays one measure, pauses
console.log(session.summary());
session.next();                // advance to next measure
await session.play();          // play next measure
session.stop();                // stop and reset

await connector.disconnect();
```

### Note Parser

```typescript
import { parseNoteToMidi, midiToNoteName, durationToMs } from "piano-sessions-ai";

parseNoteToMidi("C4");    // → 60
parseNoteToMidi("F#5");   // → 78
parseNoteToMidi("Bb3");   // → 58
midiToNoteName(60);       // → "C4"
durationToMs(1.0, 120);   // → 500 (quarter note at 120 BPM)
```

## Architecture

```
ai-music-sheets (library)        piano-sessions-ai (runtime)
┌──────────────────────┐         ┌───────────────────────────┐
│ SongEntry (hybrid)   │────────→│ Note Parser               │
│ Registry (search)    │         │ Session Engine             │
│ 10 songs, 10 genres  │         │ VMPK Connector (JZZ)      │
└──────────────────────┘         │ CLI                        │
                                 └─────────┬─────────────────┘
                                           │ MIDI
                                           ▼
                                 ┌─────────────────┐
                                 │ loopMIDI → VMPK │
                                 └─────────────────┘
```

## Testing

```bash
pnpm test       # 49 Vitest tests (note parser + session engine)
pnpm smoke      # 11 smoke tests (integration, no MIDI needed)
pnpm typecheck  # tsc --noEmit
```

The mock VMPK connector (`createMockVmpkConnector`) records all MIDI events without hardware, enabling full test coverage of the session engine.

## Related

- **[ai-music-sheets](https://github.com/mcp-tool-shop-org/ai-music-sheets)** — The song library: 10 genres, hybrid format (metadata + musical language + code-ready measures)

## License

MIT
