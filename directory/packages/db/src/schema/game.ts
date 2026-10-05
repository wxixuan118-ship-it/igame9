import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
/**
 * plan: own = our own game (static igame9 pages are synced in as own with url "/<slug>/");
 *       free = badge backlink + review; paid = live immediately, dofollow, featured
 * status: awaiting_payment -> published (paid) | pending -> published / rejected | removed (static page deleted)
 */
export const game = pgTable(
  "game",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    body: text("body").notNull().default(""),
    category: text("category").notNull(),
    tags: text("tags").array().notNull().default([]),
    url: text("url").notNull(),
    embedUrl: text("embed_url"),
    thumbnailUrl: text("thumbnail_url"),
    plan: text("plan").notNull(),
    status: text("status").notNull(),
    rejectReason: text("reject_reason"),
    featured: boolean("featured").notNull().default(false),
    dofollow: boolean("dofollow").notNull().default(false),
    /** Sort weight for "Popular" lists; static pages use their keyword search volume. */
    rank: integer("rank").notNull().default(0),
    badgeVerifiedAt: timestamp("badge_verified_at"),
    orderId: text("order_id"),
    submitterId: text("submitter_id").references(() => user.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("game_slug_idx").on(table.slug),
    index("game_status_idx").on(table.status, table.publishedAt),
    index("game_submitter_idx").on(table.submitterId),
  ],
);
/** First seven mirror igame9.ai/data/site.mjs (the sync script fails if they drift); the rest are for submissions. */
export const categoryInfo = {
  idle: {
    name: "Idle & Tycoon",
    h2: "Idle & tycoon games",
    short: "Idle",
    icon: "💰",
    blurb:
      "Incremental games where numbers keep climbing while you are away. Build a startup, level a party of heroes or spin orbits for exponential score.",
  },
  racing: {
    name: "Racing & Drifting",
    h2: "Racing & drifting games",
    short: "Racing",
    icon: "🏎️",
    blurb:
      "Car games built around timing and throttle control — one-tap cliff drifting, tandem drift scoring and two-player split-keyboard races.",
  },
  runner: {
    name: "Endless Runners",
    h2: "Endless runner games",
    short: "Runner",
    icon: "🏃",
    blurb:
      "Swipe, jump and slide through temples, emerald roads and gravity-flipping space tunnels. Every run is a new high-score attempt.",
  },
  puzzle: {
    name: "Puzzle & Merge",
    h2: "Puzzle & merge games",
    short: "Puzzle",
    icon: "🧩",
    blurb:
      "Brain games for short breaks: two-layer mahjong, element crafting, dragon merging and draw-a-line physics puzzles.",
  },
  strategy: {
    name: "Strategy & Tower Defense",
    h2: "Strategy & tower defense games",
    short: "Strategy",
    icon: "🏰",
    blurb:
      "Plan, build and outlast: balloon-popping tower defense and age-to-age lane battles where every coin and upgrade decides the war.",
  },
  stickman: {
    name: "Stickman Games",
    h2: "Stickman games",
    short: "Stickman",
    icon: "🥢",
    blurb:
      "Stick-figure physics at its best — ragdoll archery duels, chaotic brawls, combo fighting and rope-swinging stickman runs.",
  },
  action: {
    name: "Action & Sports",
    h2: "Action & sports games",
    short: "Action",
    icon: "🎯",
    blurb:
      "Fast reflex games — arena first-person shooting against bots and rhythm-tapping 100 m sprints.",
  },
  arcade: {
    name: "Arcade",
    h2: "Arcade games",
    short: "Arcade",
    icon: "🕹️",
    blurb:
      "Quick-start arcade games from independent developers: classic score chasing, reflexes and one-more-try loops.",
  },
  adventure: {
    name: "Adventure",
    h2: "Adventure games",
    short: "Adventure",
    icon: "🗺️",
    blurb: "Explore, solve and survive — story and exploration games from independent developers.",
  },
  simulation: {
    name: "Simulation",
    h2: "Simulation games",
    short: "Simulation",
    icon: "🏗️",
    blurb:
      "Build, manage and experiment — sandbox and management sims that run right in the browser.",
  },
  io: {
    name: ".io Games",
    h2: ".io games",
    short: ".io",
    icon: "🌐",
    blurb: "Multiplayer browser arenas where you grow, battle and climb the live leaderboard.",
  },
  casual: {
    name: "Casual",
    h2: "Casual games",
    short: "Casual",
    icon: "🎈",
    blurb: "Easy-to-learn games for a short break, from independent developers.",
  },
  other: {
    name: "Other",
    h2: "More games",
    short: "Other",
    icon: "🎮",
    blurb: "Everything else submitted by independent developers.",
  },
} as const;
export type GameCategory = keyof typeof categoryInfo;
export const gameCategories = Object.keys(categoryInfo) as [GameCategory, ...GameCategory[]];
