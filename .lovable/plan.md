# Shared liquid-glass foundations

## Scope for this run
- Add `src/styles/tokens.css` with the supplied violet, semantic, radius, timing, and typography tokens.
- Add `src/styles/glass.css` with reusable glass tiers, field, sheen-ready, focus, and data-surface utilities.
- Add `src/styles/motion.css` with only Rise, Lift, Press, and Morph motion primitives plus reduced-motion overrides.
- Import the three files once from the existing global stylesheet.
- Remove the external font stylesheet from the root metadata; use the requested local/system fallbacks because no font binaries are currently vendored and this run permits only three new source files.

## Boundaries
- No page markup, routes, content, data, authentication, or business logic changes.
- No new dependencies or per-page CSS.
- Do not add the pointer-tracking script in this run because it would exceed the exact three-new-file limit; `.glass--react` will include the CSS contract for a later shared-shell run.
- Use only the standard `backdrop-filter`; the production CSS compiler supplies browser prefixes safely.

## Validation
- Confirm the three files exist and are imported once.
- Confirm the app renders without stylesheet errors and reduced-motion rules are present.
