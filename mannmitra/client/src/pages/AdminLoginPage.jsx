import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { notifyAuthChange } from "../hooks/useAuthSnapshot";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  const onLogin = async () => {
    try {
      setError("");
      const { data } = await api.post("/auth/admin-login", {
        username,
        password,
      });
      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("authRole", "main_admin");
      notifyAuthChange();
      navigate("/main-admin");
    } catch (_err) {
      setError("Invalid admin credentials");
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/90">
        Restricted
      </p>
      <h2 className="mt-2 mm-heading">Main admin login</h2>
      <div className="mt-4 space-y-3 mm-card border-amber-500/20">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mm-input w-full"
          placeholder="Username"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mm-input w-full"
          placeholder="Password"
        />
        <button type="button" onClick={onLogin} className="mm-btn-primary w-full">
          Login as Main Admin
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
