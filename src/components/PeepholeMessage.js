/**
 * PeepholeMessage — the core message bubble for Xerberus.
 *
 * Text is split into a word array. Each word knows its Y position.
 * Peephole reveals words near the finger. Freeze stores word indices.
 * On partial burn, frozen words are extracted and the rest is destroyed.
 *
 * State machine:
 *   UNREAD → BURNING → BURNED (no frozen words)
 *                    → FROZEN_ONLY → BURNED (melt timer or manual burn)
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, Animated, TouchableOpacity, StyleSheet } from "react-native";
import { scrambleText } from "../utils/scramble_text";

// ============================================================
// Config
// ============================================================

const PADDING = 12;
const REVEAL_RANGE_PX = 25;      // ~1.25 lines above/below finger = 3 lines visible
const FADE_RANGE_PX = 12;        // tight fade into scramble
const BURN_SECONDS = 10;         // TODO: 100 for production
const FREEZE_SECONDS = 120;      // TODO: 3600 for production
const LINGER_MS = 5000;
const DOUBLE_TAP_WINDOW_MS = 400;

const STATE_UNREAD = "unread";
const STATE_BURNING = "burning";
const STATE_FROZEN_ONLY = "frozen_only";
const STATE_FADING = "fading";
const STATE_BURNED = "burned";

// ============================================================
// Helpers
// ============================================================

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Calculate word opacity based on distance from finger Y.
 * Returns: { opacity: number, isRevealed: boolean }
 */
function getWordVisibility(wordY, wordHeight, fingerY) {
  if (fingerY === null) return { opacity: 0, isRevealed: false };

  const wordCenter = wordY + wordHeight / 2;
  const distance = Math.abs(wordCenter - fingerY);

  if (distance <= REVEAL_RANGE_PX) {
    return { opacity: 1.0, isRevealed: true };
  }
  if (distance <= REVEAL_RANGE_PX + FADE_RANGE_PX) {
    const fadeProgress = (distance - REVEAL_RANGE_PX) / FADE_RANGE_PX;
    return { opacity: 1.0 - fadeProgress * 0.8, isRevealed: true };
  }
  if (distance <= REVEAL_RANGE_PX + FADE_RANGE_PX * 2) {
    const fadeProgress = (distance - REVEAL_RANGE_PX - FADE_RANGE_PX) / FADE_RANGE_PX;
    return { opacity: 0.2 - fadeProgress * 0.13, isRevealed: true };
  }
  return { opacity: 0, isRevealed: false };
}

// ============================================================
// Word component — self-contained, measures its own position
// ============================================================

/**
 * Single word in the peephole. Measures its own Y position relative
 * to the wordContainer. fingerY is adjusted by PADDING before being
 * passed in, so the coordinate spaces match.
 */
function PeepholeWord({ word, scrambled, adjustedFingerY, isFrozen, isFrozenOnly, onLayout, index }) {
  const [wordY, setWordY] = useState(null);
  const [wordHeight, setWordHeight] = useState(20);

  const handleLayout = (e) => {
    const { y, height } = e.nativeEvent.layout;
    setWordY(y);
    setWordHeight(height);
    onLayout?.(index, y, height);
  };

  const isBlue = isFrozen || isFrozenOnly;
  let displayText = scrambled;
  let color = isBlue ? "#1a3a5c" : "#444444";

  if (wordY !== null && adjustedFingerY !== null) {
    const { opacity, isRevealed } = getWordVisibility(wordY, wordHeight, adjustedFingerY);
    if (isRevealed) {
      displayText = word;
      const baseColor = isBlue ? [74, 158, 255] : [255, 255, 255];
      color = `rgba(${baseColor.join(",")},${opacity.toFixed(2)})`;
    }
  }

  return (
    <Text style={{ color, fontSize: 15, lineHeight: 20 }} onLayout={handleLayout}>
      {displayText}
    </Text>
  );
}

// ============================================================
// Main component
// ============================================================

