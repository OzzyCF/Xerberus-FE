/**
 * Width-preserving text scrambling.
 *
 * Replaces each character with a random one of similar visual width:
 * lowercase→lowercase, uppercase→uppercase, narrow→narrow, wide→wide.
 * Spaces preserved so React Native wraps identically to the original.
 */

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const PUNCT = ".,;:!?'-";
const NARROW = "iljtfr1!.,;:'";

const POOLS = {
  narrowLower: "iljtfr",
  wideLower: "abcdeghkmnopqsuvwxyz",
  narrowUpper: "IJL",
  wideUpper: "ABCDEGHKMNOPQRSUVWXYZ",
  narrowDigit: "1",
  wideDigit: "023456789",
};

function pickRandom(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

function scrambleChar(ch) {
  if (ch === " ") return " ";
  const isNarrow = NARROW.includes(ch);
  if (LOWER.includes(ch)) return pickRandom(isNarrow ? POOLS.narrowLower : POOLS.wideLower);
  if (UPPER.includes(ch)) return pickRandom(isNarrow ? POOLS.narrowUpper : POOLS.wideUpper);
  if (DIGITS.includes(ch)) return pickRandom(isNarrow ? POOLS.narrowDigit : POOLS.wideDigit);
  if (PUNCT.includes(ch)) return pickRandom(PUNCT);
  return pickRandom(POOLS.wideLower);
}

export function scrambleText(text) {
  return text.split("").map(scrambleChar).join("");
}
