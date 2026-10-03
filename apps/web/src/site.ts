// Mirrors igame9.ai/data/site.mjs. Pages synced from the static site use the same values.
export const site = {
  name: "igame9",
  url: (import.meta.env.VITE_SITE_URL as string | undefined) ?? "https://igame9.ai",
  description:
    "Play free online games on igame9: tower defense, stickman fights, idle tycoons, drifting, runners, mahjong and puzzles. No download or login, on any device.",
  themeColor: "#0b0d17",
};
export const abs = (path: string) => site.url.replace(/\/$/, "") + path;
/** Static igame9 pages live at "/<slug>/"; submitted games at "/games/<slug>". */
export const gameHref = (g: { slug: string; url: string }) =>
  g.url.startsWith("/") ? g.url : `/games/${g.slug}`;
