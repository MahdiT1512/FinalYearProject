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
  answer: string;
  xp: number;
};

export type TraceQuestion = {
  type: "trace";
  text: string;
  prompt?: string;
  columns: string[];
  answer: string[][];
  xp: number;
};

export type DebugQuestion = {
  type: "debug";
  text: string;
  prompt?: string;
  answer: string;
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
  feedbackTitle?: string;
  answerMode?:
    | "exact"
    | "whitespace"
    | "comma"
    | "numeric"
    | "quoted"
    | "loose"
    | "normalized"
    | "contains"
    | "trace"
    | null;
  expectedAnswer?: string;
};

//Functions for normalisation and comparison of user answers to the expected answer, with different modes of acceptance and feedback depending on the type of question and answer.
const normalizeBasic = (value: unknown): string => {
  return String(value ?? "")
    .trim()
    .toLowerCase();
};

const normalizeWhitespace = (value: unknown): string => {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n+/g, "\n")
    .trim()
    .toLowerCase();
};

const normalizeLoose = (value: unknown): string => {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
};

const normalizeCode = (value: unknown): string => {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, "  ")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .trim()
    .toLowerCase();
};

const normalizeTraceCell = (value: unknown): string => {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
};

const normalizeQuotedString = (value: string): string => {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim().toLowerCase();
  }

  return trimmed.toLowerCase();
};

const splitCommaAnswers = (value: string): string[] => {
  return value
    .split(",")
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);
};

//Compares two numeric answers for near equivalence, allowing for minor formatting differences and floating point imprecision.
const isNumericEquivalent = (a: string, b: string): boolean => {
  if (a === "" || b === "") return false;

  const numA = Number(a);
  const numB = Number(b);

  if (Number.isNaN(numA) || Number.isNaN(numB)) return false;

  return Math.abs(numA - numB) < 0.000001;
};

const compareSingleToken = (expected: string, provided: string): boolean => {
  if (expected === provided) return true;
  if (normalizeWhitespace(expected) === normalizeWhitespace(provided))
    return true;
  if (normalizeQuotedString(expected) === normalizeQuotedString(provided))
    return true;
  if (isNumericEquivalent(expected, provided)) return true;
  return false;
};

//Compares two comma-separated answers, allowing for minor formatting differences in each part.
//But requiring the same number of parts and the parts to be in the same order.
const compareCommaSeparatedAnswer = (
  expectedRaw: string,
  providedRaw: string,
): boolean => {
  const expectedParts = splitCommaAnswers(expectedRaw);
  const providedParts = splitCommaAnswers(providedRaw);

  if (expectedParts.length <= 1) return false;
  if (expectedParts.length !== providedParts.length) return false;

  for (let i = 0; i < expectedParts.length; i++) {
    if (!compareSingleToken(expectedParts[i], providedParts[i])) {
      return false;
    }
  }

  return true;
};

//Comparing exercise answers for each type of question, and returning a detailed evaluation result including whether the answer is correct.
const compareCodeAnswer = (
  expectedRaw: string,
  providedRaw: string,
): {
  correct: boolean;
  mode:
    | "exact"
    | "whitespace"
    | "comma"
    | "numeric"
    | "quoted"
    | "loose"
    | null;
} => {
  const expectedBasic = normalizeBasic(expectedRaw);
  const providedBasic = normalizeBasic(providedRaw);

  if (!providedBasic) {
    return { correct: false, mode: null };
  }

  if (expectedBasic === providedBasic) {
    return { correct: true, mode: "exact" };
  }

  if (normalizeWhitespace(expectedRaw) === normalizeWhitespace(providedRaw)) {
    return { correct: true, mode: "whitespace" };
  }

  if (
    normalizeQuotedString(expectedRaw) === normalizeQuotedString(providedRaw)
  ) {
    return { correct: true, mode: "quoted" };
  }

  if (compareCommaSeparatedAnswer(expectedRaw, providedRaw)) {
    return { correct: true, mode: "comma" };
  }

  if (isNumericEquivalent(expectedBasic, providedBasic)) {
    return { correct: true, mode: "numeric" };
  }

  if (normalizeLoose(expectedRaw) === normalizeLoose(providedRaw)) {
    return { correct: true, mode: "loose" };
  }

  return { correct: false, mode: null };
};

const compareDebugAnswer = (
  expectedRaw: string,
  providedRaw: string,
): { correct: boolean; mode: "exact" | "normalized" | "contains" | null } => {
  const expectedCode = normalizeCode(expectedRaw);
  const providedCode = normalizeCode(providedRaw);

  if (!providedCode) {
    return { correct: false, mode: null };
  }

  if (expectedCode === providedCode) {
    return { correct: true, mode: "exact" };
  }

  const expectedLoose = normalizeLoose(expectedRaw);
  const providedLoose = normalizeLoose(providedRaw);

  if (expectedLoose === providedLoose) {
    return { correct: true, mode: "normalized" };
  }

  const expectedLength = expectedLoose.length;
  const providedLength = providedLoose.length;

  const isReasonablyCloseInSize =
    Math.abs(expectedLength - providedLength) <= 16 &&
    Math.min(expectedLength, providedLength) >=
      Math.max(expectedLength, providedLength) * 0.65;

  if (
    isReasonablyCloseInSize &&
    (providedLoose.includes(expectedLoose) ||
      expectedLoose.includes(providedLoose))
  ) {
    return { correct: true, mode: "contains" };
  }

  return { correct: false, mode: null };
};

