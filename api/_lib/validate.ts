/**
 * Tiny profanity / abusive name filter. Not exhaustive — the goal is to keep
 * casual abuse off a public leaderboard, not to be unbreakable.
 *
 * Approach: normalise the name (lowercase, strip common leet substitutions,
 * remove non-alphanumerics) then check for any banned substring.
 */

const BANNED = [
  'fuck',
  'shit',
  'bitch',
  'cunt',
  'nigger',
  'nigga',
  'faggot',
  'fag',
  'retard',
  'rape',
  'nazi',
  'hitler',
  'kike',
  'chink',
  'spic',
  'whore',
  'slut',
  'pussy',
  'dick',
  'cock',
];

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1|!/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4|@/g, 'a')
    .replace(/5|\$/g, 's')
    .replace(/7/g, 't')
    .replace(/[^a-z]/g, '');
}

export function isCleanName(name: string): boolean {
  const n = normalise(name);
  return !BANNED.some((b) => n.includes(b));
}

const NAME_RE = /^[A-Za-z0-9 _\-]{1,12}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,180}\.[^\s@]{1,20}$/;

export function isValidName(name: string): boolean {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 12 && NAME_RE.test(trimmed) && isCleanName(trimmed);
}

export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  return email.length <= 254 && EMAIL_RE.test(email);
}
