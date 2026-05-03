import { useSyncExternalStore } from "react";

export const AUTH_CHANGE_EVENT = "mannmitra-auth-change";

/** Call after any login/logout that touches auth tokens so the navbar updates immediately. */
export function notifyAuthChange() {
  window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT));
}

/**
 * React requires getSnapshot to return a stable reference when data is unchanged.
 * A fresh object every time causes infinite re-renders with useSyncExternalStore.
 */
let snapshotCache = {
  userToken: null,
  adminToken: null,
  authRole: null,
};

export function getAuthFromStorage() {
  const userToken = localStorage.getItem("userToken");
  const adminToken = localStorage.getItem("adminToken");
  const authRole = localStorage.getItem("authRole");
  if (
    snapshotCache.userToken === userToken &&
    snapshotCache.adminToken === adminToken &&
    snapshotCache.authRole === authRole
  ) {
    return snapshotCache;
  }
  snapshotCache = { userToken, adminToken, authRole };
  return snapshotCache;
}

function subscribeAuth(onStoreChange) {
  const handler = () => onStoreChange();
  window.addEventListener(AUTH_CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/**
 * Reactive view of auth tokens for the navbar and other chrome.
 * Re-renders when tokens change (same tab via notifyAuthChange, other tabs via storage).
 */
export function useAuthSnapshot() {
  return useSyncExternalStore(
    subscribeAuth,
    getAuthFromStorage,
    getAuthFromStorage,
  );
}
