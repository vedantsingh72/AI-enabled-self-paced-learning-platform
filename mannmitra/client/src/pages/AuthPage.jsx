import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { notifyAuthChange } from "../hooks/useAuthSnapshot";

/**
 * Student, Counsellor, Doubt teacher: sign up + log in. Admin: log in only.
 */
export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState("login");
  const [account, setAccount] = useState("student");

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [institute, setInstitute] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const t = (searchParams.get("type") || "student").toLowerCase();
    if (t === "counsellor") setAccount("counsellor");
    else if (t === "doubt_teacher") setAccount("doubt_teacher");
    else if (t === "admin") setAccount("admin");
    else setAccount("student");
  }, [searchParams]);

  useEffect(() => {
    if (account === "admin" && mode === "signup") setMode("login");
  }, [account, mode]);

  const setAccountType = (next) => {
    setAccount(next);
    setSearchParams(next === "student" ? {} : { type: next });
    setError("");
  };

  const submit = async () => {
    try {
      setError("");
      if (mode === "signup" && account === "admin") {
        setError("Admin accounts are issued by the platform. Use Log in.");
        return;
      }

      if (mode === "signup" && account === "counsellor") {
        const { data } = await api.post("/auth/signup-counsellor", {
          name,
          username,
          email,
          password,
          institute,
          speciality,
        });
        localStorage.setItem("userToken", data.token);
        localStorage.removeItem("adminToken");
        localStorage.setItem("authRole", data.user.role);
        notifyAuthChange();
        navigate("/counsellor");
        return;
      }

      if (mode === "signup" && account === "doubt_teacher") {
        const { data } = await api.post("/auth/signup-doubt-teacher", {
          name,
          username,
          email,
          password,
          institute,
          speciality,
        });
        localStorage.setItem("userToken", data.token);
        localStorage.removeItem("adminToken");
        localStorage.setItem("authRole", data.user.role);
        notifyAuthChange();
        navigate("/doubt-teacher");
        return;
      }

      if (mode === "signup" && account === "student") {
        const { data } = await api.post("/auth/signup", {
          name,
          username,
          email,
          password,
          institute,
        });
        localStorage.setItem("userToken", data.token);
        localStorage.removeItem("adminToken");
        localStorage.setItem("authRole", data.user.role);
        notifyAuthChange();
        navigate("/dashboard");
        return;
      }

      const { data } = await api.post("/auth/login", { email, password });
      if (["main_admin", "institute", "admin"].includes(data.user.role)) {
        localStorage.setItem("adminToken", data.token);
        localStorage.removeItem("userToken");
        localStorage.setItem("authRole", data.user.role);
        if (data.user.role === "institute" && data.user.institute) {
          localStorage.setItem("instituteName", data.user.institute);
        } else {
          localStorage.removeItem("instituteName");
        }
        notifyAuthChange();
        navigate(
          data.user.role === "institute" ? "/institute" : "/main-admin",
        );
      } else {
        localStorage.setItem("userToken", data.token);
        localStorage.removeItem("adminToken");
        localStorage.setItem("authRole", data.user.role);
        notifyAuthChange();
        if (data.user.role === "counsellor") navigate("/counsellor");
        else if (data.user.role === "doubt_teacher") navigate("/doubt-teacher");
        else navigate("/dashboard");
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Something went wrong");
    }
  };

  const pill =
    "rounded-full px-4 py-2 text-sm font-medium transition border";
  const pillOn = "border-wellness-sage bg-wellness-sage/15 text-wellness-sage";
  const pillOff =
    "border-stone-200 bg-white text-slate-600 hover:border-stone-300";

  const showSignupFields =
    mode === "signup" &&
    (account === "student" ||
      account === "counsellor" ||
      account === "doubt_teacher");

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-wellness-cream px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <Link
          to="/"
          className="text-sm font-medium text-wellness-sage hover:underline"
        >
          ← Home
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-slate-900">Mannmitra</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in or create an account</p>

        <div className="mt-8 flex flex-wrap gap-2">
          {[
            ["student", "Student"],
            ["counsellor", "Counsellor"],
            ["doubt_teacher", "Doubt teacher"],
            ["admin", "Admin"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setAccountType(id)}
              className={`${pill} ${account === id ? pillOn : pillOff}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6 flex gap-2 rounded-xl border border-stone-200 bg-white p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${
              mode === "login"
                ? "bg-wellness-sage text-white"
                : "text-slate-600"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError("");
            }}
            disabled={account === "admin"}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
              mode === "signup"
                ? "bg-wellness-sage text-white"
                : "text-slate-600"
            }`}
          >
            Sign up
          </button>
        </div>

        {account === "admin" && mode === "signup" ? (
          <p className="mt-4 text-sm text-amber-800">
            Admin access is not self-service. Use <strong>Log in</strong> with
            credentials you were given.
          </p>
        ) : null}
        {account === "admin" && mode === "login" ? (
          <p className="mt-3 text-xs text-slate-500">
            Platform admin, institute staff, or env-configured main admin.
          </p>
        ) : null}

        <div className="mt-6 space-y-3">
          {showSignupFields ? (
            <>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mm-input w-full"
                placeholder="Full name"
                autoComplete="name"
              />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mm-input w-full"
                placeholder="Username"
                autoComplete="username"
              />
            </>
          ) : null}

          {(mode === "login" || showSignupFields) && account !== "admin" ? (
            <>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mm-input w-full"
                placeholder="Email"
                autoComplete="email"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mm-input w-full"
                placeholder="Password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
            </>
          ) : null}

          {account === "admin" && mode === "login" ? (
            <>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mm-input w-full"
                placeholder="Email"
                autoComplete="username"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mm-input w-full"
                placeholder="Password"
                autoComplete="current-password"
              />
            </>
          ) : null}

          {showSignupFields ? (
            <input
              value={institute}
              onChange={(e) => setInstitute(e.target.value)}
              className="mm-input w-full"
              placeholder={
                account === "counsellor" || account === "doubt_teacher"
                  ? "Organization / institute"
                  : "School / institute"
              }
            />
          ) : null}

          {showSignupFields && account === "counsellor" ? (
            <input
              value={speciality}
              onChange={(e) => setSpeciality(e.target.value)}
              className="mm-input w-full"
              placeholder="Speciality (e.g. clinical psychology)"
            />
          ) : null}

          {showSignupFields && account === "doubt_teacher" ? (
            <input
              value={speciality}
              onChange={(e) => setSpeciality(e.target.value)}
              className="mm-input w-full"
              placeholder="Subjects you teach (e.g. Physics, Calculus)"
            />
          ) : null}
        </div>

        <button
          type="button"
          onClick={submit}
          className="mm-btn-primary mt-6 w-full py-3 text-base"
          disabled={mode === "signup" && account === "admin"}
        >
          {mode === "login" ? "Log in" : "Create account"}
        </button>

        {error ? (
          <p className="mt-3 text-center text-sm text-red-600">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
