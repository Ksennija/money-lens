# Title

The frontend uses Sass and one shared set of CSS design tokens taken from the design templates

## Context

The frontend (`/frontend`, Vite + React + TypeScript, pnpm) has only leftover Vite-template styling in `src/index.css` and `src/App.css` (purple accent, a fixed 1126px `#root`, hero and counter rules). No component uses those class names.

The real design is in six standalone HTML templates in `frontend/design/` (`index`, `signin`, `signup`, `overview`, `insights`, `transactions`). Each one repeats its own `:root` and hard-codes many values, so they already disagree:

- `--muted` is `#75817b` in `index`, `overview` and `insights`, and `#5d6a63` in `signin` and `signup`
- the page background is `--bg` in most files and `--canvas` in `transactions`
- the soft green is `--soft` in most files and `--green-soft` in `transactions`
- `--surface` and `--radius` exist only in `transactions`, the other files hard-code `white` and `16px`
- Inter is named as the font but is never loaded

Without one source of values, every new page copies and changes these numbers and the app drifts from the design. This feature adds Sass and one token source. The page restyling tickets build on it. It is frontend only: no backend change, no endpoint, no data change.

## Scope

- Add Sass to the frontend
- One shared token source: colors, font, type scale, radii, shadows, spacing and breakpoints
- Load the Inter font with the app
- Replace the leftover Vite-template styles with a minimal base stylesheet that uses the tokens
- Make the sign in and sign up templates use the same `--muted` value as the other templates

## Behaviour

- **Dependencies:** `sass` is a dev dependency of `frontend`. `@fontsource/inter` is a dependency. `vite.config.ts` does not change, because Vite compiles `.scss` when `sass` is installed
- **Location:** `frontend/src/styles/` with `_tokens.scss`, `_mixins.scss` and `main.scss`
- **Runtime tokens:** `_tokens.scss` defines CSS custom properties on `:root`. Components read them with `var(--name)`. Sass variables are used only where a CSS variable cannot be, which is breakpoints in media queries
- **One definition:** every value is written once, in `_tokens.scss`. Other files in `src/styles/` use `var(--name)` and never repeat a hex value
- **Colors:**

| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#202b27` | Text |
| `--muted` | `#75817b` | Secondary text |
| `--line` | `#e7ebe8` | Borders |
| `--bg` | `#f5f7f5` | Page background |
| `--surface` | `#ffffff` | Cards, inputs |
| `--green` | `#24483b` | Primary |
| `--green-hover` | `#1b362c` | Primary hover |
| `--soft` | `#e9f3ed` | Soft green background |
| `--positive` | `#27845b` | Positive amounts |
| `--red` | `#bd554c` | Negative amounts |
| `--red-soft` | `#fbeeec` | Error background |
| `--red-text` | `#8f3a33` | Error text |
| `--red-border` | `#e3a8a2` | Error border |
| `--focus-ring` | `#24483b55` | Focus outline color |

- **Font:** `--font-sans` is `"Inter", system-ui, -apple-system, "Segoe UI", sans-serif`. Base size 15px, line-height 1.5. Weights 400, 600, 700 and 800 are imported from `@fontsource/inter` in `main.scss`, so the font comes from the bundle and not from the user's machine
- **Type scale:** `--text-xs` to `--text-3xl` for 13, 14, 15, 16, 18, 20, 24 and 30px
- **Radii:** `--radius-sm` 9px (inputs, buttons), `--radius-md` 12px, `--radius-lg` 16px (cards), `--radius-pill` 99px
- **Shadows:** `--shadow-card` `0 12px 32px #17251d1f`, `--shadow-popover` `0 25px 65px #17251d22`, `--shadow-button` `0 7px 16px #24483b2b`
- **Spacing:** a 4px-based scale, `--space-1` (4px) to `--space-8` (32px)
- **Breakpoints:** Sass variables `$bp-sm` (430px) and `$bp-md` (700px), and a `breakpoint-down($bp)` mixin in `_mixins.scss`
- **Base styles:** `main.scss` holds a minimal reset and the `body`, heading and link styles. `body` uses `--font-sans`, `--ink` and `--bg`
- **Templates:** `signin.html` and `signup.html` change `--muted` from `#5d6a63` to `#75817b`. Nothing else in the templates changes

