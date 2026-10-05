import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { db } from "@starter/db";
import { game, gameCategories } from "@starter/db/schema/game";
import { env } from "@starter/env/server";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const httpUrl = z.url({ protocol: /^https?$/ }).max(500);
export const gameInput = z.object({
  title: z.string().trim().min(2).max(80),
  summary: z.string().trim().min(20).max(300),
  body: z.string().trim().max(10000).default(""),
  category: z.enum(gameCategories),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(24)).max(8).default([]),
  url: httpUrl,
  embedUrl: httpUrl.optional().or(z.literal("")),
  thumbnailUrl: httpUrl.optional().or(z.literal("")),
  embedRightsConfirmed: z.boolean().default(false),
});
export type GameInput = z.infer<typeof gameInput>;

export function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "game"
  );
}

const privateRanges = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
] as const)
  privateRanges.addSubnet(net, prefix, "ipv4");
for (const [net, prefix] of [
  ["::", 127],
  ["fc00::", 7],
  ["fe80::", 10],
  ["::ffff:0:0", 96],
] as const)
  privateRanges.addSubnet(net, prefix, "ipv6");

/** Fetch the submitter's page and look for a link back to our site. */
export async function verifyBadge(pageUrl: string) {
  const target = new URL(pageUrl);
  const host = target.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (
    !addresses.length ||
    addresses.some((a) => privateRanges.check(a.address, isIP(a.address) === 6 ? "ipv6" : "ipv4"))
  )
    return false;
  // ponytail: redirects are not followed (avoids redirect-to-internal SSRF); the badge must be on the exact URL submitted.
  // DNS can still change between lookup and fetch (rebinding); upgrade path is a pinned-IP agent if this matters.
  const response = await fetch(target, {
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
    headers: { "user-agent": "igame9-badge-check/1.0" },
  }).catch(() => null);
  if (!response?.ok) return false;
  const html = (await response.text()).slice(0, 2_000_000);
  const siteHost = new URL(env.BETTER_AUTH_URL).hostname.replace(/^www\./, "");
  return hasBacklink(html, siteHost);
}

export function hasBacklink(html: string, siteHost: string) {
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const tag = match[0];
    const href = /href\s*=\s*["']?([^"'\s>]+)/i.exec(tag)?.[1];
    if (!href) continue;
    let host;
    try {
      host = new URL(href).hostname.replace(/^www\./, "");
    } catch {
      continue;
    }
    if (host === siteHost && !/rel\s*=\s*["'][^"']*nofollow/i.test(tag)) return true;
  }
  return false;
}

export async function uniqueSlug(title: string) {
  const base = slugify(title);
  for (let i = 0; i < 20; i++) {
    const slug = i ? `${base}-${i + 1}` : base;
    const [taken] = await db.select({ id: game.id }).from(game).where(eq(game.slug, slug)).limit(1);
    if (!taken) return slug;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export function fields(input: GameInput) {
  if (input.embedUrl && !input.embedRightsConfirmed)
    throw new ORPCError("BAD_REQUEST", {
      message: "Confirm you have the right to embed this game.",
    });
  return {
    title: input.title,
    summary: input.summary,
    body: input.body,
    category: input.category,
    tags: [...new Set(input.tags)],
    url: input.url,
    embedUrl: input.embedUrl || null,
    thumbnailUrl: input.thumbnailUrl || null,
  };
}

async function requireBadge(url: string) {
  if (!(await verifyBadge(url)))
    throw new ORPCError("BAD_REQUEST", {
      message:
        "We could not find a followed link to our site on that page. Add the badge to the exact game URL and try again.",
    });
  return new Date();
}

/** Free → badge check then review queue. Paid → awaiting_payment; the webhook publishes it. */
export async function submitGame(userId: string, input: GameInput, plan: "free" | "paid") {
  const values = fields(input);
  const badgeVerifiedAt = plan === "free" ? await requireBadge(input.url) : null;
  const id = crypto.randomUUID();
  await db.insert(game).values({
    id,
    slug: await uniqueSlug(input.title),
    ...values,
    plan,
    status: plan === "free" ? "pending" : "awaiting_payment",
    badgeVerifiedAt,
    submitterId: userId,
  });
  return { id };
}

/** Editing a published or rejected game sends it back to review; paid listings keep their perks. */
export async function updateGame(userId: string, id: string, input: GameInput) {
  const [row] = await db
    .select()
    .from(game)
    .where(and(eq(game.id, id), eq(game.submitterId, userId)))
    .limit(1);
  if (!row) throw new ORPCError("NOT_FOUND");
  const values = fields(input);
  const badgeVerifiedAt = row.plan === "free" ? await requireBadge(input.url) : row.badgeVerifiedAt;
  const status = row.status === "awaiting_payment" ? "awaiting_payment" : "pending";
  await db
    .update(game)
    .set({ ...values, badgeVerifiedAt, status, rejectReason: null })
    .where(eq(game.id, id));
  return { id };
}
