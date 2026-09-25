import { Link, NavLink, Outlet } from "react-router-dom";
import { apiUnconfigured } from "@/lib/api";

const NAV = [
  { to: "/", label: "Create", end: true },
  { to: "/community", label: "Community" },
];

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-ink-800/80 bg-ink-950/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-lg bg-brand-500 text-[13px] font-black text-white">
              Z
            </span>
            <span className="text-sm font-semibold tracking-tight">Zero-Prompt Learning</span>
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 font-medium transition-colors ${
                    isActive ? "bg-ink-800 text-ink-100" : "text-ink-400 hover:text-ink-100"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {apiUnconfigured && <ApiNotice />}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-ink-800/80 px-4 py-6 text-center text-xs text-ink-400">
        One click. Complete study suite. Zero prompts.
      </footer>
    </div>
  );
}

/**
 * GitHub Pages can only serve the static client. Without a deployed API the UI
 * renders but every request fails, so say so plainly rather than letting the
 * visitor discover it through a failed upload.
 */
function ApiNotice() {
  return (
    <div className="border-b border-amber-400/30 bg-amber-400/10 px-4 py-2.5">
      <p className="mx-auto max-w-6xl text-xs leading-relaxed text-amber-400">
        <strong className="font-semibold">Front-end preview.</strong> This is the static client
        only — the API that talks to Claude and Supabase is not deployed, so generating a study
        pack will not work here. Run it locally, or set the{" "}
        <code className="rounded bg-ink-900/60 px-1 py-0.5">VITE_API_URL</code> repository variable
        to a deployed API and re-run the Pages workflow.
      </p>
    </div>
  );
}
