import { Navigate } from "react-router-dom";
import { useAuthSnapshot } from "../hooks/useAuthSnapshot";

/**
 * Renders children only for signed-in counsellors; otherwise sends users to the
 * parallel student route (same feature, student shell).
 */
export default function CounsellorOnly({ children, fallbackTo }) {
  const { authRole } = useAuthSnapshot();
  if (authRole === "counsellor") return children;
  return <Navigate to={fallbackTo} replace />;
}
