import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "./AuthContext";
import GlobalUnlockModal from "../Components/common/GlobalUnlockModal";
import projectsData from "../data/projects.json";
import { getBadgeDefinition } from "../../services/badges";

export type UnlockItem = {
  id?: string;
  type: "badge" | "title" | "avatar" | "achievement" | "project";
  title: string;
  subtitle?: string;
  accent?: string;
  emoji?: string;
};

type UnlocksContextType = {
  pushUnlock: (item: UnlockItem) => void;
};

const UnlocksContext = createContext<UnlocksContextType | undefined>(undefined);

type BadgeLike =
  | string
  | {
      id?: string;
      unlocked?: boolean;
      unlockedAt?: number | null;
    };

type AvatarLike = {
  id?: string;
  name?: string;
  rewardTitle?: string | null;
};

type UserSnapshot = {
  badges?: BadgeLike[];
  avatars?: AvatarLike[];
  completedProjects?: string[];
  unlockedTitles?: string[];
  earnedProjectTitles?: string[];
};

type ProjectMeta = {
  id: string;
  name: string;
  awardTitle?: string | null;
};

const projectMetaMap = (projectsData as ProjectMeta[]).reduce<
  Record<string, ProjectMeta>
>((acc, project) => {
  acc[project.id] = project;
  return acc;
}, {});

const normalizeUnlockedBadges = (badges: BadgeLike[] = []) => {
  return badges
    .filter((badge) => {
      if (typeof badge === "string") return true;
      return !!badge?.id && !!badge?.unlocked;
    })
    .map((badge) => (typeof badge === "string" ? badge : (badge.id ?? "")))
    .filter(Boolean);
};

const normalizeAvatarIds = (avatars: AvatarLike[] = []) => {
  return avatars.map((avatar) => avatar?.id ?? "").filter(Boolean);
};

const normalizeTitles = (titles: string[] = []) => {
  return titles.map((title) => title?.trim()).filter(Boolean);
};

const unique = (items: string[]) => Array.from(new Set(items));

export const UnlocksProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const [queue, setQueue] = useState<UnlockItem[]>([]);
  const [active, setActive] = useState<UnlockItem | null>(null);

  const initializedRef = useRef(false);
  const seenKeysRef = useRef<Set<string>>(new Set());

  const previousBadgesRef = useRef<string[]>([]);
  const previousTitlesRef = useRef<string[]>([]);
  const previousAvatarsRef = useRef<string[]>([]);
  const previousProjectsRef = useRef<string[]>([]);

  const makeQueueKey = useCallback((item: UnlockItem) => {
    return [
      item.type,
      item.id ?? "",
      item.title ?? "",
      item.subtitle ?? "",
    ].join("|");
  }, []);

  const pushUnlock = useCallback(
    (item: UnlockItem) => {
      const resolved: UnlockItem = {
        ...item,
        id:
          item.id ??
          `${item.type}-${item.title}-${Date.now()}-${Math.random()}`,
      };

      const queueKey = makeQueueKey(resolved);

      if (seenKeysRef.current.has(queueKey)) {
        return;
      }

      seenKeysRef.current.add(queueKey);
      setQueue((prev) => [...prev, resolved]);
    },
    [makeQueueKey],
  );

  useEffect(() => {
    if (!active && queue.length > 0) {
      setActive(queue[0]);
      setQueue((prev) => prev.slice(1));
    }
  }, [active, queue]);

  const handleClose = useCallback(() => {
    setActive(null);
  }, []);

  useEffect(() => {
    if (!user) {
      initializedRef.current = false;
      previousBadgesRef.current = [];
      previousTitlesRef.current = [];
      previousAvatarsRef.current = [];
      previousProjectsRef.current = [];
      seenKeysRef.current = new Set();
      setQueue([]);
      setActive(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (!snap.exists()) return;

      const data = snap.data() as UserSnapshot;

      const rawBadges = Array.isArray(data.badges) ? data.badges : [];
      const rawAvatars = Array.isArray(data.avatars) ? data.avatars : [];
      const rawProjects = Array.isArray(data.completedProjects)
        ? data.completedProjects
        : [];
      const rawUnlockedTitles = Array.isArray(data.unlockedTitles)
        ? data.unlockedTitles
        : [];
      const rawEarnedProjectTitles = Array.isArray(data.earnedProjectTitles)
        ? data.earnedProjectTitles
        : [];

      const unlockedBadges = normalizeUnlockedBadges(rawBadges);
      const avatarIds = normalizeAvatarIds(rawAvatars);

      const unlockedTitles = unique([
        ...normalizeTitles(rawUnlockedTitles),
        ...normalizeTitles(rawEarnedProjectTitles),
      ]);

      const completedProjects = rawProjects.filter(Boolean);

      if (!initializedRef.current) {
        initializedRef.current = true;
        previousBadgesRef.current = unlockedBadges;
        previousTitlesRef.current = unlockedTitles;
        previousAvatarsRef.current = avatarIds;
        previousProjectsRef.current = completedProjects;
        return;
      }

      const newBadges = unlockedBadges.filter(
        (badgeId) => !previousBadgesRef.current.includes(badgeId),
      );

      const newTitles = unlockedTitles.filter(
        (title) => !previousTitlesRef.current.includes(title),
      );

      const newProjects = completedProjects.filter(
        (projectId) => !previousProjectsRef.current.includes(projectId),
      );

      newBadges.forEach((badgeId) => {
        const badge = getBadgeDefinition(badgeId);

        pushUnlock({
          id: badgeId,
          type: "badge",
          title: badge?.name ?? "Badge Unlocked",
          subtitle:
            badge?.description ??
            "A new badge has been unlocked on your account.",
          accent: badge?.accent ?? "#F59E0B",
          emoji: badge?.icon ?? "🏅",
        });
      });

      newTitles.forEach((title) => {
        pushUnlock({
          id: `title-${title}`,
          type: "title",
          title: "New Title Unlocked",
          subtitle: title,
          accent: "#8B5CF6",
          emoji: "👑",
        });
      });

      newProjects.forEach((projectId) => {
        const project = projectMetaMap[projectId];

        pushUnlock({
          id: projectId,
          type: "project",
          title: project?.name || "Project Completed",
          subtitle: project?.awardTitle
            ? `Completed project and unlocked title: ${project.awardTitle}`
            : "You completed a project! Reward XP has been added to your account.",
          accent: "#F59E0B",
          emoji: "🚀",
        });
      });

      previousBadgesRef.current = unlockedBadges;
      previousTitlesRef.current = unlockedTitles;
      previousAvatarsRef.current = avatarIds;
      previousProjectsRef.current = completedProjects;
    });

    return unsubscribe;
  }, [user, pushUnlock]);

  const value = useMemo(
    () => ({
      pushUnlock,
    }),
    [pushUnlock],
  );

  return (
    <UnlocksContext.Provider value={value}>
      {children}

      <GlobalUnlockModal
        visible={!!active}
        item={active}
        onClose={handleClose}
      />
    </UnlocksContext.Provider>
  );
};

export const useUnlocks = () => {
  const context = useContext(UnlocksContext);

  if (!context) {
    throw new Error("useUnlocks must be used within UnlocksProvider");
  }

  return context;
};
