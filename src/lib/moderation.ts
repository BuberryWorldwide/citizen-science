// Server-side text moderation for user-submitted free-text fields.
// Checks: species_variety, notes, project name/description.
// Predefined chip-select fields (species, health, phenology, etc.) don't need filtering.

// Slurs, hate speech, and severe profanity. Kept tight to avoid false positives
// on legitimate botanical or geographic terms. Add to this as needed.
const BLOCKED_PATTERNS: RegExp[] = [
  // Slurs (word-boundary wrapped to avoid partial matches like "niggardly" → kept out intentionally)
  /\bn[i1!][gq]{1,2}[e3]r/i,
  /\bf[a@]g{1,2}[o0]t/i,
  /\bk[i1!]ke\b/i,
  /\bch[i1!]nk\b/i,
  /\bsp[i1!]c\b/i,
  /\bw[e3]tb[a@]ck/i,
  /\bc[o0]{2}n\b/i,
  /\btr[a@]nn/i,
  /\br[e3]t[a@]rd/i,

  // Severe profanity
  /\bf+u+c+k/i,
  /\bs+h+[i1!]+t+\b/i,
  /\bc+u+n+t+\b/i,
  /\ba+s+s+h+o+l+e/i,
  /\bb[i1!]tch/i,
  /\bd[i1!]ck\b/i,
  /\bp[e3]n[i1!]s/i,
  /\bcock\b/i,
  /\bpussy\b/i,

  // Threats / hate
  /\bkill\s+(your|my|the|all)\b/i,
  /\brape\b/i,
  /\bheil\s+hitler/i,
  /\bwhite\s+power/i,
  /\bgas\s+the\b/i,
];

export interface ModerationResult {
  passed: boolean;
  field?: string;
}

/**
 * Check a single string against the blocklist.
 */
function checkText(text: string): boolean {
  return !BLOCKED_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Moderate a record's free-text fields before database insertion.
 * Pass a map of field names to values — only non-empty strings are checked.
 * Returns { passed: true } or { passed: false, field: "fieldName" }.
 */
export function moderate(fields: Record<string, unknown>): ModerationResult {
  for (const [field, value] of Object.entries(fields)) {
    if (typeof value === 'string' && value.trim() && !checkText(value)) {
      return { passed: false, field };
    }
  }
  return { passed: true };
}
