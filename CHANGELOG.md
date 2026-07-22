# Changelog

All notable changes to frontend are documented in this file.

Versioning policy:
- Bumps are decided at release time (not per commit):
- `major` if any breaking change is included.
- else `minor` if any backward-compatible feature/public capability is included.
- else `patch` (fix/docs/chore/refactor/perf/test only).
- Entries are tracked per commit for precise release traceability.

## v0.2.6 (2026-06-10)

### Added
- Shell-driven onboarding entry with resume upload and mentor context setup.
- Re-entry and quick-ask mentor flows across dashboard and chat.
- Stateful SDL runtime console and playground surface for simulation sessions.

### Changed
- Old onboarding, audit, and mirror routes were retired in favor of the new shell and redirects.
- Mentor, dashboard, roadmap, plans, and profile surfaces were updated to align with the new flow.
- Simulation and plan surfaces now use the stateful playground runtime.

### Commits
- `5727c3c` feat(onboarding): consolidate onboarding routes into shell-driven flow
- `0b06441` feat(studio): refresh mentor, dashboard, roadmap, and profile surfaces
- `4b29d1f` feat(planning): ship stateful simulation console and playground runtime

## v0.2.7 (2026-06-21)

### Added
- Public portfolio visibility controls and route wiring for the updated studio shell.
- Simulation debrief and calendar-entry surfaces for the planning runtime.

### Changed
- Onboarding, mentor, dashboard, chat, roadmap, profile, and plans surfaces were refreshed to match the new studio flow.
- Studio navigation, charting, task preview, and redirect behavior were hardened for the latest routing and layout mix.
- Planning schedule management now opens the full calendar view and accepts the complete plan model.

### Commits
- `57fe9f2` fix(studio): refine onboarding, hq, settings, and mirror api wiring
- `9580086` feat(portfolio): add visibility toggle for public portfolio settings
- `5727c3c` feat(onboarding): consolidate onboarding routes into shell-driven flow
- `0b06441` feat(studio): refresh mentor, dashboard, roadmap, and profile surfaces
- `4b29d1f` feat(planning): ship stateful simulation console and playground runtime
- `c405952` feat(planning): add simulation debrief and schedule surfaces
- `a0464d2` feat(studio): refresh mentor, chat, and dashboard surfaces

## v0.2.8 (2026-06-24)

### Added
- VELO verification hub for resume upload, ad-hoc project intake, and repo-based defense flows.
- Feature-flag-driven route gating, home redirects, and studio navigation filtering.

### Changed
- Project verification sheets now keep GitHub connection state, guide the interrogation with live thinking states, and surface clearer progress copy.
- HTTP auth handling now treats expired or absent tokens consistently and redirects dead sessions back to login.
- Gamification, dashboard, and GitHub repo hooks now respect live feature availability before firing queries.

### Commits
- `bb1b70a` feat(verify): add VELO hub and feature-flag gating

## v0.2.9 (2026-07-01)

### Added
- Public verified-profile surfaces for recruiters, including `/p/[username]?tab=verified` and public credential pages.
- Funnel tracking around acquisition, signup, GitHub connect, resume upload, and credential sharing.

### Changed
- Verification pages now render the defended-work narrative directly from the new verified-profile API.
- Auth routing now keeps public credential/profile pages reachable without a session redirect.
- GitHub and portfolio hooks now feed the verified-profile workflow instead of assuming a portfolio-only path.

### Commits
- `bb7a927` feat(verify): add public verified profile surfaces

## v0.2.10 (2026-07-02)

### Added
- Verification-first onboarding that feeds directly into the VELO hub.

### Changed
- Onboarding now treats résumé upload as the first step in verification, not mentor setup.
- Optional role/company context still sharpens scoring, but no longer blocks progress.
- Returning users now land on the verification flow instead of being routed back into chat.

### Commits
- `5b36a6a` feat(onboarding): redirect onboarding into verification hub

## v0.2.11 (2026-07-07)

### Added
- Verification sheets now pre-seed the project repo from the active project so users do not have to re-select it.

### Changed
- Removed the VELO_AUDIT.md copy/re-check gate from the verification flow and simplified the sheet around live repo interrogation.
- Project verification and mirror tabs now pass the selected repository URL through the sheet.

### Commits
- `df52f0c` feat(verify): streamline project verification repo selection

## v0.2.12 (2026-07-16)

### Added
- Declared project-context step in the verification flow, with transcript capture and retryable scoring resolution.
- Dimension breakdowns on project verification cards, public audit reports, and verified-profile surfaces.

### Changed
- Verification and public profile pages now surface scoring state instead of only a scalar pass/fail badge.
- Verification sheets now carry the selected repo through the interrogation flow and preserve the live turn log.

### Commits
- `0728552` feat(verify): expand verification and public profile scoring UI

## v0.2.13 (2026-07-17)

### Added
- Full-page verification session route with transcript, repo picker, verdict stamp, and dimension meters.
- Public audit report and verified-profile surfaces that expose transcript, claims-tested data, and share actions.

### Changed
- Onboarding, studio layout, and verification pages now route users into the new verification case-file flow.
- Verified-profile and public audit views now present the defended-work breakdown instead of a flat summary only.
- Local QR styling and shared API/types were updated to support the new public report surfaces.

### Commits
- `1dbe75a` feat(verify): add full verification session and public report surfaces

## Unreleased

### Added
- Pathfinder surfaces for student discovery, institutional program management, and session/report pages.

### Changed
- Auth, dashboard, HQ, and route-guard surfaces now understand the Pathfinder feature flag and routing model.
- Shared API/types/routing/store layers were extended to support Pathfinder session state and reporting.

### Commits
- `9e3c614` feat(pathfinder): add school pathfinder surfaces and routing

## v0.2.14 (2026-07-22)

### Added
- Full verification-session route with transcript, improvement guidance, and a dedicated loading state.
- Public audit credential and profile analysis surfaces, plus OG credential cards for sharing.

### Changed
- Verification and recruiter-facing pages now route through the new case-file flow instead of the older drawer-centric experience.
- Studio shell routing and authenticated callbacks were adjusted to support the new VELO surfaces.

### Commits
- `b3c224a` feat(verify): add verification and public credential surfaces
- `c1a4de7` feat(studio): align auth and HQ surfaces with VELO flow

### Added
- Director playback engine hooks and scene-studio interaction components (speech bubbles, whiteboard, inline quiz, playback scene).
- Extended simulation and scene surfaces with richer dock/rail choreography and interaction controls.
- New Horizon logo assets for updated studio branding surfaces.

### Changed
- API/types/contracts expanded for scene-action generation and mirror PDF export fetch handling.
- Studio navigation, settings, dashboard, and profile surfaces updated to support playback-first runtime UX.
- Mermaid rendering and HTTP client behavior refined for safer runtime handling.
- Studio dock/mirror/progress surfaces were refactored and aligned with the latest runtime layout behavior.
- Added App Router compatibility `_document` page shim to prevent production `/_document` build resolution failures.

### Commits
- `5a6cb58` feat(studio): add director playback engine and scene-interaction surfaces
- `4ebdf4b` fix(simulations): resolve conditional hooks ordering in simulation lab page
- `d93f0a7` feat(studio): refresh dock and mirror surfaces with build/runtime fixes

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
