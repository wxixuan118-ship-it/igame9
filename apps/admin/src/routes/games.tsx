import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { gameCategories as categories } from "@starter/db/schema/game";
import { orpc } from "@/utils/orpc";
export const Route = createFileRoute("/games")({ component: Games });
const empty = {
  id: undefined as string | undefined,
  title: "",
  summary: "",
  body: "",
  category: "casual" as (typeof categories)[number],
  tags: "",
  url: "",
  embedUrl: "",
  thumbnailUrl: "",
};
function Games() {
  const queryClient = useQueryClient();
  const refresh = {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.games.list.key() }),
  };
  const games = useQuery(orpc.games.list.queryOptions());
  const review = useMutation(orpc.games.review.mutationOptions(refresh));
  const feature = useMutation(orpc.games.setFeatured.mutationOptions(refresh));
  const save = useMutation(orpc.games.saveOwn.mutationOptions(refresh));
  const [form, setForm] = useState(empty);
  if (games.isError) return <Link to="/login">Sign in</Link>;
  return (
    <main>
      <section className="panel">
        <h1>Games</h1>
        <div className="table-wrap">
          <table>
            <tbody>
              {games.data?.map((g) => (
                <tr key={g.id}>
                  <td>
                    <a href={g.url} target="_blank" rel="noreferrer">
                      {g.title}
                    </a>
                    <div className="muted">{g.summary}</div>
                    {g.embedUrl ? <div className="muted">embed: {g.embedUrl}</div> : null}
                  </td>
                  <td>
                    {g.plan}
                    {g.badgeVerifiedAt ? " · badge ✓" : ""}
                  </td>
                  <td>
                    {g.status}
                    {g.rejectReason ? <div className="error">{g.rejectReason}</div> : null}
                  </td>
                  <td>
                    {g.status !== "published" && g.status !== "awaiting_payment" ? (
                      <button
                        className="button"
                        onClick={() => review.mutate({ id: g.id, action: "approve" })}
                      >
                        Approve
                      </button>
                    ) : null}{" "}
                    {g.status !== "rejected" && g.status !== "awaiting_payment" ? (
                      <button
                        onClick={() => {
                          const reason = prompt("Reason shown to the submitter");
                          if (reason) review.mutate({ id: g.id, action: "reject", reason });
                        }}
                      >
                        Reject
                      </button>
                    ) : null}{" "}
                    <button onClick={() => feature.mutate({ id: g.id, featured: !g.featured })}>
                      {g.featured ? "Unfeature" : "Feature"}
                    </button>{" "}
                    {g.plan === "own" && !g.url.startsWith("/") ? (
                      <button
                        onClick={() =>
                          setForm({
                            id: g.id,
                            title: g.title,
                            summary: g.summary,
                            body: g.body,
                            category: g.category as (typeof categories)[number],
                            tags: g.tags.join(", "),
                            url: g.url,
                            embedUrl: g.embedUrl ?? "",
                            thumbnailUrl: g.thumbnailUrl ?? "",
                          })
                        }
                      >
                        Edit
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {review.error ? <p className="error">{review.error.message}</p> : null}
      </section>
      <section className="panel">
        <h2>{form.id ? "Edit our game" : "Add our own game"}</h2>
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            await save.mutateAsync({
              ...form,
              tags: form.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            });
            setForm(empty);
          }}
        >
          {(["title", "summary", "url", "embedUrl", "thumbnailUrl", "tags"] as const).map((key) => (
            <label className="field" key={key}>
              {key}
              <input
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
          <label className="field">
            category
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as (typeof categories)[number] })
              }
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="field">
            body (Markdown)
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </label>
          <button className="button" disabled={save.isPending}>
            Save
          </button>
          {save.error ? <p className="error">{save.error.message}</p> : null}
        </form>
      </section>
    </main>
  );
}
