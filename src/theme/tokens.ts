export interface ThemeColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryMuted: string;
  positive: string;
  positiveMuted: string;
  negative: string;
  negativeMuted: string;
  warning: string;
  focus: string;
  scrim: string;
}

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
}

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
} as const;

export type TypographyVariant = keyof typeof typography;

const light: ThemeColors = {
  background: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF1F4',
  border: '#DCE1E7',
  text: '#101828',
  textMuted: '#5B6577',
  textInverse: '#FFFFFF',
  primary: '#0F766E',
  primaryMuted: '#CCEDE9',
  positive: '#15803D',
  positiveMuted: '#DCFCE7',
  negative: '#B42318',
  negativeMuted: '#FEE4E2',
  warning: '#B54708',
  focus: '#2563EB',
  scrim: 'rgba(16, 24, 40, 0.45)',
};

const dark: ThemeColors = {
  background: '#0B1015',
  surface: '#151C24',
  surfaceMuted: '#1E2731',
  border: '#2B3642',
  text: '#F2F4F7',
  textMuted: '#98A2B3',
  textInverse: '#0B1015',
  primary: '#2DD4BF',
  primaryMuted: '#123B37',
  positive: '#4ADE80',
  positiveMuted: '#123222',
  negative: '#F97066',
  negativeMuted: '#3A1A18',
  warning: '#FDB022',
  focus: '#60A5FA',
  scrim: 'rgba(0, 0, 0, 0.6)',
};

export const lightTheme: Theme = { dark: false, colors: light, spacing, radius, typography };
export const darkTheme: Theme = { dark: true, colors: dark, spacing, radius, typography };
