// context/SyntaxContext.tsx
import React, { createContext, useState, ReactNode } from "react";
import keywordsData from "../data/keywords.json";

export type MCExercise = {
  type: "mc";
  text: string;
  options: string[];
  correct: number;
  xp: number;
};

export type CodeExercise = {
  type: "code";
  text: string;
  prompt: string;
  answer: string;
  xp: number;
};

export type Exercise = MCExercise | CodeExercise;

export type Keyword = {
  id: string;
  name: string;
  description: string;
  mastery: number;
  remainingExercises: number;
  exercises: Exercise[];
};

type SyntaxContextType = {
  keywords: Keyword[];
  updateKeyword: (id: string, masteryInc: number, correct: boolean) => void;
};

export const SyntaxContext = createContext<SyntaxContextType>({
  keywords: [],
  updateKeyword: () => {},
});

export const SyntaxProvider = ({ children }: { children: ReactNode }) => {
  // deep copy so we don't mutate imported JSON directly
  const initial: Keyword[] = (keywordsData as Keyword[]).map((k) => ({
    ...k,
    // defensive defaults in case JSON is missing fields
    mastery: k.mastery ?? 0,
    remainingExercises: k.remainingExercises ?? k.exercises?.length ?? 0,
    exercises: k.exercises ?? [],
  }));

  const [keywords, setKeywords] = useState<Keyword[]>(initial);

  /**
   * updateKeyword:
   *  - masteryInc is interpreted as "mastery percentage points" to add (cap at 100)
   *  - only decrement remainingExercises when correct === true
   */
  const updateKeyword = (id: string, masteryInc: number, correct: boolean) => {
    setKeywords((prev) =>
      prev.map((k) =>
        k.id === id
          ? {
              ...k,
              mastery: correct
                ? Math.min(k.mastery + masteryInc, 100)
                : k.mastery,
              remainingExercises: correct
                ? Math.max((k.remainingExercises ?? 0) - 1, 0)
                : (k.remainingExercises ?? 0),
            }
          : k,
      ),
    );
  };

  return (
    <SyntaxContext.Provider value={{ keywords, updateKeyword }}>
      {children}
    </SyntaxContext.Provider>
  );
};
