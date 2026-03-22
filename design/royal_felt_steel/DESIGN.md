# Design System Specification: The High-Stakes Atelier

## 1. Overview & Creative North Star
**Creative North Star: "The Obsidian Lounge"**
This design system moves away from the cluttered, flashing-light aesthetic of traditional online casinos. Instead, it adopts the language of high-end, editorial luxury—think a private, dimly lit VIP poker room in Macau or London. 

The "Obsidain Lounge" aesthetic is defined by **Tonal Gravity**. We achieve a premium feel through intentional asymmetry, massive typographic contrast, and a "No-Line" philosophy. By layering surfaces rather than boxing them in, we create a digital environment that feels like a physical space where the stakes are high, and the focus is absolute. This is not a game; it is an experience.

---

## 2. Colors: The Palette of Prestige
The palette is rooted in deep, light-absorbing neutrals, punctuated by surgical strikes of high-chroma accents.

### Color Roles
- **Primary (`#3fff8b`):** "The Felt." Use this for active player states and primary action buttons. It represents the "Go" signal of the poker table.
- **Secondary (`#ffd709`):** "The Gold Standard." Reserved exclusively for VIP status, high-roller tiers, and premium achievements.
- **Tertiary/Error (`#ff7162` / `#ff716c`):** "The Suit." Used for Heart/Diamond representations and critical alerts.
- **Neutrals (`#0c0e11` to `#23262a`):** The "Obsidian" layers that build the room’s architecture.

### The "No-Line" Rule
**Borders are prohibited for sectioning.** To separate the navigation from the lobby, or the chat from the table, do not use a 1px line. Instead, shift the background color. 
*   *Example:* A `surface-container-high` (`#1d2024`) sidebar sitting against a `surface` (`#0c0e11`) background.

### Surface Hierarchy & Nesting
Treat the UI as a series of nested, physical trays.
1.  **Base Layer:** `surface` (`#0c0e11`) – The floor of the room.
2.  **Middle Layer:** `surface-container-low` (`#111417`) – Inset areas like the table felt background.
3.  **Top Layer:** `surface-container-highest` (`#23262a`) – Floating elements like player cards or action menus.

### The "Glass & Gradient" Rule
To prevent a "flat" feel, use a subtle 15% opacity gradient on `primary` buttons, transitioning from `primary` to `primary-container`. For floating overlays (e.g., player profile tooltips), use a backdrop-blur (12px-20px) with `surface-bright` at 60% opacity to create a "Smoked Glass" effect.

---

## 3. Typography: Editorial Authority
We utilize a dual-sans-serif approach to balance modern readability with technical precision.

- **The Display & Headline (Manrope):** Our "Voice." Used in large scales with tight letter-spacing (-0.02em) to create a commanding, editorial presence.
- **The Labels (Space Grotesk):** Our "Instrumentation." This monospaced-leaning font is used for chip counts, pot sizes, and card values. It conveys the precision of a high-stakes calculator.

**Hierarchy Strategy:**
- **Display-LG (3.5rem):** Use for "Big Win" moments or tournament titles.
- **Headline-SM (1.5rem):** Used for table names and section headers.
- **Label-MD (0.75rem):** Used for all data-heavy metrics to ensure maximum legibility at small sizes.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are too "web-standard." We use **Ambient Depth**.

- **The Layering Principle:** Instead of a shadow, place a `surface-container-lowest` card inside a `surface-container-highest` container to create a "carved out" effect.
- **Ambient Shadows:** For floating modals, use a massive spread (40px) with only 6% opacity using a tint of `surface-tint` (`#3fff8b`). This mimics the soft glow of a table lamp reflecting off a dark surface.
- **The "Ghost Border" Fallback:** If a player’s hand must be separated from a similar background color, use the `outline-variant` (`#46484b`) at **15% opacity**. It should be felt, not seen.

---

## 5. Components: The High-Stakes Toolkit

### Buttons
- **Primary Action:** Roundedness `sm` (0.125rem). Solid `primary` background. No border. Text in `on-primary` (`#005d2c`).
- **Secondary (Fold/Check):** Background `surface-container-highest`. Ghost border at 20% opacity.
- **VIP Action:** A subtle linear gradient from `secondary` to `secondary_dim`.

### Cards & Lists
**Strict Rule:** No dividers. Separate players in a lobby using a `1.1rem` (spacing-5) vertical gap and a background shift to `surface-container-low` on hover.

### Card Representations (The Deck)
- **The Card Face:** `inverse-surface` (`#f9f9fd`) with `md` (0.375rem) corner radius. 
- **The Suits:** Use `tertiary` for Reds and `surface-container-lowest` for Blacks. Avoid pure black for suits; it disappears in the dark theme.

### Poker Chips
Never use flat circles. Chips should utilize the `secondary` (gold) or `primary` (green) tokens with a `surface-container-highest` inner ring to provide a sense of weight and tactile "clink."

### Input Fields
- **Default State:** `surface-container-highest` background. No border.
- **Focus State:** A 1px "Ghost Border" using the `primary` token at 40% opacity. The glow should be internal, not an external halo.

---

## 6. Do's and Don'ts

### Do:
- **Use Asymmetry:** Place the pot total off-center or use oversized "Display" type that bleeds slightly off the grid to feel like a premium magazine.
- **Embrace the Dark:** Let the `surface` (`#0c0e11`) breathe. Negative space in this system represents "Quiet Luxury."
- **Use Space Grotesk for Numbers:** It ensures that "8" and "B" or "0" and "O" are never confused during a high-speed hand.

### Don't:
- **Don't use 100% white:** Use `on-surface` (`#f9f9fd`) which is slightly tinted to reduce eye strain during long sessions.
- **Don't use standard "Card" shadows:** Avoid the "Material Design" look. If it looks like a standard dashboard, it has failed.
- **Don't use high-contrast dividers:** If you need a line, use a background color change instead. Lines are the "clutter" of the digital world.

### Accessibility Note:
While we use a dark, moody theme, ensure all `label-sm` text on `surface-container` tiers maintains at least a 4.5:1 contrast ratio. Use `on-surface-variant` for secondary data to maintain the hierarchy without sacrificing readability.