# Reflective taskbar and clinical disease workspace

## What will change
- Rebuild the signed-in navigation as a slim, floating vertical taskbar with icon-first controls, an expanded detail rail on desktop, and an accessible compact version on mobile.
- Add reflective liquid-glass edges, gentle active-item motion, and a calm fixed optical background so content appears to float while scrolling.
- Preserve every route, label, authentication action, and data workflow.
- Refine disease browsing and individual disease pages into organ-led clinical workspaces using the existing scientific visualizations, with the image remaining clearly illustrative.

## Interaction and accessibility
- Keep labels and tooltips available in compact navigation; maintain keyboard focus and minimum touch targets.
- Use restrained movement and disable decorative motion when reduced motion is requested.
- Prevent horizontal overflow on narrow screens and keep the mobile taskbar always reachable.

## Technical details
- Update the shared authenticated shell and shared glass/motion tokens rather than adding page-specific styling.
- Reuse existing disease artwork and provenance/safety wording; no uploaded reference screenshot will be embedded.
- Verify signed-in dashboard and disease routes at desktop and mobile widths.
