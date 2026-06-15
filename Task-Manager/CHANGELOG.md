# Changelog

All notable changes to the Productivity Reminder extension will be documented here.

---

## 2026-01-05

### Added
- Frequency selector panel
  - Once
  - Daily
  - Weekly
  - Monthly
  - Custom every N days
- Delete task button 
- Dark / Light mode toggle
- Strikethrough style for completed tasks
- Safe theme persistence using chrome.storage
- Snooze support (background logic already existing)

### Changed
- Updated popup UI styling while preserving original layout
- Improved readability in light mode (beige text visible now)
- Task title color unified for both themes
- Frequency labels now readable
- Better task rendering structure

### Fixed
- “Cannot read properties of null (classList/value)” popup errors
- Tasks not rendering issue
- Frequency panel click not working
- Incorrect theme text invisibility in light mode
- Tasks not refreshing after add/delete/toggle

### Technical
- Popup.js cleaned and validated
- CSS variables organized
- Added scroll bounds to popup window
- Ensured compatibility with Manifest V3 service worker
