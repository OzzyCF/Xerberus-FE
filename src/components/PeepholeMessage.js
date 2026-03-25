import { useState, useRef, useEffect } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const PUNCT = ".,;:!?'-";
const NARROW = "iljtfr1!.,;:'";

const PADDING = 12;
const REVEAL_RANGE = 1;
const BURN_SECONDS = 10; // TODO: set to 100 for production
const FADE_DURATION = 1500;

function randomFrom(set) {
  return set[Math.floor(Math.random() * set.length)];
}

function scrambleChar(ch) {
  if (ch === " ") return " ";
  const isNarrow = NARROW.includes(ch);
  if (LOWER.includes(ch)) {
    const pool = isNarrow ? "iljtfr" : "abcdeghkmnopqsuvwxyz";
    return randomFrom(pool);
  }
  if (UPPER.includes(ch)) {
    const pool = isNarrow ? "IJL" : "ABCDEGHKMNOPQRSUVWXYZ";
    return randomFrom(pool);
  }
  if (DIGITS.includes(ch)) {
    const pool = isNarrow ? "1" : "023456789";
    return randomFrom(pool);
  }
  if (PUNCT.includes(ch)) return randomFrom(PUNCT);
  return randomFrom(LOWER);
}

function scrambleText(text) {
  return text.split("").map(scrambleChar).join("");
}

export default function PeepholeMessage({ text, isMine, onRevealStart, onRevealEnd, onBurned }) {
  const [fingerY, setFingerY] = useState(null);
  const [burnCountdown, setBurnCountdown] = useState(null);
  const [isBurned, setIsBurned] = useState(false);
  const scrambled = useRef(scrambleText(text)).current;
  const textLines = useRef([]);
  const hasBeenRevealed = useRef(false);
  const burnInterval = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Start burn countdown on first reveal
  useEffect(() => {
    if (fingerY !== null && !hasBeenRevealed.current && burnCountdown === null) {
      hasBeenRevealed.current = true;
      setBurnCountdown(BURN_SECONDS);
    }
  }, [fingerY]);

  // Tick the countdown
  useEffect(() => {
    if (burnCountdown === null || burnCountdown <= 0) return;

    burnInterval.current = setInterval(() => {
      setBurnCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(burnInterval.current);
          triggerBurn();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(burnInterval.current);
  }, [burnCountdown !== null]);

  const triggerBurn = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: FADE_DURATION,
      useNativeDriver: true,
    }).start(() => {
      setIsBurned(true);
      onBurned?.();
    });
  };

  const handleTextLayout = (e) => {
    textLines.current = e.nativeEvent.lines.map((line) => ({
      text: line.text,
      y: line.y,
      height: line.height,
    }));
  };

  const getFingerLineIndex = () => {
    if (fingerY === null || textLines.current.length === 0) return -1;
    const y = fingerY - PADDING;
    for (let i = 0; i < textLines.current.length; i++) {
      const line = textLines.current[i];
      if (y >= line.y && y < line.y + line.height) return i;
    }
    if (y >= 0) return textLines.current.length - 1;
    return 0;
  };

  const getOpacity = (lineIndex, fingerLineIndex) => {
    const distance = Math.abs(lineIndex - fingerLineIndex);
    if (distance <= REVEAL_RANGE) return 1.0;
    if (distance === REVEAL_RANGE + 1) return 0.4;
    if (distance === REVEAL_RANGE + 2) return 0.15;
    return null;
  };

  const handleTouchStart = (e) => {
    if (isBurned) return;
    setFingerY(e.nativeEvent.locationY);
    onRevealStart?.();
  };

  const handleTouchMove = (e) => {
    if (isBurned) return;
    setFingerY(e.nativeEvent.locationY);
  };

  const handleTouchEnd = () => {
    setFingerY(null);
    onRevealEnd?.();
  };

  if (isBurned) return null;

  const fingerLineIndex = getFingerLineIndex();
  const isRevealing = fingerY !== null && fingerLineIndex >= 0;

  const renderRevealedText = () => {
    if (!isRevealing || textLines.current.length === 0) {
      return <Text style={[styles.text, styles.scrambled]}>{scrambled}</Text>;
    }

    const parts = [];
    let charIndex = 0;

    for (let li = 0; li < textLines.current.length; li++) {
      const lineText = textLines.current[li].text;
      const opacity = getOpacity(li, fingerLineIndex);

      for (let ci = 0; ci < lineText.length; ci++) {
        if (charIndex < text.length) {
          if (opacity !== null) {
            parts.push(
              <Text key={charIndex} style={{ color: `rgba(255,255,255,${opacity})` }}>
                {text[charIndex]}
              </Text>
            );
          } else {
            parts.push(
              <Text key={charIndex} style={styles.scrambled}>
                {scrambled[charIndex]}
              </Text>
            );
          }
          charIndex++;
        }
      }
    }

    while (charIndex < text.length) {
      parts.push(
        <Text key={charIndex} style={styles.scrambled}>
          {scrambled[charIndex]}
        </Text>
      );
      charIndex++;
    }

    return <Text style={styles.text}>{parts}</Text>;
  };

  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Animated.View
      style={[
        styles.bubble,
        isMine ? styles.mine : styles.theirs,
        { opacity: fadeAnim },
      ]}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleTouchStart}
      onResponderMove={handleTouchMove}
      onResponderRelease={handleTouchEnd}
      onResponderTerminate={handleTouchEnd}
    >
      {/* Hidden text to capture layout */}
      <Text
        style={[styles.text, styles.hidden]}
        onTextLayout={handleTextLayout}
      >
        {text}
      </Text>

      {/* Visible text */}
      <View style={styles.overlay}>
        {renderRevealedText()}
      </View>

      {/* Burn countdown */}
      {burnCountdown !== null && (
        <Text style={styles.countdown}>
          {formatCountdown(burnCountdown)}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: "75%",
    padding: PADDING,
    borderRadius: 16,
    marginBottom: 8,
  },
  mine: {
    backgroundColor: "#1a1a1a",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  theirs: {
    backgroundColor: "#1c1c2e",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  text: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 20,
  },
  scrambled: {
    color: "#444444",
  },
  hidden: {
    position: "absolute",
    opacity: 0,
    top: PADDING,
    left: PADDING,
    right: PADDING,
  },
  overlay: {
    minHeight: 20,
  },
  countdown: {
    color: "#ff3b30",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "right",
    marginTop: 6,
    fontVariant: ["tabular-nums"],
  },
});
