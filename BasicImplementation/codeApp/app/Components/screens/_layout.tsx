import { Tabs } from "expo-router";
import React from "react";
import { XPProvider } from "../../context/XPContext";


export default function RootLayout() {
  return(
  <XPProvider>
  <Tabs screenOptions={{
    headerShown: false, 
  }}>
    <Tabs.Screen name="index" options={{ title: "Learn" }} />
    <Tabs.Screen name="syntax" options={{ title: "Syntax" }} />
    <Tabs.Screen name="projects" options={{ title: "Projects" }} />
    <Tabs.Screen name="leaderboard" options={{ title: "Leaderboard" }} />
  </Tabs>
  </XPProvider>
  )
}
