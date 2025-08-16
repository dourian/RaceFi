export const colors = {
  background: "#f7f7fa",
  surface: "#ffffff",
  text: "#242428",
  textMuted: "#9095AA",
  accent: "#fc5200", // Strava-like orange (highlights)
  accentStrong: "#e64a00", // Darker for primary buttons
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const borderRadius = {
  none: 0,
  sm: 2,
  md: 4,
  lg: 8,
  xl: 16,
};

export const typography = {
  title: { fontSize: 22, fontWeight: "800" as const, color: colors.text },
  h2: { fontSize: 18, fontWeight: "700" as const, color: colors.text },
  body: { fontSize: 14, color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted },
};

export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  button: {
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
};
