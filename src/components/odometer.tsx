"use client";

// Per-digit odometer animation: each digit lives in a vertical column of 0-9 and
// slides to its new value. Digits that don't change don't move. Direction (and
// color) follows the price change.
//
// Structure per glyph slot:
//   <span class="odometer-digit">        overflow:hidden, height = 1em
//     <span class="odometer-reel" style="transform:translateY(-{d*10}%)">  column of 0..9
//   </span>
// Only characters that are digits get a reel; "$", ".", ",", "+" pass through.

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

interface Props {
  value: string;
  /** "up" | "down" picks color + initial entry direction. */
  dir?: 1 | -1 | 0;
  /** Milliseconds for a digit to settle. */
  durationMs?: number;
  className?: string;
  digitClassName?: string;
}

interface Slot {
  char: string;
  isDigit: boolean;
}

function OdometerBase({ value, dir = 0, durationMs = 130, className, digitClassName }: Props) {
  const slots = useMemo<Slot[]>(() => Array.from(value).map((char) => ({ char, isDigit: char >= "0" && char <= "9" })), [value]);
  // Track the digit value per slot; only animate when the digit changed.
  const [displayed, setDisplayed] = useState<string[]>(() => slots.map((s) => (s.isDigit ? s.char : "")));

  const prevRef = useRef<string[]>(displayed);

  useEffect(() => {
    const next = slots.map((s) => (s.isDigit ? s.char : ""));
    // Grow/shrink digit count: swap instantly (reel positions shift).
    if (slots.length !== prevRef.current.length) {
      setDisplayed(next);
      prevRef.current = next;
      return;
    }
    const anyChanged = slots.some((s, i) => s.isDigit && s.char !== prevRef.current[i]);
    if (anyChanged) {
      setDisplayed(next);
      prevRef.current = next;
    }
  }, [slots]);

  const color = dir > 0 ? "text-accent-green" : dir < 0 ? "text-accent-red" : "";

  return (
    <span
      className={cn("inline-flex items-baseline tabular-nums", color, className)}
      aria-label={value}
      role="text"
    >
      {slots.map((slot, i) => {
        if (!slot.isDigit) {
          return (
            <span key={i} className={digitClassName}>
              {slot.char}
            </span>
          );
        }
        const d = Number(displayed[i]);
        return (
          <span key={i} className={cn("odometer-digit", digitClassName)}>
            <span
              className="odometer-reel"
              style={{
                transform: `translateY(-${d * 10}%)`,
                transitionDuration: `${durationMs}ms`,
              }}
            >
              {DIGITS.map((digit) => (
                <span key={digit} className="odometer-cell">
                  {digit}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

export const Odometer = memo(OdometerBase);
