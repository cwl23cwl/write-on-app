const TL_COLOR_TO_HEX: Record<string, string> = {
  black: "#1d1d1d",
  blue: "#2563eb",
  green: "#16a34a",
  red: "#dc2626",
  orange: "#ec5d3a",
  violet: "#7c3aed",
  grey: "#78716c",
  white: "#ffffff",
  yellow: "#facc15",
  "light-blue": "#4ba1f1",
  "light-green": "#4cb05e",
  "light-red": "#f87171",
};

const HEX_TO_TL_COLOR = new Map<string, string>(
  Object.entries(TL_COLOR_TO_HEX).flatMap(([tl, hex]) => {
    const normalized = normalizeHex(hex);
    const aliases = new Set<string>([normalized, normalizeHex(hex.replace("#", "#")), normalized.toUpperCase()]);
    if (tl === "blue") aliases.add("#4465e9");
    if (tl === "red") aliases.add("#f2555a");
    if (tl === "green") aliases.add("#099268");
    if (tl === "orange") aliases.add("#ec5d3a");
    if (tl === "violet") aliases.add("#7c3aed");
    if (tl === "grey") aliases.add("#9fa8b2");
    if (tl === "black") aliases.add("#000000");
    return Array.from(aliases).map((alias) => [normalizeHex(alias), tl]);
  }),
);

const TL_FONT_TO_CSS: Record<string, string> = {
  sans: "Open Sans, sans-serif",
  serif: '"Times New Roman", serif',
  mono: '"Courier New", monospace',
  draw: '"Comic Sans MS", cursive',
};

const CSS_FONT_TO_TL = new Map<string, string>(
  Object.entries(TL_FONT_TO_CSS).flatMap(([tl, css]) => {
    const normalized = css.toLowerCase();
    return [normalized, normalized.replace(/["']/g, ""), tl === "sans" ? "sans-serif" : undefined]
      .filter(Boolean)
      .map((alias) => [alias as string, tl]);
  }),
);

const TL_SIZE_SEQUENCE: Array<"s" | "m" | "l" | "xl"> = ["s", "m", "l", "xl"];
const TL_SIZE_TO_POINTS: Record<"s" | "m" | "l" | "xl", number> = {
  s: 16,
  m: 24,
  l: 32,
  xl: 48,
};

function normalizeHex(value: string): string {
  return value.trim().toLowerCase();
}

export function tlColorToHex(value?: string | null): string | undefined {
  if (!value) return undefined;
  return TL_COLOR_TO_HEX[value] ?? "#2563eb";
}

export function hexToTlColor(hex: string): string {
  const normalized = normalizeHex(hex);
  return HEX_TO_TL_COLOR.get(normalized) ?? "black";
}

export function tlFontToCss(value?: string | null): string | undefined {
  if (!value) return undefined;
  return TL_FONT_TO_CSS[value] ?? TL_FONT_TO_CSS.sans;
}

export function cssFontToTl(value: string): string {
  const normalized = value.toLowerCase().trim();
  return CSS_FONT_TO_TL.get(normalized) ?? "sans";
}

export function tlSizeToPoints(value?: "s" | "m" | "l" | "xl" | null): number {
  if (!value) return TL_SIZE_TO_POINTS.m;
  return TL_SIZE_TO_POINTS[value] ?? TL_SIZE_TO_POINTS.m;
}

export function pointsToTlSize(points: number): "s" | "m" | "l" | "xl" {
  if (points <= 18) return "s";
  if (points <= 28) return "m";
  if (points <= 40) return "l";
  return "xl";
}

export function nextTlSize(current: "s" | "m" | "l" | "xl", delta: 1 | -1): "s" | "m" | "l" | "xl" {
  const index = TL_SIZE_SEQUENCE.indexOf(current);
  if (index === -1) return current;
  const nextIndex = Math.min(Math.max(index + delta, 0), TL_SIZE_SEQUENCE.length - 1);
  return TL_SIZE_SEQUENCE[nextIndex];
}

export function tlAlignToTextAlign(value?: "start" | "middle" | "end" | null): "start" | "middle" | "end" | undefined {
  return value ?? undefined;
}

