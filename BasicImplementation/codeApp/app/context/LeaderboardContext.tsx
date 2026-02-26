import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import leaderboardData from "../data/leaderboardTEST.json";
import { XPContext } from "./XPContext";

export type LeaderboardUser = {
  id: string;
  username: string;
  anonymous: boolean;
  country?: string;
  badges?: string[];
  weeklyXP: number;
  monthlyXP: number;
  allTimeXP: number;
};

type LeaderboardContextType = {
  users: LeaderboardUser[];
  currentUserId: string;
};

export const LeaderboardContext = createContext<LeaderboardContextType>({
  users: [],
  currentUserId: "",
});

export const LeaderboardProvider = ({ children }: { children: ReactNode }) => {
  const { xp, username, country } = useContext(XPContext);

  const [users, setUsers] = useState<LeaderboardUser[]>(leaderboardData as any);

  const currentUserId = "current-user"; // can replace with real auth id later

  useEffect(() => {
    setUsers((prev) => {
      const withoutCurrent = prev.filter((u) => u.id !== currentUserId);

      const currentUser: LeaderboardUser = {
        id: currentUserId,
        username: username || "You",
        anonymous: false,
        country: country || "GB",
        badges: [],
        weeklyXP: xp,
        monthlyXP: xp,
        allTimeXP: xp,
      };

      return [...withoutCurrent, currentUser];
    });
  }, [xp, username, country]);

  return (
    <LeaderboardContext.Provider value={{ users, currentUserId }}>
      {children}
    </LeaderboardContext.Provider>
  );
};
