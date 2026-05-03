import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { notifyAuthChange, useAuthSnapshot } from "../hooks/useAuthSnapshot";

const linkBase =
  "rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors md:px-3";

/** Landing page only: section anchors + auth — no direct links to StudentGuard routes */
function LandingNavbar() {
  const navLink =
    "whitespace-nowrap text-[0.9375rem] font-medium text-slate-600 transition hover:text-wellness-sage";

  const items = [
    ["#hero", "Home"],
    ["#chat", "Talk mate"],
  ];

  return (
    <nav className="sticky top-0 z-40 border-b border-stone-200/90 bg-wellness-cream/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:max-w-7xl lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:py-3.5">
        <Link
          to="/"
          className="group flex shrink-0 items-center gap-3 text-left"
        >
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-200 via-amber-100 to-emerald-200 text-lg shadow-sm ring-1 ring-stone-200/80"
            aria-hidden
          >
            💚
          </span>
          <span className="min-w-0">
            <span className="block font-serif text-lg font-semibold tracking-tight text-slate-900">
              Mannmitra
            </span>
            <span className="block text-xs font-normal text-slate-500">
              Online learning
            </span>
          </span>
        </Link>

        <div className="-mx-1 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-1 sm:gap-x-6 lg:flex-1 lg:justify-center">
          {items.map(([href, label]) => (
            <a key={href} href={href} className={navLink}>
              {label}
            </a>
          ))}
        </div>

        <div className="flex justify-center lg:shrink-0 lg:justify-end">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-full bg-wellness-coral px-5 py-2.5 text-[0.9375rem] font-semibold text-white shadow-sm transition hover:bg-wellness-coralDeep"
          >
            <svg
              className="h-4 w-4 shrink-0"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Sign in
          </Link>
        </div>
      </div>
    </nav>
  );
}

function signOutStudent(navigate) {
  localStorage.removeItem("userToken");
  localStorage.removeItem("authRole");
  notifyAuthChange();
  navigate("/auth", { replace: true });
}

function signOutAdmin(navigate) {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("authRole");
  localStorage.removeItem("instituteName");
  notifyAuthChange();
  navigate("/auth", { replace: true });
}

function NavShell({ className, barClass, children }) {
  return (
    <nav className={`sticky top-0 z-40 ${className}`}>
      <div
        className={`mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 ${barClass}`}
      >
        {children}
      </div>
    </nav>
  );
}

/** Not signed in — minimal entry bar */
function PublicNavbar() {
  return (
    <NavShell className="border-b border-stone-200/80 bg-white/95 shadow-sm backdrop-blur-md">
      <Link
        to="/"
        className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900"
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-rose-200 via-amber-100 to-emerald-200 text-sm font-bold text-slate-800 shadow-sm ring-1 ring-stone-200/80"
          aria-hidden
        >
          M
        </span>
        Mannmitra
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/auth"
          className="mm-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm"
        >
          Sign in
        </Link>
      </div>
    </NavShell>
  );
}

/** Platform main admin — amber accent */
function MainAdminNavbar() {
  const navigate = useNavigate();
  const active =
    "bg-amber-500 text-white shadow-sm ring-1 ring-amber-600/30";
  const idle =
    "text-amber-950/80 hover:bg-amber-100/90 hover:text-amber-950";

  return (
    <NavShell className="border-b-2 border-amber-300/70 bg-gradient-to-r from-amber-50/95 via-wellness-cream to-amber-50/80 shadow-sm backdrop-blur-md">
      <Link
        to="/main-admin"
        className="flex items-center gap-2 text-xl font-bold tracking-tight text-amber-950"
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-sm font-bold text-white shadow-sm ring-1 ring-amber-600/20"
          aria-hidden
        >
          A
        </span>
        Mannmitra · Admin
      </Link>
      <div className="flex flex-wrap items-center gap-1">
        <NavLink
          to="/main-admin"
          end
          className={({ isActive }) => `${linkBase} ${isActive ? active : idle}`}
        >
          Control center
        </NavLink>
        <a
          href="/main-admin#learning-analytics"
          className={`${linkBase} ${idle}`}
        >
          Learning analytics
        </a>
        <a
          href="/main-admin#student-learning-insights"
          className={`${linkBase} ${idle}`}
        >
          Student insights
        </a>
        <a
          href="/main-admin#admin-registrations"
          className={`${linkBase} ${idle}`}
        >
          Registrations
        </a>
        <button
          type="button"
          onClick={() => signOutAdmin(navigate)}
          className={`${linkBase} text-amber-900/90 hover:bg-amber-100`}
        >
          Sign out
        </button>
      </div>
    </NavShell>
  );
}