## Frontend changes

- `frontend/package.json` and `pnpm-lock.yaml`: add `sass` (dev) and `@fontsource/inter`
- `frontend/src/styles/_tokens.scss` (new): the tokens above
- `frontend/src/styles/_mixins.scss` (new): `breakpoint-down` and a `focus-ring` mixin that uses `--focus-ring`
- `frontend/src/styles/main.scss` (new): `@use` of the two partials, the Inter imports, reset and base styles
- `frontend/src/main.tsx`: imports `./styles/main.scss` instead of `./index.css`
- `frontend/src/App.tsx`: the `./App.css` import is removed
- `frontend/src/index.css` and `frontend/src/App.css`: deleted
- `frontend/design/signin.html` and `frontend/design/signup.html`: `--muted` value
- Jest needs no change. `jest.config.js` already maps `.scss` imports to `jest.styleMock.cjs`

## Acceptance criteria

- `pnpm --filter frontend build` succeeds
- `pnpm --filter frontend test` and `pnpm --filter frontend lint` pass
- In the running app, `:root` has every token from the tables above, and `body` uses Inter at 15px
- The app shows no purple accent and no fixed 1126px layout from the old template styles
- Inter renders on a machine that does not have it installed
- `index.css` and `App.css` no longer exist and nothing imports them
- `#5d6a63` no longer appears in `frontend/design/`
- Each color, radius and shadow value appears once in `_tokens.scss` and nowhere else in `src/styles/`

## Tests

No new unit tests, because the change is configuration and stylesheets with no logic.

- Existing frontend tests pass unchanged, which shows `.scss` imports work under Jest
- `pnpm --filter frontend build` shows the SCSS compiles and the font files are bundled
- Manual check with `pnpm dev`: devtools shows the tokens on `:root`, the computed `font-family` of `body` is Inter, and the network tab loads the Inter font files from the app
- `grep` for `#5d6a63` in `frontend/design/` finds nothing

## Assumptions

- The token values come from the templates. Where the templates disagree, the value used by most pages wins (`--muted`)
- The one-off greys and greens in the templates (for example `#53615a`, `#6b776f`, `#dce8e0`) are not tokens yet. They are added when a page needs them
- The spacing scale uses 4px steps. Odd template values (10px, 15px, 19px) are rounded when a page is restyled
- The templates keep their own `:root` blocks. They are design references, not part of the app bundle
- The app has no dark mode, as in the templates

## Out of scope

- Restyling pages and components to match the templates (one ticket per page)
- Replacing the inline `color: "crimson"` error text in `NavBar`, `LoginPage`, `RegistrationPage`, `OverviewPage`, `TransactionsPage`, `ImportPage` and `InsightsPage` with `var(--red)`
- Dark mode
- Moving the HTML templates onto the shared tokens, or renaming `--canvas` and `--green-soft` in `transactions.html`
- CSS Modules and a class naming convention
- Tokens for the focus ring width and offset (3px and 2px in the templates)

## Dependencies

- None. The frontend build, Jest and lint setup are in place

## Decisions beyond the ticket

These are not in the original ticket:

- `--muted` is `#75817b`, and the sign in and sign up templates are changed to match
- Inter is bundled with `@fontsource/inter` and not only named in the font stack
- The old `index.css` and `App.css` are deleted and not kept next to the new styles

## Build order

One commit each, with `pnpm test` and `pnpm build` green after every step:

1. Install `sass` and `@fontsource/inter`
2. Add `src/styles/` with the tokens, mixins and base styles, wire `main.scss` into `main.tsx`, and delete `index.css` and `App.css`
3. Change `--muted` in `signin.html` and `signup.html`
