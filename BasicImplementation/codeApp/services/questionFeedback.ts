import {
  EvaluationResult,
  Question,
} from "../app/context/QuestionEvaluator";

export type EnhancedFeedback = {
  title: string;
  message: string;
  tone: "success" | "warning" | "error";
  hint?: string;
  likelyMistakeType?: "syntax" | "logic" | "format" | "concept" | null;
};

export const buildEnhancedFeedback = (
  question: Question,
  result: EvaluationResult,
): EnhancedFeedback => {
  if (result.correct) {
    if (question.type === "trace") {
      return {
        title: "Trace nailed",
        message: "You tracked the changing values correctly.",
        tone: "success",
        hint: "Nice work following each trace step carefully.",
        likelyMistakeType: null,
      };
    }

    if (question.type === "debug") {
      return {
        title: "Bug fixed",
        message: "That correction works.",
        tone: "success",
        hint: "You spotted the issue and cleaned it up.",
        likelyMistakeType: null,
      };
    }

    if (question.type === "code") {
      return {
        title: "Correct answer",
        message: "That matches the expected code.",
        tone: "success",
        hint: "Keep building that syntax memory.",
        likelyMistakeType: null,
      };
    }

    return {
      title: "Correct",
      message: "Nice one.",
      tone: "success",
      hint: "Keep the streak going.",
      likelyMistakeType: null,
    };
  }

  if (question.type === "debug") {
    return {
      title: "Not quite fixed yet",
      message: "Your answer is close, but the bug still isn’t quite resolved yet.",
      tone: "error",
      hint: "Try looking for syntax errors, issues with indentations or for missing keywords.",
      likelyMistakeType: "syntax",
    };
  }

  if (question.type === "trace") {
    return {
      title: "Trace needs another pass",
      message: "One or more cells don’t match the actual program flow.",
      tone: "warning",
      hint: "Run through the code one line at a time and update values after each change.",
      likelyMistakeType: "logic",
    };
  }

  if (question.type === "code") {
    return {
      title: "Try again",
      message: "The answer format or keyword is off.",
      tone: "warning",
      hint: "Check for spelling, quotation mark, or spacing errors.",
      likelyMistakeType: "format",
    };
  }

  return {
    title: "Incorrect",
    message: "That choice doesn’t match the correct answer.",
    tone: "error",
    hint: "Re-read the lesson point for this question.",
    likelyMistakeType: "concept",
  };
};