import React, { createContext, useState, ReactNode } from "react";

type XPContextType = {
  xp: number;
  level: number;
  addXP: (amount: number) => void;
  completedLessons: string[];
  completeLesson: (lesson: string, xpAmount?: number) => void;
};

export const XPContext = createContext<XPContextType>({
  xp: 0,
  level: 1,
  addXP: () => {},
  completedLessons: [],
  completeLesson: () => {},
});

export const XPProvider = ({ children }: { children: ReactNode }) => {
  const [xp, setXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);

  const addXP = (amount: number) => {
    setXP((prevXP) => {
      let totalXP = prevXP + amount;
      setLevel((prevLevel) => prevLevel + Math.floor(totalXP / 100));
      totalXP = totalXP % 100;
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
      value={{ xp, level, addXP, completedLessons, completeLesson }}
    >
      {children}
    </XPContext.Provider>
  );
};
