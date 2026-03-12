export type MCQQuestion = {
  type: "mc";
  text: string;
  options: string[];
  correct: number;
  xp: number;
};

export type CodeQuestion = {
  type: "code";
  text: string;
  prompt?: string;
  answer: string; // expected output / fixed code / correct value
  xp: number;
};

export type TraceQuestion = {
  type: "trace";
  text: string;
  prompt?: string;
  columns: string[]; // e.g. ["i", "total"]
  answer: string[][]; // rows of columns: [["1","1"],["2","3"],...]
  xp: number;
};

export type DebugQuestion = {
  type: "debug";
  text: string;
  prompt?: string;
  answer: string; // fixed code (string)
  xp: number;
};

export type Question =
  | MCQQuestion
  | CodeQuestion
  | TraceQuestion
  | DebugQuestion;

export type EvaluationResult = {
  correct: boolean;
  xpEarned: number;
  feedback?: string;
};

/**
 * evaluateQuestion:
 * - For `mc` checks index equality.
 * - For `code` does normalized string match (trim + lowercase).
 * - For `trace` compares 2D array cell-by-cell (normalized).
 * - For `debug` forgiving contains/exact match.
 *
 * NOTE: This is local/demo evaluator. Swap to backend API later with same output shape.
 */
export const evaluateQuestion = (
  question: Question,
  userAnswer: any,
): EvaluationResult => {
  if (!question)
    return { correct: false, xpEarned: 0, feedback: "No question" };

  // MCQ
  if (question.type === "mc") {
    const correct = userAnswer === (question as MCQQuestion).correct;
    return {
      correct,
      xpEarned: correct ? (question as MCQQuestion).xp : 0,
      feedback: correct ? "✅ Correct!" : "❌ Incorrect — try again",
    };
  }

  // TRACE
  if (question.type === "trace") {
    const expected = (question as TraceQuestion).answer || [];
    const provided: string[][] = Array.isArray(userAnswer) ? userAnswer : [];

    // quick shape check
    if (!Array.isArray(provided) || provided.length !== expected.length) {
      return {
        correct: false,
        xpEarned: 0,
        feedback: `❌ Incorrect shape: expected ${expected.length} rows.`,
      };
    }

    // compare cell-by-cell normalized
    const mismatches: string[] = [];
    for (let r = 0; r < expected.length; r++) {
      const expRow = expected[r] || [];
      const provRow = provided[r] || [];
      if (provRow.length !== expRow.length) {
        mismatches.push(`row ${r + 1} column count`);
        continue;
      }
      for (let c = 0; c < expRow.length; c++) {
        const e = String(expRow[c] ?? "")
          .trim()
          .toLowerCase();
        const p = String(provRow[c] ?? "")
          .trim()
          .toLowerCase();
        if (e !== p) {
          mismatches.push(`row ${r + 1}, col ${c + 1}`);
        }
      }
    }

    if (mismatches.length === 0) {
      return {
        correct: true,
        xpEarned: (question as TraceQuestion).xp,
        feedback: "✅ Trace correct!",
      };
    } else {
      return {
        correct: false,
        xpEarned: 0,
        feedback: `❌ Wrong cells: ${mismatches.slice(0, 6).join("; ")}`,
      };
    }
  }

  // DEBUG (forgiving) and CODE (exact)
  if (question.type === "debug") {
    const expected =
      (question as DebugQuestion).answer?.trim().toLowerCase() ?? "";
    const provided = String(userAnswer ?? "")
      .trim()
      .toLowerCase();
    const correct =
      provided === expected ||
      provided.includes(expected) ||
      expected.includes(provided);
    return {
      correct,
      xpEarned: correct ? (question as DebugQuestion).xp : 0,
      feedback: correct
        ? "✅ Fixed!"
        : `❌ Incorrect. Expected to include: ${(question as DebugQuestion).answer}`,
    };
  }

  // CODE regular exact match
  if (question.type === "code") {
    const expected =
      (question as CodeQuestion).answer?.trim().toLowerCase() ?? "";
    const provided = String(userAnswer ?? "")
      .trim()
      .toLowerCase();
    const correct = provided === expected;
    return {
      correct,
      xpEarned: correct ? (question as CodeQuestion).xp : 0,
      feedback: correct
        ? "✅ Correct!"
        : `❌ Incorrect. Expected: ${(question as CodeQuestion).answer}`,
    };
  }

  return { correct: false, xpEarned: 0, feedback: "Unknown question type" };
};
