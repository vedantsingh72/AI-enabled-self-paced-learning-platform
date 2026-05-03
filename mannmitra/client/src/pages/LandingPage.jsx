import { Link } from "react-router-dom";
import MentalHealthChatbot from "../components/MentalHealthChatbot";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-wellness-cream text-slate-800">
      <section id="hero" className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Mannmitra
        </h1>
        <p className="mt-3 text-slate-600">
          Online courses and adaptive study tools — with support options when you
          need them.
        </p>

        <div className="mt-10 flex flex-col gap-3">
          <Link
            to="/auth?type=student"
            className="rounded-xl bg-wellness-sage px-6 py-3.5 text-center text-base font-semibold text-white shadow-sm transition hover:opacity-95"
          >
            Student — sign up or log in
          </Link>
          <Link
            to="/auth?type=counsellor"
            className="rounded-xl border-2 border-wellness-sage bg-white px-6 py-3.5 text-center text-base font-semibold text-wellness-sage transition hover:bg-wellness-sage/5"
          >
            Counsellor — sign up or log in
          </Link>
          <Link
            to="/auth?type=doubt_teacher"
            className="rounded-xl border-2 border-wellness-teal/70 bg-white px-6 py-3.5 text-center text-base font-semibold text-wellness-teal transition hover:bg-wellness-teal/5"
          >
            Doubt teacher — sign up or log in
          </Link>
          <Link
            to="/auth?type=admin"
            className="text-center text-sm font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
          >
            Admin log in
          </Link>
        </div>
      </section>

      <section id="chat" className="mx-auto max-w-3xl border-t border-stone-200 px-4 py-12">
        <h2 className="text-center text-lg font-semibold text-slate-900">
          Talk mate
        </h2>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-slate-500">
          Try it below. Sign in as a student for the full in-app experience.
        </p>
        <div className="mt-6">
          <MentalHealthChatbot />
        </div>
      </section>
    </div>
  );
}
