# Lavender clinical workspace redesign

## Scope
- Recompose the sign-in and sign-up experience for mobile around the first three references: compact branded header, large welcome area, bright rounded form sheet, pill inputs, prominent violet action, and a stable phone-safe layout.
- Recompose the authenticated mobile experience around the same visual language: pale lavender atmosphere, clear white work surfaces, larger touch targets, concise page headers, and the existing floating bottom navigation.
- Recompose the desktop Dashboard using the fourth reference: slim vertical taskbar, spacious central operational canvas, right-side study summary, interactive pipeline visualization, and compact research controls.
- Keep every existing route, authentication flow, database query, clinical label, safety message, study link, and audit record unchanged.

## Dashboard data and interaction
- Build charts only from the Dashboard’s current live study, candidate, consent, task, and audit results.
- Use the existing candidate stages for an interactive trend/composition graphic and study enrollment values for circular progress indicators.
- Add selection and hover/focus states for charts and study summaries without inventing historical values, outcomes, or performance metrics.
- Preserve explicit empty states when data is unavailable rather than showing decorative sample results.

## Visual system
- Keep Outfit headings and Figtree body text.
- Evolve the existing ivory-violet tokens toward the references with pale lavender backgrounds, bright white clinical surfaces, violet primary controls, restrained coral status accents, and soft gray typography.
- Use rounded but structured panels, soft ambient shadows, subtle reflections, and calm movement with reduced-motion support.
- Treat the uploaded screenshots only as design references; do not embed them in the product.

## Responsive behavior
- Desktop retains the vertical taskbar and gains the analytical multi-column Dashboard composition.
- Mobile retains the bottom dock and converts each page to a clean single-column application screen with no horizontal overflow.
- The sign-in screen is optimized independently for narrow screens while retaining the accessible poster/video fallback on larger displays.

## Validation
- Verify sign-in, sign-up, Dashboard, Tasks, Diseases, and Quantum Lab at 394×650 mobile and 1280×1800 desktop sizes.
- Confirm navigation remains fixed and usable, charts expose accessible labels, forms remain keyboard-operable, reduced motion is respected, and no console errors or overflow appear.