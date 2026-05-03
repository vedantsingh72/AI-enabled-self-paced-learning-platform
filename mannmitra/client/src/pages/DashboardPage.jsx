import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../services/api";

export default function DashboardPage() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    api
      .get("/privacy/status")
      .then(({ data }) => setProfile(data))
      .catch(() => {});
  }, []);

  return (
    <div className="px-4 py-8 md:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wellness-sage">
        Overview
      </p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
        Welcome back
        {profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-2 max-w-xl text-sm text-slate-600">
        Your hub is built around courses. Open a track, watch lessons, and use
        the sidebar for screening, counselling, doubt support, Study squad,
        video, and Talk mate.
      </p>

      <div className="mt-8 flex max-w-lg flex-col gap-4 sm:flex-row sm:gap-6">
        <Link
          to="/learn"
          className="flex flex-1 flex-col rounded-2xl border-2 border-wellness-sage bg-wellness-sage/5 p-6 transition hover:bg-wellness-sage/10"
        >
          <span className="text-sm font-semibold uppercase tracking-wide text-wellness-sage">
            Continue learning
          </span>
          <span className="mt-2 text-lg font-bold text-slate-900">
            Go to my courses
          </span>
          <span className="mt-1 text-sm text-slate-600">
            Browse modules, watch videos, and track your progress.
          </span>
        </Link>
        <Link
          to="/doubt-support"
          className="flex flex-1 flex-col rounded-2xl border-2 border-wellness-teal/60 bg-wellness-teal/5 p-6 transition hover:bg-wellness-teal/10"
        >
          <span className="text-sm font-semibold uppercase tracking-wide text-wellness-teal">
            Video doubt support
          </span>
          <span className="mt-2 text-lg font-bold text-slate-900">
            Book a doubt teacher
          </span>
          <span className="mt-1 text-sm text-slate-600">
            Live video help for subject questions — same booking flow as
            counselling.
          </span>
        </Link>
      </div>

      {profile ? (
        <div className="mt-8 max-w-md rounded-xl border border-stone-200 bg-white p-4 text-sm">
          <p className="font-medium text-slate-900">
            {profile.name || profile.displayName}
          </p>
          {profile.username ? (
            <p className="mt-1 text-slate-600">@{profile.username}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
