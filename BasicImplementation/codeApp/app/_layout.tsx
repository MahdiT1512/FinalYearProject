import React from "react";
import { XPProvider } from "./context/XPContext";
import { SyntaxProvider } from "./context/SyntaxContext";
import { ProjectsProvider } from "./context/ProjectContext";
import { LeaderboardProvider } from "./context/LeaderboardContext";
import { Slot } from "expo-router";

export default function RootLayout() {
  return (
    <XPProvider>
      <LeaderboardProvider>
        <ProjectsProvider>
          <SyntaxProvider>
            <Slot />
          </SyntaxProvider>
        </ProjectsProvider>
      </LeaderboardProvider>
    </XPProvider>
  );
}
