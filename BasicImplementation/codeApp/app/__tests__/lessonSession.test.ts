import { buildLessonSession } from "../../services/lessonSession";

describe("buildLessonSession", () => {
  const exercises = [
    { id: "q1", type: "mc", xp: 10 },
    { id: "q2", type: "code", xp: 15 },
    { id: "q3", type: "trace", xp: 12 },
  ];

  test("returns an empty array if no exercises are provided", () => {
    const result = buildLessonSession("lesson-1", []);

    expect(result).toEqual([]);
  });

  test("adds sessionId and sessionOrder to each exercise", () => {
    const result = buildLessonSession("lesson-1", exercises);

    expect(result).toHaveLength(3);
    expect(result[0]).toHaveProperty("sessionId");
    expect(result[0]).toHaveProperty("sessionOrder");
  });

  test("limits session length when sessionLength is provided", () => {
    const result = buildLessonSession("lesson-1", exercises, {
      sessionLength: 2,
    });

    expect(result).toHaveLength(2);
  });

  test("uses review label in sessionId when review mode is true", () => {
    const result = buildLessonSession("lesson-1", exercises, {
      reviewMode: true,
    });

    expect(result[0].sessionId).toContain("lesson-1-review");
  });
});