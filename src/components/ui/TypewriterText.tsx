import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TypewriterTextProps {
  text: string;
  speed?: number; // ms per word
  className?: string;
  onComplete?: () => void;
  once?: boolean;
}

export const TypewriterText = ({
  text,
  speed = 50,
  className,
  onComplete,
  once = true,
}: TypewriterTextProps) => {
  const [displayedText, setDisplayedText] = useState("");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (!text) return;

    // Reset if text changes and not in 'once' mode
    if (!once) {
      setDisplayedText("");
      setComplete(false);
    }

    const words = text.split(" ");
    let currentWordIndex = 0;

    const timer = setInterval(() => {
      if (currentWordIndex < words.length) {
        setDisplayedText((prev) => (prev ? prev + " " + words[currentWordIndex] : words[currentWordIndex]));
        currentWordIndex++;
      } else {
        clearInterval(timer);
        setComplete(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, once, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {!complete && (
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="inline-block w-1.5 h-4 ml-0.5 bg-primary align-middle"
        />
      )}
    </span>
  );
};

export const StreamingLine = ({ text }: { text: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.3 }}
      className="inline-flex items-center"
    >
      <TypewriterText text={text} speed={40} />
    </motion.div>
  );
};
