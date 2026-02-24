/** Validate priest username: pujari@templename */
export function validatePriestUsername(username: string): boolean {
  if (!username?.trim()) return false;
  const u = username.trim();
  return /^pujari@[a-zA-Z0-9_-]+$/.test(u) && u.length >= 12 && u.length <= 50;
}

/** Validate priest password: 2 caps, 2 digits, 2 small, 2 symbols; 10-20 chars */
export function validatePriestPassword(password: string): boolean {
  if (!password) return false;
  if (password.length < 10 || password.length > 20) return false;
  const caps = (password.match(/[A-Z]/g) || []).length;
  const digits = (password.match(/[0-9]/g) || []).length;
  const small = (password.match(/[a-z]/g) || []).length;
  const symbols = (password.match(/[^A-Za-z0-9]/g) || []).length;
  return caps >= 2 && digits >= 2 && small >= 2 && symbols >= 2;
}
