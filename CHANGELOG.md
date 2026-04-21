# Changelog

All notable changes to frontend are documented in this file.

## 2026-04-21

### Added
- Simulation APIs/types integration for scenario lifecycle, result envelopes, and simulation definition/lab endpoints.
- New Simulation Lab route (`/simulations`) with studio navigation integration.
- Simulation Lab scenario presets expanded with `process_redesign` and `funnel_experiment`.
- Simulation Lab scenario presets further expanded with `design_critique` and `finance_forecast`.
- Local `qrcode` module type declaration for typed QR generation usage.

### Changed
- Playground telemetry flow now supports fallback mentor nudge UX (toast + message refetch when websocket delivery is delayed).
- Dashboard and studio task/playground surfaces received targeted stability and contract-alignment updates.

### Notes
- Captures commit batches on `v0.2` for simulation lab rollout, API contract alignment, and nudge delivery resiliency.
- Validation in this batch relied on scoped diff/type review; no full frontend test suite was run during changelog update.

## 2026-04-15

### Added
- New Plans V2 workspace route: `/plans/v2` with single-flow, action-first information architecture.
- Sticky workspace header and sticky right rail with viewport-aware behavior.
- Compact focus console with Pomodoro controls and in-panel Lo-fi playback controls.
- Project verification UX: verification sheet, GitHub repository hooks, and verification API integration.

### Changed
- Plans experience refactored away from tab-heavy flows into contextual queue + schedule management.
- Profile menu, playground, and mirror surfaces aligned to verification and workflow updates.
- Schedule manager and task queue interactions tightened for immediate task actioning.

### Notes
- Merged from PR `#4` into `v0.2`.
- Validation included targeted lint checks on modified plans/mirror/layout components.

## 2026-04-14

### Added
- New dashboard intelligence modules: `DashboardWidgets`, `MentorInbox`, and `SkillRadarChart`.

### Changed
- Dashboard layout refactor for mission/intelligence presentation.
- Competency brain map and profile menu UX updates.
- Playground mentor assistant and verification flow alignment updates.

### Notes
- Validation run included targeted lint on touched dashboard/playground/intelligence files.
