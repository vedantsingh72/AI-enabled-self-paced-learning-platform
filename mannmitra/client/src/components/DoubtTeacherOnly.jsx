import { Navigate } from "react-router-dom";
import { useAuthSnapshot } from "../hooks/useAuthSnapshot";

export default function DoubtTeacherOnly({ children, fallbackTo }) {
  const { authRole } = useAuthSnapshot();
  if (authRole === "doubt_teacher") return children;
  return <Navigate to={fallbackTo} replace />;
}
