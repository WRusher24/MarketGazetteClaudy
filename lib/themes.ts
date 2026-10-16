export const THEME_IDS = ['light', 'dark', 'black', 'terminal'] as const;
export type ThemeName = (typeof THEME_IDS)[number];

export const isThemeName = (v: unknown): v is ThemeName => (THEME_IDS as readonly unknown[]).includes(v);
