// Scales shared by screens and components. Off-scale values stay literal where
// they're used (a one-off 14 or 28 isn't worth a token).
export const SPACING = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;
export const FONT_SIZE = { xs: 12, sm: 13, md: 14, base: 15, lg: 16, xl: 18, xxl: 20 } as const;
export const RADIUS = { sm: 10, md: 12, lg: 14, xl: 16, pill: 20, sheet: 24 } as const;
