# Dashboard liquid-glass restyle

## Scope for this run
- Restyle only the authenticated Research operations Dashboard using the existing shared tokens, glass tiers, and four motion primitives.
- Keep the title and safety notice prominent, convert the four live metrics to high-contrast glass metric tiles, and remove the duplicated metric grid from the research-intelligence panel.
- Recompose the existing research map into a cleaner operational visual without changing its labels or adding navigation behavior.
- Replace per-status progress tracks with one segmented pipeline bar using the same live counts.
- Restyle existing study links as elevated study cards with enrollment rings and protocol footers.
- Present recent audited actions on an opaque, tabular data surface for maximum readability.

## Visual direction
- Preserve the approved violet/white token system; use the existing aqua token only as a restrained cool-lab accent rather than introducing a new blue palette.
- Use soft ambient gradients, frosted panel depth, rounded shared radii, and calm transitions while avoiding low contrast, harsh shadows, heavy textures, and nested glass.
- Keep the safety disclaimer as the page’s highest-contrast block.

## Boundaries
- No route, query, state, API, authentication, label, number, disclaimer, or audit-string changes.
- No new dependencies, global shell changes, command palette, dock, or other page edits.
- Reuse the existing shared style files; add no page-specific stylesheet.

## Validation
- Verify the authenticated Dashboard with live workspace data at desktop and 640px mobile widths.
- Confirm no horizontal overflow or console errors, visible focus treatment, opaque audit data, and reduced-motion compatibility.
