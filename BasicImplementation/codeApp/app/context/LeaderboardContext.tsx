import React, {
  createContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "./AuthContext";
import { getCountryName, normalizeCountryCode } from "../data/countries";

export type LeaderboardUser = {
  id: string;
  username: string;
  anonymous: boolean;
  country?: string;
  countryName?: string;
  badges?: string[];
  weeklyXP: number;
  monthlyXP: number;
  allTimeXP: number;
  photoURL?: string;
  equippedTitle?: string | null;
};

type LeaderboardContextType = {
  users: LeaderboardUser[];
  currentUserId: string;
  loading: boolean;
};

export const LeaderboardContext = createContext<LeaderboardContextType>({
  users: [],
  currentUserId: "",
  loading: true,
});

function normalizeBadges(raw: any): string[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((b) => {
      if (typeof b === "string") return b;
      if (b?.name) return b.name;
      if (b?.id) return b.id;
      return null;
    })
    .filter(Boolean);
}

export const LeaderboardProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usersRef = collection(db, "users");

    const unsubscribe = onSnapshot(usersRef, (snap) => {
      const mapped: LeaderboardUser[] = snap.docs.map((docSnap) => {
        const data = docSnap.data();
        const normalizedCountry = normalizeCountryCode(data.country || "");

        return {
          id: docSnap.id,
          username: data.username || "Unnamed User",
          anonymous: !!data.anonymous,
          country: normalizedCountry,
          countryName: data.countryName || getCountryName(normalizedCountry),
          badges: normalizeBadges(data.badges),
          weeklyXP: data.weeklyXP ?? 0,
          monthlyXP: data.monthlyXP ?? 0,
          allTimeXP: data.allTimeXP ?? 0,
          photoURL: data.photoURL || "",
          equippedTitle: data.equippedTitle ?? null,
        };
      });

      setUsers(mapped);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      users,
      currentUserId: user?.uid ?? "",
      loading,
    }),
    [users, user?.uid, loading],
  );

  return (
    <LeaderboardContext.Provider value={value}>
      {children}
    </LeaderboardContext.Provider>
  );
};
