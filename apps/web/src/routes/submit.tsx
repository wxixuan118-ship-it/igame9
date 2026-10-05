import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { gameCategories } from "@starter/db/schema/game";
import { useEffect, useState } from "react";
import { z } from "zod";
import { orpc } from "@/utils/orpc";
import { asset } from "@/site";
export const Route = createFileRoute("/submit")({
  validateSearch: z.object({ id: z.string().optional().catch(undefined) }),
  head: () => ({ meta: [{ title: "Submit your game" }] }),
  component: Submit,
});
const empty = {
  title: "",
  summary: "",
  body: "",
  category: "casual" as (typeof gameCategories)[number],
  tags: "",
  url: "",
  embedUrl: "",
  thumbnailUrl: "",
  embedRightsConfirmed: false,
};
function Submit() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const me = useQuery(orpc.me.queryOptions());
  const mine = useQuery({ ...orpc.games.mine.queryOptions(), enabled: !!id });
  const existing = mine.data?.find((g) => g.id === id);
  const [form, setForm] = useState(empty);
  const [plan, setPlan] = useState<"free" | "paid">("paid");
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(location.origin), []);
  useEffect(() => {
    if (existing)
      setForm({
        title: existing.title,
        summary: existing.summary,
        body: existing.body,
        url: existing.url,
        category: existing.category as (typeof gameCategories)[number],
        tags: existing.tags.join(", "),
        embedUrl: existing.embedUrl ?? "",
        thumbnailUrl: existing.thumbnailUrl ?? "",
        embedRightsConfirmed: !!existing.embedUrl,
      });
  }, [existing]);
  const submit = useMutation(orpc.games.submit.mutationOptions());
  const update = useMutation(orpc.games.update.mutationOptions());
  const pay = useMutation(orpc.games.pay.mutationOptions());
  const error = submit.error ?? update.error ?? pay.error;
  const busy = submit.isPending || update.isPending || pay.isPending;
  if (me.isError)
    return (
      <main className="panel">
        <h1>Submit your game</h1>
        <p>
          Please <Link to="/login">sign in</Link> to submit a game.
        </p>
      </main>
    );
  const badge = `<a href="${origin}/" target="_blank"><img src="${origin}/badge.svg" alt="Featured on igame9" width="180" height="48"></a>`;
  const effectivePlan = existing ? existing.plan : plan;
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      ...form,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    if (existing) {
      await update.mutateAsync({ ...input, id: existing.id });
      if (existing.status === "awaiting_payment") return goPay(existing.id);
      return navigate({ to: "/app" });
    }
    const result = await submit.mutateAsync({ ...input, plan });
    if (plan === "paid") return goPay(result.id);
    navigate({ to: "/app" });
  }
  async function goPay(gameId: string) {
    location.href = (await pay.mutateAsync({ id: gameId })).checkoutUrl;
  }
  return (
    <main>
      <section className="panel">
        <h1>{existing ? `Edit ${existing.title}` : "Submit your game"}</h1>
        {existing?.status === "rejected" && existing.rejectReason ? (
          <p className="error">Rejected: {existing.rejectReason}</p>
        ) : null}
        {!existing ? (
          <div className="grid" role="radiogroup" aria-label="Listing plan">
            <label className={`plan ${plan === "paid" ? "plan-active" : ""}`}>
              <input
                type="radio"
                name="plan"
                checked={plan === "paid"}
                onChange={() => setPlan("paid")}
              />
              <strong>Featured listing (paid)</strong>
              <span>Goes live right after payment</span>
              <span>Homepage featured slot</span>
              <span>Followed (dofollow) link to your site</span>
            </label>
            <label className={`plan ${plan === "free" ? "plan-active" : ""}`}>
              <input
                type="radio"
                name="plan"
                checked={plan === "free"}
                onChange={() => setPlan("free")}
              />
              <strong>Free listing</strong>
              <span>Add our badge to your game page</span>
              <span>Goes live after manual review</span>
              <span>nofollow link</span>
            </label>
          </div>
        ) : null}
        {effectivePlan === "free" ? (
          <div className="stack">
            <p>
              Place this badge on the exact page you enter as the game URL. We check it on submit
              and on every edit.
            </p>
            {origin ? (
              <img src={asset("/badge.svg")} alt="Featured on igame9" width={180} height={48} />
            ) : null}
            <textarea className="code" readOnly value={badge} rows={3} />
          </div>
        ) : null}
      </section>
      <form className="panel stack" onSubmit={onSubmit}>
        <label className="field">
          Game title
          <input
            required
            minLength={2}
            maxLength={80}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <label className="field">
          Short summary (20–300 characters)
          <input
            required
            minLength={20}
            maxLength={300}
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
          />
        </label>
        <label className="field">
          Category
          <select
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value as (typeof gameCategories)[number] })
            }
          >
            {gameCategories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Tags (comma separated, up to 8)
          <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        </label>
        <label className="field">
          Game URL (your page where players play)
          <input
            type="url"
            required
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
        </label>
        <label className="field">
          Embed URL (optional, lets players play on our site)
          <input
            type="url"
            value={form.embedUrl}
            onChange={(e) => setForm({ ...form, embedUrl: e.target.value })}
          />
        </label>
        {form.embedUrl ? (
          <label>
            <input
              type="checkbox"
              required
              checked={form.embedRightsConfirmed}
              onChange={(e) => setForm({ ...form, embedRightsConfirmed: e.target.checked })}
            />{" "}
            I own this game or have permission to let it be embedded.
          </label>
        ) : null}
        <label className="field">
          Thumbnail image URL (optional, 16:9)
          <input
            type="url"
            value={form.thumbnailUrl}
            onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
          />
        </label>
        <label className="field">
          Description (Markdown, optional)
          <textarea
            maxLength={10000}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
        </label>
        <button className="button" disabled={busy}>
          {existing
            ? existing.status === "awaiting_payment"
              ? "Save and pay"
              : "Save and resubmit"
            : plan === "paid"
              ? "Continue to payment"
              : "Verify badge and submit"}
        </button>
        {error ? <p className="error">{error.message}</p> : null}
      </form>
    </main>
  );
}
