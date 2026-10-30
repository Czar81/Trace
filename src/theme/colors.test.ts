import { THEME_LIST, THEMES, DEFAULT_THEME_ID } from './colors';

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

describe('themes', () => {
  it('defines 8 themes with the same non-empty role set as Medianoche', () => {
    expect(THEME_LIST).toHaveLength(8);
    const roles = Object.keys(THEMES[DEFAULT_THEME_ID].colors).sort();
    for (const t of THEME_LIST) {
      expect(Object.keys(t.colors).sort()).toEqual(roles);
      for (const v of Object.values(t.colors)) expect(v).toBeTruthy();
    }
  });

  it.each(THEME_LIST.filter((t) => t.isLight).map((t) => [t.id, t] as const))(
    '%s: destructive and secondary text meet 4.5:1 on bg and cardBg',
    (_id, t) => {
      for (const fg of ['red', 'secondaryText', 'white'] as const) {
        for (const bg of ['bg', 'cardBg'] as const) {
          expect(ratio(t.colors[fg], t.colors[bg])).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  );

  it.each(THEME_LIST.map((t) => [t.id, t] as const))(
    '%s: text on the accent and accent/blue/red/warn as text meet 4.5:1',
    (_id, t) => {
      expect(ratio(t.colors.onAccent, t.colors.green)).toBeGreaterThanOrEqual(4.5);
      for (const fg of ['green', 'blue', 'red', 'warn'] as const) {
        for (const bg of ['bg', 'cardBg'] as const) {
          expect(ratio(t.colors[fg], t.colors[bg])).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  );
});
