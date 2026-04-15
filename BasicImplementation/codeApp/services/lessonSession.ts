export type LessonSessionItem<T> = T & {
  sessionId: string;
  sessionOrder: number;
};

type BuildLessonSessionOptions = {
  reviewMode?: boolean;
  sessionLength?: number;
};

function shuffleArray<T>(items: T[]) {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

export function buildLessonSession<T extends Record<string, any>>(
  lessonId: string,
  exercises: T[],
  options: BuildLessonSessionOptions = {},
): LessonSessionItem<T>[] {
  const { reviewMode = false, sessionLength } = options;

  if (!Array.isArray(exercises) || exercises.length === 0) {
    return [];
  }

  const shuffled = shuffleArray(exercises);

  const targetLength =
    typeof sessionLength === "number" && sessionLength > 0
      ? Math.min(sessionLength, shuffled.length)
      : shuffled.length;

  const selected = shuffled.slice(0, targetLength);

  return selected.map((exercise, index) => ({
    ...exercise,
    sessionId: `${lessonId}-${reviewMode ? "review" : "run"}-${index}-${Math.random()
      .toString(36)
      .slice(2, 9)}`,
    sessionOrder: index,
  }));
}