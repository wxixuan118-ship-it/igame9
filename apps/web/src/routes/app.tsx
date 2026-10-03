import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "My games | igame9" }, { name: "robots", content: "noindex" }] }),
  component: App,
});
const statusLabel: Record<string, string> = {
  awaiting_payment: "Awaiting payment",
  pending: "In review",
  published: "Live",
  rejected: "Needs changes",
};
function App() {
  const me = useQuery(orpc.me.queryOptions());
  const games = useQuery(orpc.games.mine.queryOptions());
  const payments = useQuery(orpc.payments.queryOptions());
  const pay = useMutation(orpc.games.pay.mutationOptions());
  if (me.isError)
    return (
      <main className="panel">
        <a href="/login">Sign in</a>
      </main>
    );
  return (
    <main>
      <section className="panel">
        <h1>My games</h1>
        <p className="muted">{me.data?.email}</p>
        <p>
          <Link to="/submit" className="button">
            Submit a game
          </Link>
        </p>
        <div className="table-wrap">
          <table>
            <tbody>
              {games.data?.map((g) => (
                <tr key={g.id}>
                  <td>
                    {g.status === "published" ? (
                      <Link to="/games/$slug" params={{ slug: g.slug }}>
                        {g.title}
                      </Link>
                    ) : (
                      g.title
                    )}
                  </td>
                  <td>{g.plan === "paid" ? "Featured" : g.plan === "free" ? "Free" : g.plan}</td>
                  <td>
                    {statusLabel[g.status] ?? g.status}
                    {g.rejectReason ? <div className="error">{g.rejectReason}</div> : null}
                  </td>
                  <td className="row">
                    <Link to="/submit" search={{ id: g.id }}>
                      Edit
                    </Link>
                    {g.status === "awaiting_payment" ? (
                      <button
                        className="button"
                        disabled={pay.isPending}
                        onClick={async () => {
                          location.href = (await pay.mutateAsync({ id: g.id })).checkoutUrl;
                        }}
                      >
                        Pay now
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pay.error ? <p className="error">{pay.error.message}</p> : null}
      </section>
      <section className="panel">
        <h2>Payments</h2>
        <div className="table-wrap">
          <table>
            <tbody>
              {payments.data?.map((item) => (
                <tr key={item.id}>
                  <td>{item.productName}</td>
                  <td>{item.status}</td>
                  <td>
                    {item.amount} {item.currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
