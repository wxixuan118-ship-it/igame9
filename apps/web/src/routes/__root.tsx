import type { QueryClient } from "@tanstack/react-query";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { categoryInfo } from "@starter/db/schema/game";
import { getLocale } from "@/paraglide/runtime";
import type { orpc } from "@/utils/orpc";
import { asset, site } from "@/site";
import staticAssets from "../static-assets.gen.json";
import appCss from "../index.css?url";
type RouterContext = { orpc: typeof orpc; queryClient: QueryClient };
/** Header mirrors the games site: its seven categories link to the games hub at "/". */
const headerCategories = (
  ["idle", "racing", "runner", "puzzle", "strategy", "stickman", "action"] as const
).map((key) => [key, categoryInfo[key]] as const);
function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b6cff" />
          <stop offset="1" stopColor="#2dd4f0" />
        </linearGradient>
      </defs>
      <rect x="1" y="6" width="30" height="20" rx="10" fill="url(#lg)" />
      <rect x="7" y="14.5" width="8" height="3" rx="1.5" fill="#0b0d17" />
      <rect x="9.5" y="12" width="3" height="8" rx="1.5" fill="#0b0d17" />
      <circle cx="21.5" cy="13.5" r="2" fill="#0b0d17" />
      <circle cx="25" cy="18" r="2" fill="#0b0d17" />
    </svg>
  );
}
export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "description", content: site.description },
      { name: "theme-color", content: site.themeColor },
      { property: "og:site_name", content: site.name },
    ],
    links: [
      { rel: "icon", href: asset("/favicon.svg"), type: "image/svg+xml" },
      // The games site's stylesheet (synced into public/ by `pnpm sync:static --files`).
      { rel: "stylesheet", href: asset(`/assets/css/site.css?v=${staticAssets.version}`) },
      { rel: "stylesheet", href: appCss },
    ],
    scripts:
      import.meta.env.PROD && import.meta.env.VITE_GA_MEASUREMENT_ID
        ? [
            {
              src: `https://www.googletagmanager.com/gtag/js?id=${import.meta.env.VITE_GA_MEASUREMENT_ID}`,
              async: true,
            },
            {
              children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${import.meta.env.VITE_GA_MEASUREMENT_ID}')`,
            },
          ]
        : [],
  }),
  component: () => (
    <html lang={getLocale()}>
      <head>
        <HeadContent />
      </head>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <div className="wrap">
            <a className="logo" href="/" aria-label={`${site.name} home`}>
              <Logo />
              <span>
                i<b>game9</b>
              </span>
            </a>
            <nav className="nav" aria-label="Game categories">
              <a href="/">All games</a>
              {headerCategories.map(([key, c]) => (
                <a key={key} href={`/#${key}`}>
                  {c.short}
                </a>
              ))}
              <Link to="/">Directory</Link>
              <Link to="/submit">Submit</Link>
              <Link to="/app">My games</Link>
            </nav>
          </div>
        </header>
        <Outlet />
        <footer className="site-footer">
          <div className="wrap">
            <div className="foot-grid">
              <div>
                <a className="logo" href="/">
                  <Logo />
                  <span>
                    i<b>game9</b>
                  </span>
                </a>
                <p>{site.description}</p>
              </div>
              <div>
                <h2>Categories</h2>
                <ul>
                  {headerCategories.map(([key, c]) => (
                    <li key={key}>
                      <a href={`/#${key}`}>{c.name}</a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2>Developers</h2>
                <ul>
                  <li>
                    <Link to="/">Game directory</Link>
                  </li>
                  <li>
                    <Link to="/submit">Submit a game</Link>
                  </li>
                  <li>
                    <Link to="/app">My games</Link>
                  </li>
                  <li>
                    <Link to="/login">Sign in</Link>
                  </li>
                  <li>
                    <Link to="/blog">Blog</Link>
                  </li>
                </ul>
              </div>
            </div>
            <p className="foot-note">
              © {new Date().getFullYear()} {site.name}. Game names mentioned on this site are
              trademarks of their respective owners and are used only to describe the games and
              genres covered. igame9 is an independent site. Games marked “igame9 original” are
              built by us; other listings are submitted by their developers, who are responsible for
              them.
            </p>
          </div>
        </footer>
        <Scripts />
      </body>
    </html>
  ),
});