const compareTraceAnswer = (
  expected: string[][],
  provided: unknown,
): {
  correct: boolean;
  feedback: string;
  mismatchCount: number;
} => {
  const rows = Array.isArray(provided) ? provided : [];

  if (!Array.isArray(rows) || rows.length !== expected.length) {
    return {
      correct: false,
      feedback: `❌ Expected ${expected.length} row${expected.length === 1 ? "" : "s"} in the trace table.`,
      mismatchCount: expected.length,
    };
  }

  const mismatches: string[] = [];

  for (let r = 0; r < expected.length; r++) {
    const expectedRow = expected[r] ?? [];
    const providedRow = Array.isArray(rows[r]) ? rows[r] : [];

    if (providedRow.length !== expectedRow.length) {
      mismatches.push(`row ${r + 1} column count`);
      continue;
    }

    for (let c = 0; c < expectedRow.length; c++) {
      const expectedCell = normalizeTraceCell(expectedRow[c]);
      const providedCell = normalizeTraceCell(providedRow[c]);

      if (
        expectedCell !== providedCell &&
        !isNumericEquivalent(expectedCell, providedCell)
      ) {
        mismatches.push(`row ${r + 1}, col ${c + 1}`);
      }
    }
  }

  if (mismatches.length === 0) {
    return {
      correct: true,
      feedback: "✅ Trace correct!",
      mismatchCount: 0,
    };
  }

  if (mismatches.length === 1) {
    return {
      correct: false,
      feedback: `❌ Almost there, review ${mismatches[0]}.`,
      mismatchCount: mismatches.length,
    };
  }

  return {
    correct: false,
    feedback: `❌ Check these cells: ${mismatches.slice(0, 5).join("; ")}`,
    mismatchCount: mismatches.length,
  };
};

const buildCodeFeedbackTitle = (
  mode:
    | "exact"
    | "whitespace"
    | "comma"
    | "numeric"
    | "quoted"
    | "loose"
    | null,
): string => {
  switch (mode) {
    case "exact":
      return "Perfect";
    case "whitespace":
      return "Correct";
    case "quoted":
      return "Accepted";
    case "comma":
      return "Correct";
    case "numeric":
      return "Correct";
    case "loose":
      return "Accepted";
    default:
      return "Not quite";
  }
};

//Routes each exercise type to the correct comparison function.
export const evaluateQuestion = (
  question: Question,
  userAnswer: unknown,
): EvaluationResult => {
  if (!question) {
    return {
      correct: false,
      xpEarned: 0,
      feedback: "No question found.",
      feedbackTitle: "Error",
      answerMode: null,
    };
  }

  if (question.type === "mc") {
    const providedIndex =
      typeof userAnswer === "number" ? userAnswer : Number(userAnswer);

    const correct = providedIndex === question.correct;

    return {
      correct,
      xpEarned: correct ? question.xp : 0,
      feedback: correct
        ? "✅ Correct!"
        : "❌ Keep going! Review the material and try again.",
      feedbackTitle: correct ? "Nice" : "Try again",
      answerMode: null,
    };
  }

  if (question.type === "trace") {
    const result = compareTraceAnswer(question.answer ?? [], userAnswer);

    return {
      correct: result.correct,
      xpEarned: result.correct ? question.xp : 0,
      feedback: result.feedback,
      feedbackTitle: result.correct ? "Trace locked in" : "Trace mismatch",
      answerMode: result.correct ? "trace" : null,
    };
  }

  if (question.type === "debug") {
    const providedRaw = String(userAnswer ?? "");
    const result = compareDebugAnswer(question.answer ?? "", providedRaw);

    if (result.correct) {
      return {
        correct: true,
        xpEarned: question.xp,
        feedback:
          result.mode === "contains"
            ? "✅ Fixed!(Formatting differences ignored)"
            : "✅ Fixed!",
        feedbackTitle: "Bug fixed",
        answerMode: result.mode,
        expectedAnswer: question.answer,
      };
    }

    return {
      correct: false,
      xpEarned: 0,
      feedback: "❌ That fix isn’t quite right.",
      feedbackTitle: "Still broken",
      answerMode: null,
      expectedAnswer: question.answer,
    };
  }

  if (question.type === "code") {
    const providedRaw = String(userAnswer ?? "");
    const result = compareCodeAnswer(question.answer ?? "", providedRaw);

    if (result.correct) {
      return {
        correct: true,
        xpEarned: question.xp,
        feedback:
          result.mode === "loose"
            ? "✅ Correct!(formatting differences ignored)"
            : "✅ Correct!",
        feedbackTitle: buildCodeFeedbackTitle(result.mode),
        answerMode: result.mode,
        expectedAnswer: question.answer,
      };
    }

    const expectedPreview = String(question.answer ?? "").trim();

    return {
      correct: false,
      xpEarned: 0,
      feedback: expectedPreview
        ? `❌ Incorrect. Expected: ${expectedPreview}`
        : "❌ Incorrect.",
      feedbackTitle: "Not quite",
      answerMode: null,
      expectedAnswer: question.answer,
    };
  }

  return {
    correct: false,
    xpEarned: 0,
    feedback: "Unknown question type.",
    feedbackTitle: "Error",
    answerMode: null,
  };
};
