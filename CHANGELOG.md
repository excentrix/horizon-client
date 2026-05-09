# Changelog

All notable changes to frontend are documented in this file.

Versioning policy:
- Bumps are decided at release time (not per commit):
- `major` if any breaking change is included.
- else `minor` if any backward-compatible feature/public capability is included.
- else `patch` (fix/docs/chore/refactor/perf/test only).
- Entries are tracked per commit for precise release traceability.

## Unreleased

- No changes yet.

## v0.2.5 (2026-05-09)

### Added
- Simulation Lab now routes non-simulation surfaces (`diagram_workspace`, `canvas_workspace`, `flashcard_session`, `teachback_session`) through dedicated universal surface-session APIs.
- Dashboard now shows runtime outcome-gate visibility (`status`, envelope coverage, false-verify risk).
- Draft review UX in mentor composer with opt-in pre-send warning checks.
- Runtime console card in Simulation Lab for completion criteria, rubric progress, copilot guidance, and intervention state visibility.
- New review route (`/review`) for spaced-repetition sessions with keyboard shortcuts and session summaries.
- Concept map widget for mentor chat responses, with mastery-aware node styling and prerequisite graph rendering.
- Scene player and scene-studio layout primitives (`SceneStage`, `SceneRail`, mentor/roundtable docks) for multi-scene interactive task delivery.
- New scene surface components for interactive sims, code challenges, quizzes, and agent dialogue.
- Project workspace flow components for brief selection, checkpoints, gated submissions, and VELO verification prompts.
- Mermaid and Vega visual scene renderers plus markdown Mermaid block support for diagram/chart-driven lessons.
- Lesson loading, task-locked, and regeneration-modal UX states for long-running generation and gated progression flows.

### Changed
- Simulation Lab result handling now supports session-based envelopes for non-simulation adapters while preserving existing simulation endpoint behavior.
- Planning API client/types expanded for surface-session lifecycle endpoints and outcome-gate efficacy payload fields.
- Playground OmniWorkspace now includes a starter-code complexity dial (scaffolding level 1-5) with live regeneration.
- Plans v2 workspace is now the primary `/plans` experience; previous `/plans/v2` route has been retired and archived under `/plans/old`.
- Studio shell behavior now adapts layout/header and dock treatment for immersive playground sessions.
- Playground runtime now includes stronger code-execution resilience (lazy sandbox mount, Python runtime handling, and clearer runtime failure states).
- HQ user management now surfaces and edits feature quota controls alongside governance settings.

### Commits
- `e573cb8` feat(studio): deliver project workspace flow and advanced scene runtime UX
- `de5712a` feat(studio): ship scene-based playground and plans v2 workspace flow
- `175188d` feat(playground): ship multi-surface runtime with feynman teach-back UX
- `d5b100b` feat(studio): improve roadmap/progress surfaces and mentor feed wiring
- `b0844f3` feat(studio): improve runtime chat, dashboard, and roadmap UX
- `dd010e7` feat(plans-v2): extend assessment and mentor persona UX contracts
- `043a626` feat(review): update spaced repetition logic and enhance review session details
- `df8f52a` merge: integrate feat/canvas-collab-excalidraw-v1 into v0.2
- `27cd9bf` feat(learning-ui): add review mode, concept maps, and scaffolding dial
- `39121ac` feat: ship excalidraw workspace and review flow
- `4944046` feat(studio-runtime): add surface session UX, runtime console, and draft review

## v0.2.4 (2026-04-22)

### Commits
- `b68da85` docs(changelog): record v0.3.0 runtime and intervention updates
- `4512aa6` feat(studio): surface runtime/intervention data in dashboard and profile views
- `d02ec69` feat(runtime-ui): add simulation lab runtime console and intervention compatibility

### Notes
- No major/breaking designation applied in this cycle; additive runtime UI and contract compatibility updates only.

## v0.2.3 (2026-04-21)

### Commits
- `9b3334b` docs(changelog): record 2026-04-21 release updates
- `6e187c0` feat(simulation-lab): add design and finance scenario presets
- `a646156` fix(playground): show fallback nudge toast and refetch mentor messages
- `c10bad2` feat(simulation-lab): add process and funnel scenario presets
- `d047030` chore(types): add qrcode module declaration
- `2acadbc` feat(studio): add simulation lab screen, nav entry, and API contracts

## v0.2.2 (2026-04-18)

### Commits
- `35d63df` fix(studio): stabilize playground idle telemetry and dashboard rendering
- `656c945` feat(planning): add simulation scenario client APIs and types
- `f6ad595` feat: surface simulation diagnostics and efficacy across playground UX

## v0.2.1 (2026-04-15)

### Commits
- `fc43f88` docs(changelog): record 2026-04-15 plans v2 and verification release
- `cda2435` feat: plans v2 workspace + project verification ui integration (#4)

## v0.2.0 (2026-04-14)

### Notes
- Initial baseline for this changelog series (pre-commitized historical state).
