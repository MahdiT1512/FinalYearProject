// context/XPContext.tsx
import React, {
  createContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";

export type SkillLevel = "Beginner" | "Intermediate" | "Advanced";

type XPContextType = {
  xp: number;
  level: number;
  userSkillLevel: SkillLevel;
  addXP: (amount: number) => void;
  completedLessons: string[];
  completeLesson: (lesson: string, xpAmount?: number) => void;

  // Hearts API
  hearts: number;
  maxHearts: number;
  loseHeart: () => void;
  refillHearts: (instant?: boolean) => void;
  // for UI: seconds until next heart (approx)
  secondsUntilNextHeart: number | null;
};

export const XPContext = createContext<XPContextType>({
  xp: 0,
  level: 1,
  userSkillLevel: "Beginner",
  addXP: () => {},
  completedLessons: [],
  completeLesson: () => {},
  hearts: 5,
  maxHearts: 5,
  loseHeart: () => {},
  refillHearts: () => {},
  secondsUntilNextHeart: null,
});

export const XPProvider = ({ children }: { children: ReactNode }) => {
  const MAX_HEARTS = 5;
  // Regeneration interval for demo. In production you'd set this to e.g. 15 * 60 * 1000
  const REGEN_INTERVAL_MS = 60 * 1000; // 60s per heart (demo)
  const [xp, setXP] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);

  // hearts state
  const [hearts, setHearts] = useState<number>(MAX_HEARTS);
  const [secondsUntilNextHeart, setSecondsUntilNextHeart] = useState<
    number | null
  >(null);

  // timer refs
  const regenTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // helper to compute skill label
  const getSkillLevel = (lvl: number): SkillLevel => {
    if (lvl < 3) return "Beginner";
    if (lvl < 6) return "Intermediate";
    return "Advanced";
  };

  // Add XP and auto-level
  const addXP = (amount: number) => {
    setXP((prevXP) => {
      let totalXP = prevXP + amount;

      if (totalXP >= 100) {
        const levelIncrease = Math.floor(totalXP / 100);
        setLevel((prevLevel) => prevLevel + levelIncrease);
        totalXP = totalXP % 100;
      }

      return totalXP;
    });
  };

  const completeLesson = (lesson: string, xpAmount: number = 10) => {
    setCompletedLessons((prev) => {
      if (prev.includes(lesson)) return prev;
      return [...prev, lesson];
    });

    addXP(xpAmount);
  };

  // lose a heart
  const loseHeart = () => {
    setHearts((h) => {
      const next = Math.max(0, h - 1);
      return next;
    });
  };

  // refill all hearts instantly (demo / in-app purchase placeholder)
  const refillHearts = (instant: boolean = false) => {
    if (instant) {
      setHearts(MAX_HEARTS);
      setSecondsUntilNextHeart(null);
    } else {
      // start regen if hearts < max
      // regen logic is handled by effect below
      if (hearts < MAX_HEARTS && !regenTimerRef.current) {
        // will start automatically via effect
      }
    }
  };

  // MAIN regen effect: when hearts < MAX_HEARTS, tick every REGEN_INTERVAL_MS and add a heart.
  useEffect(() => {
    // clear any existing regen timer
    if (regenTimerRef.current) {
      clearInterval(regenTimerRef.current);
      regenTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
      setSecondsUntilNextHeart(null);
    }

    if (hearts < MAX_HEARTS) {
      // Start countdown for UI (seconds until next heart)
      const NEXT = REGEN_INTERVAL_MS / 1000;
      let remaining = NEXT;
      setSecondsUntilNextHeart(Math.ceil(remaining));

      countdownTimerRef.current = setInterval(() => {
        remaining -= 1;
        setSecondsUntilNextHeart((r) => {
          if (remaining <= 0) {
            return null;
          }
          return Math.ceil(remaining);
        });
      }, 1000);

      // Start actual regen interval
      regenTimerRef.current = setInterval(() => {
        setHearts((h) => {
          const newH = Math.min(MAX_HEARTS, h + 1);
          // if we've reached max, clear timers
          if (newH >= MAX_HEARTS) {
            if (regenTimerRef.current) {
              clearInterval(regenTimerRef.current);
              regenTimerRef.current = null;
            }
            if (countdownTimerRef.current) {
              clearInterval(countdownTimerRef.current);
              countdownTimerRef.current = null;
              setSecondsUntilNextHeart(null);
            }
          } else {
            // restart countdown for next heart
            setSecondsUntilNextHeart(REGEN_INTERVAL_MS / 1000);
          }
          return newH;
        });
      }, REGEN_INTERVAL_MS);
    } else {
      setSecondsUntilNextHeart(null);
    }

    // cleanup
    return () => {
      if (regenTimerRef.current) {
        clearInterval(regenTimerRef.current);
        regenTimerRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hearts]);

  return (
    <XPContext.Provider
      value={{
        xp,
        level,
        userSkillLevel: getSkillLevel(level),
        addXP,
        completedLessons,
        completeLesson,
        hearts,
        maxHearts: MAX_HEARTS,
        loseHeart,
        refillHearts,
        secondsUntilNextHeart,
      }}
    >
      {children}
    </XPContext.Provider>
  );
};
