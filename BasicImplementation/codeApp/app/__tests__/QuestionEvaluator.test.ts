import { evaluateQuestion } from "../context/QuestionEvaluator";

describe("QuestionEvaluator", () => {
  test("marks multiple choice answer as correct", () => {
    const question = {
      type: "mc" as const,
      text: "Which loop repeats while a condition is true?",
      options: ["for", "while", "if", "def"],
      correct: 1,
      xp: 10,
    };

    const result = evaluateQuestion(question, 1);

    expect(result.correct).toBe(true);
    expect(result.xpEarned).toBe(10);
  });

  test("marks multiple choice answer as incorrect", () => {
    const question = {
      type: "mc" as const,
      text: "Which loop repeats while a condition is true?",
      options: ["for", "while", "if", "def"],
      correct: 1,
      xp: 10,
    };

    const result = evaluateQuestion(question, 0);

    expect(result.correct).toBe(false);
    expect(result.xpEarned).toBe(0);
  });

  test("accepts code answers with whitespace and case differences", () => {
    const question = {
      type: "code" as const,
      text: "Complete the keyword",
      prompt: "___ True:",
      answer: "while",
      xp: 15,
    };

    const result = evaluateQuestion(question, "  WHILE  ");

    expect(result.correct).toBe(true);
    expect(result.xpEarned).toBe(15);
  });

  test("accepts numeric equivalent answers", () => {
    const question = {
      type: "code" as const,
      text: "What is the result?",
      answer: "5",
      xp: 10,
    };

    const result = evaluateQuestion(question, "5.0");

    expect(result.correct).toBe(true);
    expect(result.answerMode).toBe("numeric");
  });

  test("checks trace table answers correctly", () => {
    const question = {
      type: "trace" as const,
      text: "Trace x",
      columns: ["x"],
      answer: [["3"], ["5"], ["7"]],
      xp: 12,
    };

    const result = evaluateQuestion(question, [["3"], ["5"], ["7"]]);

    expect(result.correct).toBe(true);
    expect(result.xpEarned).toBe(12);
  });

  test("rejects incorrect trace table answers", () => {
    const question = {
      type: "trace" as const,
      text: "Trace x",
      columns: ["x"],
      answer: [["3"], ["5"], ["7"]],
      xp: 12,
    };

    const result = evaluateQuestion(question, [["3"], ["4"], ["7"]]);

    expect(result.correct).toBe(false);
    expect(result.xpEarned).toBe(0);
    expect(result.feedback).toContain("row 2");
  });

  test("accepts debug answers with normalised formatting", () => {
    const question = {
      type: "debug" as const,
      text: "Fix the code",
      prompt: "print('hello'",
      answer: "print('hello')",
      xp: 15,
    };

    const result = evaluateQuestion(question, "  print('hello')  ");

    expect(result.correct).toBe(true);
    expect(result.xpEarned).toBe(15);
  });
});