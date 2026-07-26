# Changelog

This package uses Changesets for release notes.

## Unreleased

## 1.0.0 - 2026-07-27

### Fixed

- Align package installation and import documentation with
  `a11y-tabs-widget`.
- Resolve addon roots that use `[data-a11y-tabs]` without requiring the
  `.a11y-tabs` class.
- Complete keyboard navigation and focus restoration for the generated
  overflow menu.
- Abort stale loader requests, prevent duplicate error announcements, and keep
  asynchronous unsaved-change decisions tied to their original destination.
- Remove leading punctuation from hidden accessible badge suffixes.

### Added

- Direct behavioral tests for analytics, badges, history, loader, overflow,
  stepper, and unsaved-change recovery.
- Local CI checks for tests, types, metadata, builds, documentation mirrors,
  and npm package contents.
