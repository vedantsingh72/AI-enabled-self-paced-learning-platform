import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function StudentGuard({ children }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      navigate("/auth");
      return;
    }
    const role = localStorage.getItem("authRole");
    if (role === "counsellor") {
      navigate("/counsellor", { replace: true });
      return;
    }
    if (role === "doubt_teacher") {
      navigate("/doubt-teacher", { replace: true });
      return;
    }
    setLoading(false);
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-6 text-slate-600">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-wellness-sage border-t-transparent" />
        <p className="text-sm">Loading…</p>
      </div>
    );
  }
  return children;
}
