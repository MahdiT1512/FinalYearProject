import React, { createContext, useState, ReactNode } from 'react';

type XPContextType = {
  xp: number;
  level: number;
  addXP: (amount: number) => void;
  completedLessons: string[];
  completeLesson: (lesson: string) => void;
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
    setXP((prev) => {
      const newXP = prev + amount;
      if (newXP >= 100) {
        setLevel((lvl) => lvl + 1);
        return newXP - 100;
      }
      return newXP;
    });
  };

  const completeLesson = (lesson: string) => {
    if (!completedLessons.includes(lesson)) {
      setCompletedLessons([...completedLessons, lesson]);
      addXP(10); 
    }
  };

  return (
    <XPContext.Provider value={{ xp, level, addXP, completedLessons, completeLesson }}>
      {children}
    </XPContext.Provider>
  );
};