import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { notifyAuthChange, useAuthSnapshot } from "../hooks/useAuthSnapshot";

const sideLink =
  "block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-wellness-sage/10 hover:text-wellness-sage";
const sideActive =
  "bg-wellness-sage/15 text-wellness-sage ring-1 ring-wellness-sage/20";

function signOut(navigate) {
  localStorage.removeItem("userToken");
  localStorage.removeItem("authRole");
  notifyAuthChange();
  navigate("/auth", { replace: true });
}

/** Course-first shell: main content + sidebar for screening, support, Talk mate. */
export default function StudentAppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authRole } = useAuthSnapshot();

  /** Counsellors / doubt teachers: same token, route to role-specific forum & video URLs. */
  useEffect(() => {
    const p = location.pathname;
    if (authRole === "counsellor") {
      if (p === "/forum") navigate("/counsellor/forum", { replace: true });
      else if (p === "/video")
        navigate(`/counsellor/video${location.search}`, { replace: true });
      return;
    }
    if (authRole === "doubt_teacher") {
      if (p === "/forum") navigate("/doubt-teacher/forum", { replace: true });
      else if (p === "/video")
        navigate(`/doubt-teacher/video${location.search}`, { replace: true });
    }
  }, [authRole, location.pathname, location.search, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-wellness-cream/40">
      <header className="sticky top-0 z-30 border-b-2 border-wellness-sage/20 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-wellness-sage text-sm font-bold text-white shadow-sm ring-1 ring-wellness-sage/25 sm:flex"
              aria-hidden
            >
              S
            </span>
            <Link
              to="/learn"
              className="truncate text-lg font-bold tracking-tight text-slate-900"
            >
              <span className="bg-gradient-to-r from-wellness-sage to-wellness-teal bg-clip-text text-transparent">
                Mannmitra
              </span>
            </Link>
            <span className="hidden rounded-full bg-wellness-sage/12 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-wellness-sage ring-1 ring-wellness-sage/20 sm:inline">
              Student · Learn
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/learn"
              className="rounded-lg bg-wellness-sage px-3 py-2 text-sm font-semibold text-white shadow-sm sm:px-4"
            >
              Courses
            </Link>
            <button
              type="button"
              onClick={() => signOut(navigate)}
              className="rounded-lg px-2 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 sm:px-3"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col md:flex-row">
        <aside className="hidden shrink-0 border-b border-stone-200 bg-white md:block md:w-56 md:border-b-0 md:border-r">
          <nav className="space-y-1 p-4">
            <p className="px-3 pb-2 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">
              Learning
            </p>
            <NavLink
              to="/learn"
              end
              className={({ isActive }) =>
                `${sideLink} ${isActive ? sideActive : ""}`
              }
            >
              Courses
            </NavLink>
            <Link
              to="/learn#pcm-doubt"
              className={`${sideLink} text-wellness-teal hover:text-wellness-teal`}
            >
              PCM doubt tutor
            </Link>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `${sideLink} ${isActive ? sideActive : ""}`
              }
            >
              Overview
            </NavLink>

            <p className="mt-6 px-3 pb-2 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">
              More
            </p>
            <NavLink
              to="/screening"
              className={({ isActive }) =>
                `${sideLink} ${isActive ? sideActive : ""}`
              }
            >
              Screening (PHQ-9 / GAD-7)
            </NavLink>
            <NavLink
              to="/booking"
              className={({ isActive }) =>
                `${sideLink} ${isActive ? sideActive : ""}`
              }
            >
              Counselling
            </NavLink>
            <NavLink
              to="/doubt-support"
              className={({ isActive }) =>
                `${sideLink} ${isActive ? sideActive : ""}`
              }
            >
              Doubt support
            </NavLink>
            <NavLink
              to="/forum"
              className={({ isActive }) =>
                `${sideLink} ${isActive ? sideActive : ""}`
              }
            >
              Study squad
            </NavLink>
            <NavLink
              to="/video"
              className={({ isActive }) =>
                `${sideLink} ${isActive ? sideActive : ""}`
              }
            >
              Video sessions
            </NavLink>
            <NavLink
              to="/chat"
              className={({ isActive }) =>
                `${sideLink} ${isActive ? sideActive : ""}`
              }
            >
              Talk mate
            </NavLink>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex gap-2 overflow-x-auto border-b border-stone-200 bg-white px-3 py-2 md:hidden">
            <Link
              to="/learn"
              className="shrink-0 rounded-full bg-wellness-sage/15 px-3 py-1.5 text-xs font-semibold text-wellness-sage"
            >
              Courses
            </Link>
            <Link
              to="/learn#pcm-doubt"
              className="shrink-0 rounded-full bg-wellness-teal/15 px-3 py-1.5 text-xs font-semibold text-wellness-teal"
            >
              PCM tutor
            </Link>
            <Link
              to="/dashboard"
              className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-700"
            >
              Overview
            </Link>
            <Link
              to="/screening"
              className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-700"
            >
              Screening
            </Link>
            <Link
              to="/doubt-support"
              className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-700"
            >
              Doubt
            </Link>
            <Link
              to="/chat"
              className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-700"
            >
              Talk mate
            </Link>
          </div>

          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
