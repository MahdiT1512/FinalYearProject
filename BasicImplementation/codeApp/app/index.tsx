import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "./context/AuthContext";

type UserDoc = {
  hasCompletedOnboarding?: boolean;
  preferredStartPath?: "lessons" | "syntax" | "profile" | null;
};

export default function Index() {
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const resolveRoute = async () => {
      if (loading) return;

      if (!user) {
        setTarget("/auth/login");
        setChecking(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));

        if (!snap.exists()) {
          setTarget("/onboarding/welcome");
          setChecking(false);
          return;
        }

        const data = snap.data() as UserDoc;

        if (!data.hasCompletedOnboarding) {
          setTarget("/onboarding/welcome");
          setChecking(false);
          return;
        }

        if (data.preferredStartPath === "syntax") {
          setTarget("/syntax");
          setChecking(false);
          return;
        }

        if (data.preferredStartPath === "profile") {
          setTarget("/User/MyProfile");
          setChecking(false);
          return;
        }

        setTarget("/Components/screens");
      } finally {
        setChecking(false);
      }
    };

    resolveRoute();
  }, [user, loading]);

  if (loading || checking || !target) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F7F8FC",
        }}
      >
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return <Redirect href={target as any} />;
}
