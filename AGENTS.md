# Project notes

- The app is a standalone `index.html` with inline CSS and JavaScript; no package manager or build step is configured.
- Product name: Dot. Entries have only two states: not done and done. Done means the action was taken, not that it succeeded. The user describes the outcome in their own words.
- Plans and direct records share the same list. Keep button-first input, row-tap result editing, and sequential entry.
- Preserve the `wins.v1` localStorage key for existing data compatibility.
- Verification: `node workbench/tmp/check-ui.mjs` runs a dependency-free DOM-stub smoke test. It does not verify browser layout or iOS keyboard behavior. Also run `git diff --check`.
- Local preview: `node workbench/tmp/serve.mjs`. Verify keyboard and visual viewport behavior on an actual iPhone.
