export const generatePublicAnonymousId = () => {
  const random = Math.floor(10000 + Math.random() * 89999);
  const suffix = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `USR-${random}${suffix}`;
};

export const toDisplayName = (publicAnonymousId) => {
  const visiblePart = (publicAnonymousId || "").replace("USR-", "");
  return `Anonymous User #${visiblePart}`;
};
