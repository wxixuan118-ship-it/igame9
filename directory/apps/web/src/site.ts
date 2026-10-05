import { DIRECTORY_BASE } from "@starter/env/base";
// Mirrors data/site.mjs of the games site (repo root).
export const site = {
  name: "igame9",
  url: (import.meta.env.VITE_SITE_URL as string | undefined) ?? "https://igame9.ai",
  description:
    "Play free online games on igame9: tower defense, stickman fights, idle tycoons, drifting, runners, mahjong and puzzles. No download or login, on any device.",
  themeColor: "#0b0d17",
};
export const abs = (path: string) => site.url.replace(/\/$/, "") + path;
/** A path inside the directory app, e.g. dir("/games") -> "/directory/games". */
export const dir = (path = "/") => DIRECTORY_BASE + path;
/** Root-relative static assets (CSS, thumbnails) come from the directory's own synced copy. */
export const asset = (path: string) => (path.startsWith("/") ? dir(path) : path);
/** Our games live on the games site at "/<slug>/"; submitted games at "/directory/games/<slug>". */
export const gameHref = (g: { slug: string; url: string }) =>
  g.url.startsWith("/") ? g.url : dir(`/games/${g.slug}`);
