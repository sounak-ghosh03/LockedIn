// ─── Color Palette ────────────────────────────────────────────────────────────
export const colors = {
  background: "#0D0D0D",
  surface: "#1A1A1A",
  surfaceAlt: "#242424",
  surfaceHigh: "#2E2E2E",
  surfaceElevated: "#303030",
  accent: "#FF4D00",
  accentSoft: "#FF6B35",
  accentMid: "rgba(255, 77, 0, 0.15)",
  accentGlow: "rgba(255, 77, 0, 0.20)",
  accentDim: "rgba(255, 77, 0, 0.10)",
  success: "#00D084",
  successDim: "rgba(0, 208, 132, 0.15)",
  warning: "#FFB800",
  warningDim: "rgba(255, 184, 0, 0.15)",
  error: "#FF3B30",
  errorDim: "rgba(255, 59, 48, 0.15)",
  info: "#007AFF",
  text: "#FFFFFF",
  textMuted: "#888888",
  textFaint: "#444444",
  border: "#2A2A2A",
  borderAccent: "rgba(255, 77, 0, 0.30)",
  overlay: "rgba(0, 0, 0, 0.60)",
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────
export const fonts = {
  heading: "Outfit_700Bold",
  headingMed: "Outfit_600SemiBold",
  body: "Inter_400Regular",
  bodyMed: "Inter_500Medium",
  bodySemi: "Inter_600SemiBold",
  mono: "SpaceMono-Regular",
} as const;

// ─── Font Sizes ───────────────────────────────────────────────────────────────
export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  "2xl": 28,
  "3xl": 34,
  "4xl": 42,
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 56,
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────
export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const;

// ─── Shadows / Glow ──────────────────────────────────────────────────────────
export const shadows = {
  accentGlow: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 10,
  },
  subtle: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

// ─── Tab bar config ──────────────────────────────────────────────────────────
export const tabBar = {
  height: 64,
  iconSize: 24,
} as const;