/** Institute portal — slate / neutral */
function InstituteNavbar() {
  const navigate = useNavigate();
  const active =
    "bg-slate-700 text-white shadow-sm ring-1 ring-slate-600/30";
  const idle = "text-slate-600 hover:bg-slate-100 hover:text-slate-900";

  return (
    <NavShell className="border-b-2 border-slate-300/60 bg-gradient-to-r from-slate-50 to-slate-100/90 shadow-sm backdrop-blur-md">
      <Link
        to="/institute"
        className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-800"
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-600 text-sm font-bold text-white shadow-sm"
          aria-hidden
        >
          In
        </span>
        Mannmitra · Institute
      </Link>
      <div className="flex flex-wrap items-center gap-1">
        <NavLink
          to="/institute"
          end
          className={({ isActive }) => `${linkBase} ${isActive ? active : idle}`}
        >
          Dashboard
        </NavLink>
        <button
          type="button"
          onClick={() => signOutAdmin(navigate)}
          className={`${linkBase} text-rose-600 hover:bg-rose-50`}
        >
          Sign out
        </button>
      </div>
    </NavShell>
  );
}

/** Doubt teachers — teal accent */
function DoubtTeacherNavbar() {
  const navigate = useNavigate();
  const active =
    "bg-wellness-teal text-white shadow-sm ring-1 ring-wellness-teal/30";
  const idle =
    "text-slate-600 hover:bg-wellness-teal/10 hover:text-wellness-teal";

  return (
    <NavShell className="border-b-2 border-wellness-teal/30 bg-gradient-to-r from-white via-wellness-cream/90 to-white shadow-sm backdrop-blur-md">
      <Link
        to="/doubt-teacher"
        className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900"
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-wellness-teal text-sm font-bold text-white shadow-sm ring-1 ring-wellness-teal/25"
          aria-hidden
        >
          D
        </span>
        <span>
          <span className="mm-gradient-text">Mannmitra</span>
          <span className="ml-2 rounded-full bg-wellness-teal/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-wellness-teal">
            Doubt teacher
          </span>
        </span>
      </Link>
      <div className="flex flex-wrap items-center gap-1">
        <NavLink
          to="/doubt-teacher"
          end
          className={({ isActive }) => `${linkBase} ${isActive ? active : idle}`}
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/doubt-teacher/forum"
          className={({ isActive }) => `${linkBase} ${isActive ? active : idle}`}
        >
          Study squad
        </NavLink>
        <NavLink
          to="/doubt-teacher/video"
          className={({ isActive }) => `${linkBase} ${isActive ? active : idle}`}
        >
          Video
        </NavLink>
        <button
          type="button"
          onClick={() => signOutStudent(navigate)}
          className={`${linkBase} text-rose-600 hover:bg-rose-50`}
        >
          Sign out
        </button>
      </div>
    </NavShell>
  );
}

