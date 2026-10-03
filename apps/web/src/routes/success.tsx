import { Link, createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/success")({
  component: () => (
    <main className="panel">
      <h1>Thank you</h1>
      <p>
        Your game goes live as soon as the payment provider confirms the order, usually within a
        minute.
      </p>
      <Link to="/app">Go to My games</Link>
    </main>
  ),
});
