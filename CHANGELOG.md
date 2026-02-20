# Changelog

## 1.0.0 (2026-02-20)

Initial public release of **PianoAI** — an MCP server + CLI for AI-powered piano teaching.

### Features

- **Session engine** — play/pause/stop with 4 playback modes (full, measure, hands, loop)
- **Speed control** — 0.5×–2× multiplier that stacks with per-song tempo override (10–400 BPM)
- **Progress tracking** — configurable callbacks at percentage milestones or per-measure
- **7 teaching hooks** — console, silent, recording, callback, voice, aside, compose
- **Voice feedback** — `VoiceDirective` output for mcp-voice-soundboard integration
- **Aside interjections** — `AsideDirective` output for mcp-aside inbox
- **Safe parsing** — bad notes skip gracefully with collected `ParseWarning`s
- **7 MCP tools** — list_songs, song_info, registry_stats, teaching_note, suggest_song, list_measures, practice_setup
- **Note parser** — scientific pitch notation ↔ MIDI (strict + safe variants)
- **VMPK connector** — real (JZZ) + mock for full test coverage without hardware
- **CLI** — `pianai list`, `info`, `play`, `stats`, `ports` with progress bar and teaching output
- **Docker** — multi-stage Dockerfile for lightweight production image
- **CI/CD** — GitHub Actions for lint/test/build + npm publish + Docker push on release

### Docs

- Multilingual README in 8 languages (EN, JA, ZH, ES, FR, HI, IT, PT-BR)
- PianoAI logo (logo.svg) centered in all READMEs

### Testing

- 121 Vitest unit tests (parser, session, teaching, voice, aside)
- 20 smoke tests (integration, no MIDI hardware needed)
- Full TypeScript strict mode
