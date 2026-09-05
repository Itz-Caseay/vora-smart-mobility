/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#10182B',
    tint: '#B7F34A',

    // Core surfaces
    background: '#F5F7FA',
    foreground: '#10182B',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#10182B',

    // Primary action color (buttons, links, active states)
    primary: '#B7F34A',
    primaryForeground: '#10182B',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#E8EDF3',
    secondaryForeground: '#10182B',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#E8EDF3',
    mutedForeground: '#687386',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#EAF7C8',
    accentForeground: '#3D5C12',

    // Destructive actions (delete, error states)
    destructive: '#E24B4B',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#DCE2EA',
    input: '#DCE2EA',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
