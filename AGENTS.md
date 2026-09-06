# Project notes

- User-authorized workflow: after each logically complete change, run the relevant checks, automatically commit and push it, wait for GitHub Pages deployment, and verify the live version. Do not stop at local changes or ask again for routine commit/push approval. Keep unrelated files out of commits; report any test, authentication, push, or deployment blocker.

- The app is a standalone `index.html` with inline CSS and JavaScript; no package manager or build step is configured.
- Product name: Dot. Entries have only two states: not done and done. Done means the action was taken, not that it succeeded. The user describes the outcome in their own words.
- Plans and direct records share the same list. Keep button-first input, row-tap result editing, and sequential entry.
- Keep record rows compact: 12px vertical padding, about 48px for a single-line entry. Preserve clear text and touch targets rather than adding spacious card-like rows.
- Open the input and focus it synchronously within the user's click handler so iOS can summon the keyboard. Do not defer focus with timers or requestAnimationFrame. Use preventScroll and keep visualViewport positioning; desktop focus tests do not prove iPhone keyboard behavior.
- Preserve the `wins.v1` localStorage key for existing data compatibility.
- Automatically move past-date entries with `done === false` to the device's current local date, preserving IDs, timestamps, and notes. Remove them from their old date; never move done entries or future plans. Check on startup, local midnight, focus/pageshow/visibility return, and before submission. Closed or suspended pages catch up when resumed; do not promise background execution at midnight. Preserve open drafts and historical browsing during rollover.
- Verification: `node workbench/tmp/check-ui.mjs` runs a dependency-free DOM-stub smoke test. It does not verify browser layout or iOS keyboard behavior. Also run `git diff --check`.
- Local preview: `node workbench/tmp/serve.mjs`. Verify keyboard and visual viewport behavior on an actual iPhone.
- Production: https://olayaz.github.io/dot/ is GitHub Pages, built from the root of `main`. Pushes trigger the `pages-build-deployment` workflow. When asked to publish for iPhone, push the approved commits, wait for this workflow, and verify the live HTML; local commits and localhost previews do not update production. Do not clear browser site data to refresh the app, since records are in localStorage.
- Browser checks: with the preview server running, use `node workbench/tmp/check-browser.mjs <path-to-playwright/index.mjs>`. Tested with Playwright 1.55.1 and installed Google Chrome. The script uses an isolated browser context and writes screenshots under `workbench/tmp`.
- Visual direction: white canvas, citron primary actions, blue filled dots for actions taken, open circles for plans. Favor clear rows and subtle separators over pale cards; keep records legible rather than crossing them out or fading them.
