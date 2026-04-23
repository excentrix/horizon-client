# Changelog

All notable changes to frontend are documented in this file.

Versioning policy:
- Bumps are decided at release time (not per commit):
- `major` if any breaking change is included.
- else `minor` if any backward-compatible feature/public capability is included.
- else `patch` (fix/docs/chore/refactor/perf/test only).
- Entries are tracked per commit for precise release traceability.

## Unreleased

### Added
- Simulation Lab now routes non-simulation surfaces (`diagram_workspace`, `canvas_workspace`, `flashcard_session`, `teachback_session`) through dedicated universal surface-session APIs.
- Dashboard now shows runtime outcome-gate visibility (`status`, envelope coverage, false-verify risk).
- Draft review UX in mentor composer with opt-in pre-send warning checks.
- Runtime console card in Simulation Lab for completion criteria, rubric progress, copilot guidance, and intervention state visibility.

### Changed
- Simulation Lab result handling now supports session-based envelopes for non-simulation adapters while preserving existing simulation endpoint behavior.
- Planning API client/types expanded for surface-session lifecycle endpoints and outcome-gate efficacy payload fields.

## v0.1.4 (2026-04-22)

### Commits
- `b68da85` docs(changelog): record v0.3.0 runtime and intervention updates
- `4512aa6` feat(studio): surface runtime/intervention data in dashboard and profile views
- `d02ec69` feat(runtime-ui): add simulation lab runtime console and intervention compatibility

### Notes
- No major/breaking designation applied in this cycle; additive runtime UI and contract compatibility updates only.

## v0.1.3 (2026-04-21)

### Commits
- `9b3334b` docs(changelog): record 2026-04-21 release updates
- `6e187c0` feat(simulation-lab): add design and finance scenario presets
- `a646156` fix(playground): show fallback nudge toast and refetch mentor messages
- `c10bad2` feat(simulation-lab): add process and funnel scenario presets
- `d047030` chore(types): add qrcode module declaration
- `2acadbc` feat(studio): add simulation lab screen, nav entry, and API contracts

## v0.1.2 (2026-04-18)

### Commits
- `35d63df` fix(studio): stabilize playground idle telemetry and dashboard rendering
- `656c945` feat(planning): add simulation scenario client APIs and types
- `f6ad595` feat: surface simulation diagnostics and efficacy across playground UX

## v0.1.1 (2026-04-15)

### Commits
- `fc43f88` docs(changelog): record 2026-04-15 plans v2 and verification release
- `cda2435` feat: plans v2 workspace + project verification ui integration (#4)

## v0.1.0 (2026-04-14)

### Notes
- Initial baseline for this changelog series (pre-commitized historical state).
