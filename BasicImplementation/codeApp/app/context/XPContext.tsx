import React, { createContext, useState, ReactNode } from "react";

export type SkillLevel = "Beginner" | "Intermediate" | "Advanced";

type XPContextType = {
  xp: number;
  level: number;
  userSkillLevel: SkillLevel;
  addXP: (amount: number) => void;
  completedLessons: string[];
  completeLesson: (lesson: string, xpAmount?: number) => void;
};

export const XPContext = createContext<XPContextType>({
  xp: 0,
  level: 1,
  userSkillLevel: "Beginner",
  addXP: () => {},
  completedLessons: [],
  completeLesson: () => {},
});

export const XPProvider = ({ children }: { children: ReactNode }) => {
  const [xp, setXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);

  const getSkillLevel = (lvl: number): SkillLevel => {
    if (lvl < 3) return "Beginner";
    if (lvl < 6) return "Intermediate";
    return "Advanced";
  };

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

  return (
    <XPContext.Provider
      value={{
        xp,
        level,
        userSkillLevel: getSkillLevel(level),
        addXP,
        completedLessons,
        completeLesson,
      }}
    >
      {children}
    </XPContext.Provider>
  );
};
