import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import projectsData from "../data/projects.json";
import { XPContext } from "./XPContext";

export type Project = {
  id: string;
  name: string;
  description: string;
  instructions?: string;
  xp: number;
  requiredSkillLevel?: ("Beginner" | "Intermediate" | "Advanced")[];
  completed?: boolean;
};

type ProjectsContextType = {
  projects: Project[];
  getProjectById: (id: string) => Project | undefined;
  isAccessible: (project: Project) => boolean;
  markProjectDone: (id: string) => Promise<void>;
  resetAllProjects: () => Promise<void>;
};

export const ProjectsContext = createContext<ProjectsContextType>({
  projects: [],
  getProjectById: () => undefined,
  isAccessible: () => false,
  markProjectDone: async () => {},
  resetAllProjects: async () => {},
});

const STORAGE_KEY = "@myapp:projects_completed_v1";

export const ProjectsProvider = ({ children }: { children: ReactNode }) => {
  const { userSkillLevel, completedLessons, addXP } = useContext(XPContext);

  const initial: Project[] = (projectsData as Project[]).map((p) => ({
    ...p,
    completed: !!p.completed,
  }));

  const [projects, setProjects] = useState<Project[]>(initial);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const completedMap: Record<string, boolean> = JSON.parse(raw);

          setProjects((prev) =>
            prev.map((p) => ({
              ...p,
              completed: completedMap[p.id] ?? false,
            })),
          );
        }
      } catch (e) {
        console.warn("Failed loading projects", e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const completedMap: Record<string, boolean> = {};
      projects.forEach((p) => {
        completedMap[p.id] = !!p.completed;
      });

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(completedMap));
    })();
  }, [projects]);

  const getProjectById = (id: string) => projects.find((p) => p.id === id);

  const isAccessible = (project: Project) => {
    // Skill requirement
    if (
      project.requiredSkillLevel &&
      !project.requiredSkillLevel.includes(userSkillLevel)
    ) {
      return false;
    }

    // Starter project always unlocked
    if (project.id === "proj-0") return true;

    // Beginner lesson gate
    if (userSkillLevel === "Beginner") {
      if (completedLessons.length < 3) return false;
    }

    return true;
  };

  const markProjectDone = async (id: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          if (p.completed) return p;

          addXP(p.xp);
          return { ...p, completed: true };
        }
        return p;
      }),
    );
  };

  const resetAllProjects = async () => {
    setProjects((prev) => prev.map((p) => ({ ...p, completed: false })));
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      projects,
      getProjectById,
      isAccessible,
      markProjectDone,
      resetAllProjects,
    }),
    [projects, userSkillLevel, completedLessons],
  );

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
};
