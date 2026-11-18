# Design System

<!-- impeccable:design-schema 1 -->

## Visual World: Tortuga / Transit Signage & Telemetry

Inspired by the Impeccable exhibit [db5c49a920cda197](https://impeccable.style/gallery/view/db5c49a920cda197/): high-contrast, authoritative, industrial transit-signage and telemetry board aesthetic. Built on tactile bone paper ground, deep enamel cobalt bands, heavy charcoal ink lines, and signal safety-yellow highlights.

## Color Tokens

- `--ground`: `#F2F3EF` (tactile bone paper background)
- `--ink`: `#14161A` (deep industrial black)
- `--blue`: `#1B3A8C` (enamel cobalt rail blue)
- `--yellow`: `#F4B400` (signal / safety yellow for actions, hot tags, and focus rings)
- `--grey`: `#8C9096` (station steel grey)
- `--white`: `#FFFFFF`
- `--on-blue`: `#DCE3F5` (secondary text on cobalt enamel bands)

## Typography

- **Primary Sans**: `"Overpass", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  - Heavy weights (`800` and `900`) for headings, station marks, and action buttons.
  - Tracking: `0.06em` to `0.12em` uppercase for labels, controls, and category codes.
- **Monospace**: `"Overpass Mono", ui-monospace, "SF Mono", Menlo, monospace`
  - Tabular numerals (`font-variant-numeric: tabular-nums;`)
  - Code, metrics, coordinates, email addresses, timestamps, and telemetry readouts.

## Key Component Patterns

1. **Enamel Band Header**: Deep cobalt background (`#1B3A8C`), white type, 2px border buttons with yellow hover state.
2. **Station Telemetry Board**: Deep ink background (`#14161A`), glowing signal-yellow metrics, split-flap / station monitor grid indicators.
3. **Transit Route Table**: Bold 3px ink border (`border-bottom: 3px solid #14161A`), 1px row dividers, monospace tabular data, solid 2px outline hot tags.
4. **Action Buttons (`.btn`)**: Uppercase, bold (`font-weight: 800`), 2px solid border, instant yellow background shift on hover.
5. **Interactive Copilot Terminal**: Structured station query panel with yellow keyword highlighting, high-contrast readable inputs, and crisp prompt chips.
