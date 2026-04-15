# Changelog

All notable changes to frontend are documented in this file.

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