/** Counsellors — sage / cream (matches project wellness palette) */
function CounsellorNavbar() {
  const navigate = useNavigate();
  const active =
    "bg-wellness-sage text-white shadow-sm ring-1 ring-wellness-sage/30";
  const idle =
    "text-slate-600 hover:bg-wellness-sage/10 hover:text-wellness-sage";

  return (
    <NavShell className="border-b-2 border-wellness-sage/25 bg-gradient-to-r from-white via-wellness-cream/90 to-white shadow-sm backdrop-blur-md">
      <Link
        to="/counsellor"
        className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900"
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-wellness-sage text-sm font-bold text-white shadow-sm ring-1 ring-wellness-sage/30"
          aria-hidden
        >
          C
        </span>
        <span>
          <span className="mm-gradient-text">Mannmitra</span>
          <span className="ml-2 rounded-full bg-wellness-sage/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-wellness-sage">
            Counsellor
          </span>
        </span>
      </Link>
      <div className="flex flex-wrap items-center gap-1">
        <NavLink
          to="/counsellor"
          end
          className={({ isActive }) => `${linkBase} ${isActive ? active : idle}`}
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/counsellor/forum"
          className={({ isActive }) => `${linkBase} ${isActive ? active : idle}`}
        >
          Study squad
        </NavLink>
        <NavLink
          to="/counsellor/video"
          className={({ isActive }) => `${linkBase} ${isActive ? active : idle}`}
        >
          Video
        </NavLink>
        <button
          type="button"
          onClick={() => signOutStudent(navigate)}
          className={`${linkBase} text-rose-600 hover:bg-rose-50`}
        >
          Sign out
        </button>
      </div>
    </NavShell>
  );
}

/** Minimal bar on dedicated login pages */
function MinimalNavbar() {
  return (
    <NavShell className="border-b border-stone-200/90 bg-wellness-cream/95 shadow-sm backdrop-blur-md">
      <Link to="/" className="text-xl font-bold tracking-tight text-slate-900">
        Mannmitra
      </Link>
      <Link
        to="/auth"
        className={`${linkBase} text-slate-600 hover:bg-wellness-paper hover:text-slate-900`}
      >
        Back to sign in
      </Link>
    </NavShell>
  );
}

export default function Navbar() {
  const location = useLocation();
  const path = location.pathname;
  const navigate = useNavigate();

  const { authRole, userToken, adminToken } = useAuthSnapshot();
  const hasUser = !!userToken;
  const hasAdmin = !!adminToken;

  if (path === "/admin-login") {
    return <MinimalNavbar />;
  }

  if (path === "/auth") {
    return (
      <NavShell className="border-b border-stone-200/90 bg-wellness-cream/95 shadow-sm backdrop-blur-md">
        <Link to="/" className="text-xl font-bold tracking-tight text-slate-900">
          Mannmitra
        </Link>
        <Link
          to="/"
          className={`${linkBase} text-slate-600 hover:bg-wellness-paper hover:text-slate-900`}
        >
          Home
        </Link>
      </NavShell>
    );
  }

  const studentShell =
    hasUser &&
    ["student", "peer_mentor"].includes(authRole || "") &&
    /^\/(dashboard|learn|screening|booking|doubt-support|forum|video|chat)(\/|$)/.test(
      path,
    );
  if (studentShell) {
    return null;
  }

  if (hasAdmin && (authRole === "main_admin" || authRole === "admin")) {
    return <MainAdminNavbar />;
  }

  if (hasAdmin && authRole === "institute") {
    return <InstituteNavbar />;
  }

  if (hasUser && authRole === "doubt_teacher") {
    return <DoubtTeacherNavbar />;
  }

  if (hasUser && authRole === "counsellor") {
    return <CounsellorNavbar />;
  }

  if (hasUser && ["student", "peer_mentor"].includes(authRole || "") && path === "/") {
    return (
      <NavShell className="border-b-2 border-wellness-sage/25 bg-gradient-to-r from-white via-wellness-cream/90 to-white shadow-sm backdrop-blur-md">
        <Link
          to="/learn"
          className="flex items-center gap-2 text-xl font-bold text-slate-900"
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-wellness-sage text-sm font-bold text-white shadow-sm ring-1 ring-wellness-sage/30"
            aria-hidden
          >
            S
          </span>
          <span>
            <span className="mm-gradient-text">Mannmitra</span>
            <span className="ml-2 rounded-full bg-wellness-sage/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-wellness-sage">
              Student
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/learn"
            className="mm-btn-primary px-4 py-2 text-sm"
          >
            My courses
          </Link>
          <button
            type="button"
            onClick={() => signOutStudent(navigate)}
            className={`${linkBase} text-rose-600 hover:bg-rose-50`}
          >
            Sign out
          </button>
        </div>
      </NavShell>
    );
  }

  /* Signed-out home: marketing nav with anchors only — app routes stay behind StudentGuard */
  if (path === "/") {
    return <LandingNavbar />;
  }

  return <PublicNavbar />;
}
