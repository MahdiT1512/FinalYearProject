import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Slot } from "expo-router";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { XPProvider } from "./context/XPContext";
import { SyntaxProvider } from "./context/SyntaxContext";
import { ProjectsProvider } from "./context/ProjectContext";
import { LeaderboardProvider } from "./context/LeaderboardContext";
import { UnlocksProvider } from "./context/UnlocksContext";
import { DailyGoalsProvider } from "./context/dailyGoalsContext";
import { SessionSummaryProvider } from "./context/SessionSummaryContext";

import LoginScreen from "./auth/login";

function AppGate() {
  const { user, loading } = useAuth();

  if (loading) {
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

  if (!user) {
    return <LoginScreen />;
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <UnlocksProvider>
        <XPProvider>
          <LeaderboardProvider>
            <ProjectsProvider>
              <SyntaxProvider>
                <DailyGoalsProvider>
                  <SessionSummaryProvider>
                    <AppGate />
                  </SessionSummaryProvider>
                </DailyGoalsProvider>
              </SyntaxProvider>
            </ProjectsProvider>
          </LeaderboardProvider>
        </XPProvider>
      </UnlocksProvider>
    </AuthProvider>
  );
}
