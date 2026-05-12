# Horizon Design Tokens v1

Status: Approved baseline token sheet for implementation.
Scope: Global brand, semantic UI tokens, typography, component states.

## 1) Brand Core

| Token | Value |
|---|---|
| `brand.ink` | `#414141` |
| `brand.indigo` | `#5858CC` |
| `brand.tangerine` | `#EC5B13` |
| `brand.parchment` | `#FAEDCD` |

## 2) Neutrals

| Token | Value |
|---|---|
| `neutral.0` | `#FFFFFF` |
| `neutral.50` | `#FAF7EF` |
| `neutral.100` | `#FAEDCD` |
| `neutral.200` | `#F1E2C2` |
| `neutral.300` | `#DCCFB2` |
| `neutral.500` | `#8A826F` |
| `neutral.700` | `#5A544A` |
| `neutral.900` | `#414141` |

## 3) Semantic (Light)

| Token | Value |
|---|---|
| `bg.canvas` | `#FAEDCD` |
| `bg.surface` | `#FFFFFF` |
| `bg.surface-muted` | `#FAF7EF` |
| `text.primary` | `#414141` |
| `text.secondary` | `#5A544A` |
| `text.inverse` | `#FFFFFF` |
| `border.default` | `#DCCFB2` |
| `border.strong` | `#414141` |
| `ring.focus` | `#5858CC` |

## 4) Semantic (Dark)

| Token | Value |
|---|---|
| `bg.canvas` | `#1F1F24` |
| `bg.surface` | `#2A2A31` |
| `bg.surface-muted` | `#34343D` |
| `text.primary` | `#F7F4EC` |
| `text.secondary` | `#D6D1C4` |
| `text.inverse` | `#1F1F24` |
| `border.default` | `#4A4A55` |
| `border.strong` | `#FAEDCD` |
| `ring.focus` | `#7A7AE6` |

## 5) Intent

| Token | Light | Dark |
|---|---|---|
| `intent.info` | `#5858CC` | `#7A7AE6` |
| `intent.success` | `#2E9B5F` | `#52B97F` |
| `intent.warning` | `#EC5B13` | `#FF8A52` |
| `intent.danger` | `#C63A2A` | `#D65747` |

## 6) Component Tokens

| Token | Value |
|---|---|
| `button.primary.bg` | `#414141` |
| `button.primary.fg` | `#FFFFFF` |
| `button.accent.bg` | `#5858CC` |
| `button.accent.fg` | `#FFFFFF` |
| `button.cta.bg` | `#EC5B13` |
| `button.cta.fg` | `#FFFFFF` |
| `input.bg` | `#FFFFFF` |
| `input.border` | `#DCCFB2` |
| `input.focusBorder` | `#5858CC` |
| `card.bg` | `#FFFFFF` |
| `card.border` | `#E8DABC` |
| `card.shadow` | `0 8px 24px rgba(65,65,65,0.08)` |
| `dock.bg` | `rgba(255,255,255,0.82)` |
| `dock.border` | `#DCCFB2` |
| `dock.item.default` | `#5A544A` |
| `dock.item.active` | `#5858CC` |
| `dock.item.hoverBg` | `#F1E2C2` |

## 7) Typography

| Role | Font |
|---|---|
| `font.display` | `Space Grotesk` |
| `font.body` | `Inter` |
| `font.mono` | `IBM Plex Mono` |

Scale guidance:
- `h1`: `56/60`, `700`
- `h2`: `40/46`, `700`
- `h3`: `28/34`, `650`
- `body.lg`: `18/28`, `400`
- `body`: `16/24`, `400`
- `ui`: `14/20`, `500`
- `caption`: `12/16`, `500`

## 8) Shape + Motion

- Radii: `8px`, `12px`, `16px`, `20px`
- Spacing scale: `4, 8, 12, 16, 24, 32, 40, 48, 64`
- Motion: `120ms`, `180ms`, `280ms` with `cubic-bezier(0.2, 0.8, 0.2, 1)`

## 9) Accessibility Rules

- Body text contrast: `>= 4.5:1`
- Large text/UI contrast: `>= 3:1`
- Avoid small `#EC5B13` text on `#FAEDCD`
- Default long-form text color: `#414141`

