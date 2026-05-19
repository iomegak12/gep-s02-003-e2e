// Material 3 color tokens for Nexus SCM.
// Light palette is derived from front-end/docs/ui-artifacts/DESIGN.md.
// Dark palette inverts surfaces and uses the "obsidian" base described there.

export const lightColors = {
  primary: '#1d20e9',
  onPrimary: '#ffffff',
  primaryContainer: '#3e46ff',
  onPrimaryContainer: '#dfdeff',
  secondary: '#5d5e62',
  onSecondary: '#ffffff',
  secondaryContainer: '#dfdfe3',
  onSecondaryContainer: '#1a1c1f',
  tertiary: '#8d2800',
  onTertiary: '#ffffff',
  tertiaryContainer: '#ffd8cd',
  onTertiaryContainer: '#3a0b00',
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  background: '#fbf8ff',
  onBackground: '#1a1b25',
  surface: '#fbf8ff',
  onSurface: '#1a1b25',
  surfaceVariant: '#e3e1ef',
  onSurfaceVariant: '#454556',
  outline: '#767588',
  outlineVariant: '#c6c4d9',
  inverseSurface: '#2f2f3a',
  inverseOnSurface: '#f1effe',
  inversePrimary: '#bfc2ff',
  elevation: {
    level0: 'transparent',
    level1: '#f5f2ff',
    level2: '#efecfb',
    level3: '#e9e6f5',
    level4: '#e3e1ef',
    level5: '#dad8e7',
  },
  surfaceDisabled: 'rgba(26,27,37,0.12)',
  onSurfaceDisabled: 'rgba(26,27,37,0.38)',
  backdrop: 'rgba(47,47,58,0.4)',
};

export const darkColors = {
  primary: '#bfc2ff',
  onPrimary: '#01006e',
  primaryContainer: '#1213e4',
  onPrimaryContainer: '#dfdeff',
  secondary: '#c6c6ca',
  onSecondary: '#2f3034',
  secondaryContainer: '#45474a',
  onSecondaryContainer: '#e2e2e6',
  tertiary: '#ffb59e',
  onTertiary: '#561700',
  tertiaryContainer: '#842500',
  onTertiaryContainer: '#ffdbd0',
  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',
  background: '#0B0C0E',
  onBackground: '#e3e1ef',
  surface: '#0B0C0E',
  onSurface: '#e3e1ef',
  surfaceVariant: '#454556',
  onSurfaceVariant: '#c6c4d9',
  outline: '#8f8fa0',
  outlineVariant: '#454556',
  inverseSurface: '#e3e1ef',
  inverseOnSurface: '#2f2f3a',
  inversePrimary: '#1d20e9',
  elevation: {
    level0: 'transparent',
    level1: '#161821',
    level2: '#1d1f29',
    level3: '#23252f',
    level4: '#262831',
    level5: '#2a2c36',
  },
  surfaceDisabled: 'rgba(227,225,239,0.12)',
  onSurfaceDisabled: 'rgba(227,225,239,0.38)',
  backdrop: 'rgba(0,0,0,0.5)',
};

// Semantic status palette (same in light + dark; high-contrast intentionally).
export const statusColors = {
  active: '#10B981',
  pending: '#F59E0B',
  error: '#EF4444',
  fulfilled: '#14B8A6',
  submitted: '#3E46FF',
  inactive: '#6B7280',
  healthOk: '#10B981',
  healthSlow: '#F59E0B',
  healthDown: '#EF4444',
};

export const supplierStatusColor = {
  PENDING_APPROVAL: statusColors.pending,
  ACTIVE: statusColors.active,
  INACTIVE: statusColors.inactive,
  BLACKLISTED: statusColors.error,
};

export const poStatusColor = {
  DRAFT: statusColors.inactive,
  SUBMITTED: statusColors.submitted,
  APPROVED: statusColors.active,
  REJECTED: statusColors.error,
  FULFILLED: statusColors.fulfilled,
  CLOSED: '#374151',
  CANCELLED: statusColors.error,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 2,
  md: 4,
  lg: 8,
  xl: 12,
  pill: 9999,
};
