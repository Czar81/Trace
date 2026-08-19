export interface ThemeColors {
  bg: string;
  cardBg: string;
  white: string;
  secondaryText: string;
  divider: string;
  red: string;
  green: string;
  greenDeep: string;
  blue: string;
  modalSheet: string;
  progressTrack: string;
  cardHighlight: string;
  perforation: string;
}

export type ThemeId =
  | 'midnight'
  | 'rose'
  | 'paper'
  | 'graphite'
  | 'indigo'
  | 'perla'
  | 'lavanda'
  | 'arena';

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  isLight: boolean;
  colors: ThemeColors;
}

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  midnight: {
    id: 'midnight',
    name: 'Medianoche',
    isLight: false,
    colors: {
      bg: '#081C27',
      cardBg: '#1E3846',
      white: '#FFFFFF',
      secondaryText: '#A6B9C7',
      divider: '#142E3D',
      red: '#E56B5D',
      green: '#9FE3B0',
      greenDeep: '#5FAE79',
      blue: '#52A8D9',
      modalSheet: '#0d2e42',
      progressTrack: '#3A5564',
      cardHighlight: 'rgba(159, 227, 176, 0.06)',
      perforation: 'rgba(166, 185, 199, 0.35)',
    },
  },
  rose: {
    id: 'rose',
    name: 'Cuarzo Rosa',
    isLight: true,
    colors: {
      bg: '#FBF3F4',
      cardBg: '#FFFFFF',
      white: '#2B1A1D',
      secondaryText: '#8C6B70',
      divider: '#F0DCE0',
      red: '#C6473A',
      green: '#D9738A',
      greenDeep: '#B85C71',
      blue: '#E8A0AE',
      modalSheet: '#FFFFFF',
      progressTrack: '#F0DCE0',
      cardHighlight: 'rgba(217, 115, 138, 0.08)',
      perforation: 'rgba(140, 107, 112, 0.25)',
    },
  },
  paper: {
    id: 'paper',
    name: 'Papel',
    isLight: true,
    colors: {
      bg: '#F3F5F1',
      cardBg: '#FFFFFF',
      white: '#16241D',
      secondaryText: '#5E7568',
      divider: '#E1E7E0',
      red: '#C6473A',
      green: '#3E8F6C',
      greenDeep: '#2F7256',
      blue: '#4C8FE0',
      modalSheet: '#FFFFFF',
      progressTrack: '#E1E7E0',
      cardHighlight: 'rgba(62, 143, 108, 0.08)',
      perforation: 'rgba(94, 117, 104, 0.25)',
    },
  },
  graphite: {
    id: 'graphite',
    name: 'Grafito',
    isLight: false,
    colors: {
      bg: '#1B1F22',
      cardBg: '#262B2F',
      white: '#F5F6F7',
      secondaryText: '#A7AEB3',
      divider: '#2F353A',
      red: '#E56B5D',
      green: '#E3B341',
      greenDeep: '#C99A34',
      blue: '#6FA8DC',
      modalSheet: '#202427',
      progressTrack: '#3A4145',
      cardHighlight: 'rgba(227, 179, 65, 0.06)',
      perforation: 'rgba(167, 174, 179, 0.35)',
    },
  },
  indigo: {
    id: 'indigo',
    name: 'Índigo',
    isLight: false,
    colors: {
      bg: '#12102B',
      cardBg: '#201C42',
      white: '#F1EFFB',
      secondaryText: '#B3AAD9',
      divider: '#241F52',
      red: '#E56B5D',
      green: '#8C7CF0',
      greenDeep: '#6F5FD1',
      blue: '#4FD1C5',
      modalSheet: '#1A1740',
      progressTrack: '#332C63',
      cardHighlight: 'rgba(140, 124, 240, 0.08)',
      perforation: 'rgba(179, 170, 217, 0.35)',
    },
  },
  perla: {
    id: 'perla',
    name: 'Perla',
    isLight: true,
    colors: {
      bg: '#F4F5F6',
      cardBg: '#FFFFFF',
      white: '#1C2226',
      secondaryText: '#6B7680',
      divider: '#E3E7EA',
      red: '#C6473A',
      green: '#3E9B8F',
      greenDeep: '#2F7C72',
      blue: '#5A8FC2',
      modalSheet: '#FFFFFF',
      progressTrack: '#E3E7EA',
      cardHighlight: 'rgba(62, 155, 143, 0.08)',
      perforation: 'rgba(107, 118, 128, 0.25)',
    },
  },
  lavanda: {
    id: 'lavanda',
    name: 'Lavanda',
    isLight: true,
    colors: {
      bg: '#F6F4FB',
      cardBg: '#FFFFFF',
      white: '#241B33',
      secondaryText: '#7C6F96',
      divider: '#E7E1F5',
      red: '#C6473A',
      green: '#8465D9',
      greenDeep: '#6B4FC0',
      blue: '#4FB0A5',
      modalSheet: '#FFFFFF',
      progressTrack: '#E7E1F5',
      cardHighlight: 'rgba(132, 101, 217, 0.08)',
      perforation: 'rgba(124, 111, 150, 0.25)',
    },
  },
  arena: {
    id: 'arena',
    name: 'Arena',
    isLight: true,
    colors: {
      bg: '#F0ECE4',
      cardBg: '#FFFFFF',
      white: '#2A231A',
      secondaryText: '#7C7160',
      divider: '#E2DCCE',
      red: '#C6473A',
      green: '#6B8F71',
      greenDeep: '#557459',
      blue: '#C97B52',
      modalSheet: '#FFFFFF',
      progressTrack: '#E2DCCE',
      cardHighlight: 'rgba(107, 143, 113, 0.08)',
      perforation: 'rgba(124, 113, 96, 0.25)',
    },
  },
};

export const THEME_LIST: ThemeDefinition[] = [
  THEMES.midnight,
  THEMES.rose,
  THEMES.paper,
  THEMES.graphite,
  THEMES.indigo,
  THEMES.perla,
  THEMES.lavanda,
  THEMES.arena,
];

export const DEFAULT_THEME_ID: ThemeId = 'midnight';
