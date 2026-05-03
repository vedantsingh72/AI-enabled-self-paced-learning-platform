import api from "../services/api";

export const ensureAnonymousSession = async (college = "Unspecified") => {
  const existing = localStorage.getItem("anonymousId");
  if (existing) return existing;
  const { data } = await api.post("/auth/create-session", { college });
  localStorage.setItem("anonymousId", data.anonymousId);
  localStorage.setItem("college", data.college || college);
  return data.anonymousId;
};
