// Centralised theme tokens for FlyReady
import { useColorScheme } from "react-native";

export const palette = {
  primary: "#0C447C",
  secondary: "#1D9E75",
  success: "#1D9E75",
  warning: "#F59E0B",
  danger: "#E24B4A",
  white: "#FFFFFF",
  black: "#000000",
};

export const lightTheme = {
  ...palette,
  background: "#F5F5F5",
  surface: "#FFFFFF",
  surfaceAlt: "#FAFAFA",
  text: "#212121",
  textSecondary: "#888888",
  border: "#E0E0E0",
  online: "#1D9E75",
  offline: "#888888",
  cardShadow: "rgba(0,0,0,0.04)",
};

export const darkTheme = {
  ...palette,
  background: "#1a1a2e",
  surface: "#252541",
  surfaceAlt: "#2d2d4d",
  text: "#F5F5F5",
  textSecondary: "#A0A0A0",
  border: "#363653",
  online: "#1D9E75",
  offline: "#888888",
  cardShadow: "rgba(0,0,0,0.4)",
};

export type Theme = typeof lightTheme;

export const useTheme = (): Theme => {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkTheme : lightTheme;
};

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { sm: 8, md: 12, pill: 999 };

// Drone-type → accent color mapping
export const droneTypeColor = (t?: string): string => {
  switch (t) {
    case "fixed_wing":
      return "#1D9E75"; // green
    case "heavy_lift":
      return "#F59E0B"; // amber
    case "vtol":
      return "#7C3AED"; // purple
    case "multirotor":
    default:
      return "#0C447C"; // navy
  }
};

export const droneTypeLabel = (t?: string): string => {
  switch (t) {
    case "fixed_wing": return "Fixed Wing";
    case "heavy_lift": return "Heavy Lift";
    case "vtol": return "VTOL";
    case "multirotor": return "Multirotor";
    case "custom": return "Custom";
    default: return "Multirotor";
  }
};