export default function PeepholeMessage({ text, isMine, onRevealStart, onRevealEnd, onBurned, onFreeze, status }) {

  // --- Sender: plain text ---
  if (isMine) {
    return (
      <View style={[styles.bubble, styles.senderBubble]}>
        {status ? (
          <Text style={styles.statusText}>
            {status === "burned" && "Message read and burned"}
            {status === "frozen" && "Message read — parts frozen"}
            {status === "read" && "Message read"}
          </Text>
        ) : (
          <Text style={styles.messageText}>{text}</Text>
        )}
      </View>
    );
  }

  // ============================================================
  // Word arrays (stable across renders)
  // ============================================================

  const wordsRef = useRef(text.split(" "));
  const scrambledWordsRef = useRef(wordsRef.current.map((w) => scrambleText(w)));

  // ============================================================
  // State
  // ============================================================

  const [messageState, setMessageState] = useState(STATE_UNREAD);
  const [burnSecondsLeft, setBurnSecondsLeft] = useState(null);
  const [freezeSecondsLeft, setFreezeSecondsLeft] = useState(null);
  const [frozenWordIndices, setFrozenWordIndices] = useState(new Set());
  const [fingerY, setFingerY] = useState(null);
  const [lingerY, setLingerY] = useState(null);
  const [isInLingerMode, setIsInLingerMode] = useState(false);

  // Frozen-only mode: reduced word arrays
  const [frozenWords, setFrozenWords] = useState(null);
  const [frozenScrambledWords, setFrozenScrambledWords] = useState(null);

  const isPeeping = fingerY !== null;

  // ============================================================
  // Refs
  // ============================================================

  const frozenWordIndicesRef = useRef(frozenWordIndices);
  const wordPositionsRef = useRef({});    // { index: { y, height } }
  const burnTimerRef = useRef(null);
  const freezeTimerRef = useRef(null);
  const lingerTimeoutRef = useRef(null);
  const lastRenderKeyRef = useRef("");
  const burnFadeAnim = useRef(new Animated.Value(1)).current;
  const tapCountRef = useRef(0);
  const tapResetTimerRef = useRef(null);

  useEffect(() => { frozenWordIndicesRef.current = frozenWordIndices; }, [frozenWordIndices]);

  // ============================================================
  // State transitions
  // ============================================================

  const transitionTo = useCallback((newState) => {
    console.log(`[Peephole] ${messageState} → ${newState}`);
    setMessageState(newState);
  }, [messageState]);

  const startBurnFadeOut = useCallback(() => {
    console.log("[Peephole] Starting burn fade-out");
    transitionTo(STATE_FADING);
    Animated.timing(burnFadeAnim, {
      toValue: 0,
      duration: 1500,
      useNativeDriver: true,
    }).start(() => {
      console.log("[Peephole] Fade complete → burned");
      setMessageState(STATE_BURNED);
      onBurned?.();
    });
  }, [transitionTo, burnFadeAnim, onBurned]);

  const transitionToFrozenOnly = useCallback(() => {
    const frozenSet = frozenWordIndicesRef.current;
    if (frozenSet.size === 0) {
      startBurnFadeOut();
      return;
    }

    const frozen = wordsRef.current.filter((_, i) => frozenSet.has(i));
    const frozenScrambled = frozen.map((w) => scrambleText(w));

    console.log(`[Peephole] Extracting ${frozen.length} frozen words from ${wordsRef.current.length} total`);

    setFrozenWords(frozen);
    setFrozenScrambledWords(frozenScrambled);
    burnFadeAnim.setValue(1);
    wordPositionsRef.current = {};
    transitionTo(STATE_FROZEN_ONLY);

    // Notify parent so it can call PUT /messages/{id}/freeze
    onFreeze?.(frozen);
  }, [transitionTo, startBurnFadeOut, onFreeze]);

  // ============================================================
  // Timers
  // ============================================================

  // Burn countdown — pauses while peeping or lingering
  useEffect(() => {
    if (messageState !== STATE_BURNING || burnSecondsLeft === null || burnSecondsLeft <= 0) return;
    if (isPeeping || isInLingerMode) {
      clearInterval(burnTimerRef.current);
      return;
    }

    burnTimerRef.current = setInterval(() => {
      setBurnSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(burnTimerRef.current);
          console.log("[Peephole] Burn timer reached 0");
          if (frozenWordIndicesRef.current.size > 0) {
            setTimeout(() => transitionToFrozenOnly(), 0);
          } else {
            setTimeout(() => startBurnFadeOut(), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(burnTimerRef.current);
  }, [messageState, burnSecondsLeft !== null, isPeeping, isInLingerMode]);

  // Freeze countdown
  useEffect(() => {
    if (freezeSecondsLeft === null || freezeSecondsLeft <= 0) return;

    freezeTimerRef.current = setInterval(() => {
      setFreezeSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(freezeTimerRef.current);
          console.log("[Peephole] Freeze timer reached 0, melting");
          setTimeout(() => startBurnFadeOut(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(freezeTimerRef.current);
  }, [freezeSecondsLeft !== null]);

  // ============================================================
  // Linger management
  // ============================================================

  const startLingerTimer = () => {
    clearTimeout(lingerTimeoutRef.current);
    lingerTimeoutRef.current = setTimeout(() => {
      console.log("[Peephole] Linger expired");
      setLingerY(null);
      setIsInLingerMode(false);
    }, LINGER_MS);
  };

  // ============================================================
  // Touch handlers
  // ============================================================

  const handleTouchStart = (e) => {
    if (messageState === STATE_BURNED || messageState === STATE_FADING) return;

    const y = e.nativeEvent.locationY;

    // Double-tap during linger → freeze visible words
    if (isInLingerMode && messageState === STATE_BURNING) {
      tapCountRef.current += 1;
      clearTimeout(tapResetTimerRef.current);

      if (tapCountRef.current >= 2) {
        tapCountRef.current = 0;
        freezeVisibleWords();
        return;
      }

      tapResetTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, DOUBLE_TAP_WINDOW_MS);
      return;
    }

    // Normal touch: start peeping
    clearTimeout(lingerTimeoutRef.current);
    setIsInLingerMode(false);
    setLingerY(null);
    tapCountRef.current = 0;

    if (messageState === STATE_UNREAD) {
      transitionTo(STATE_BURNING);
      setBurnSecondsLeft(BURN_SECONDS);
    }

    setFingerY(y);
    onRevealStart?.();
  };

  const handleTouchMove = (e) => {
    if (messageState === STATE_BURNED || messageState === STATE_FADING) return;
    if (isInLingerMode) return;
    setFingerY(e.nativeEvent.locationY);
  };

  const handleTouchEnd = () => {
    if (isInLingerMode) return;

    const lastY = fingerY;
    setFingerY(null);
    onRevealEnd?.();

    if (lastY !== null && (messageState === STATE_BURNING || messageState === STATE_FROZEN_ONLY)) {
      setLingerY(lastY);
      setIsInLingerMode(true);
      startLingerTimer();
      console.log(`[Peephole] Linger started at Y=${Math.round(lastY)}`);
    }
  };

  // ============================================================
  // Freeze / manual burn
  // ============================================================

  /** Freeze all words currently visible in the peephole window. */
  const freezeVisibleWords = () => {
    if (burnSecondsLeft !== null && burnSecondsLeft <= 0) return;

    if (lingerY === null) return;
    const adjustedY = lingerY - PADDING;

    const positions = wordPositionsRef.current;
    const newFrozen = new Set(frozenWordIndices);
    let frozeCount = 0;

    Object.entries(positions).forEach(([idx, pos]) => {
      const { opacity, isRevealed } = getWordVisibility(pos.y, pos.height, adjustedY);
      if (isRevealed && opacity > 0.3) {
        newFrozen.add(parseInt(idx));
        frozeCount++;
      }
    });

    console.log(`[Peephole] Froze ${frozeCount} words, total frozen: ${newFrozen.size}`);
    setFrozenWordIndices(newFrozen);

    if (freezeSecondsLeft === null) setFreezeSecondsLeft(FREEZE_SECONDS);
    startLingerTimer();
  };

  const handleManualBurn = () => {
    console.log("[Peephole] Manual burn triggered");
    clearInterval(burnTimerRef.current);
    clearInterval(freezeTimerRef.current);
    clearTimeout(lingerTimeoutRef.current);
    startBurnFadeOut();
  };

  // ============================================================
  // Word layout callback
  // ============================================================

  const handleWordLayout = useCallback((index, y, height) => {
    wordPositionsRef.current[index] = { y, height };
  }, []);

  // ============================================================
  // Derived values
  // ============================================================

  if (messageState === STATE_BURNED) return null;

  const isFading = messageState === STATE_FADING;
  const isFrozenOnly = messageState === STATE_FROZEN_ONLY || (isFading && frozenWords !== null);

  const currentWords = isFrozenOnly ? frozenWords : wordsRef.current;
  const currentScrambled = isFrozenOnly ? frozenScrambledWords : scrambledWordsRef.current;

  if (isFrozenOnly && !currentWords) return null;

  // Adjust fingerY from bubble-relative to wordContainer-relative
  const rawActiveY = isPeeping ? fingerY : (lingerY ?? null);
  const activeY = rawActiveY !== null ? rawActiveY - PADDING : null;
  const hasFrozen = frozenWordIndices.size > 0;
  const isBurnTimerVisible = messageState === STATE_BURNING && burnSecondsLeft > 0;
  const isFreezeTimerVisible = freezeSecondsLeft !== null && freezeSecondsLeft > 0 && (hasFrozen || isFrozenOnly);
  const showLingerHint = isInLingerMode && messageState === STATE_BURNING && burnSecondsLeft > 0;
  const isBurnButtonVisible = hasFrozen || isFrozenOnly;

  // Throttled render log
  const renderKey = `${messageState}|${isFrozenOnly}|${activeY !== null}|${frozenWordIndices.size}|${isInLingerMode}`;
  if (renderKey !== lastRenderKeyRef.current) {
    lastRenderKeyRef.current = renderKey;
    console.log(`[Peephole:render] state=${messageState} frozen=${isFrozenOnly} peeping=${activeY !== null} frozenWords=${frozenWordIndices.size} linger=${isInLingerMode}`);
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.bubble,
          isFrozenOnly ? styles.frozenBubble : styles.receiverBubble,
          { opacity: burnFadeAnim },
        ]}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouchStart}
        onResponderMove={handleTouchMove}
        onResponderRelease={handleTouchEnd}
        onResponderTerminate={() => { setFingerY(null); setIsInLingerMode(false); }}
      >
        <View style={styles.wordContainer}>
          {currentWords.map((word, i) => (
            <PeepholeWord
              key={i}
              word={word}
              scrambled={currentScrambled[i]}
              adjustedFingerY={activeY}
              isFrozen={!isFrozenOnly && frozenWordIndices.has(i)}
              isFrozenOnly={isFrozenOnly}
              onLayout={handleWordLayout}
              index={i}
            />
          ))}
        </View>

        {/* Linger hint */}
        {showLingerHint && (
          <Text style={styles.lingerHint}>double-tap to freeze</Text>
        )}

        {/* Timers */}
        <View style={styles.timerRow}>
          {isBurnTimerVisible && (
            <Text style={styles.burnTimer}>Burns in {formatCountdown(burnSecondsLeft)}</Text>
          )}
          {isFreezeTimerVisible && (
            <Text style={styles.freezeTimer}>Frozen — melts in {formatCountdown(freezeSecondsLeft)}</Text>
          )}
        </View>
      </Animated.View>

      {/* Burn now button */}
      {isBurnButtonVisible && (
        <TouchableOpacity style={styles.burnNowButton} onPress={handleManualBurn}>
          <Text style={styles.burnNowText}>Burn now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  container: {
    maxWidth: "75%",
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  bubble: {
    padding: PADDING,
    borderRadius: 16,
  },
  receiverBubble: {
    backgroundColor: "#1c1c2e",
    borderBottomLeftRadius: 4,
  },
  senderBubble: {
    maxWidth: "75%",
    padding: PADDING,
    borderRadius: 16,
    backgroundColor: "#1a1a1a",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
    marginBottom: 8,
  },
  frozenBubble: {
    backgroundColor: "#0d1b2a",
    borderWidth: 1,
    borderColor: "#1a3a5c",
    borderBottomLeftRadius: 4,
  },
  wordContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  messageText: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 20,
  },
  scrambled: {
    color: "#444444",
  },
  frozenScrambled: {
    color: "#1a3a5c",
  },
  statusText: {
    color: "#666666",
    fontSize: 12,
    fontStyle: "italic",
  },
  lingerHint: {
    color: "#4a9eff",
    fontSize: 10,
    textAlign: "center",
    marginTop: 4,
    fontStyle: "italic",
  },
  timerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  burnTimer: {
    color: "#ff3b30",
    fontSize: 11,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  freezeTimer: {
    color: "#4a9eff",
    fontSize: 11,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  burnNowButton: {
    alignSelf: "flex-end",
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "#1a0a0a",
    borderWidth: 1,
    borderColor: "#ff3b30",
  },
  burnNowText: {
    color: "#ff3b30",
    fontSize: 10,
    fontWeight: "600",
  },
});
