// app/_layout.tsx
import React from "react";
import { XPProvider } from "./context/XPContext";
import { Slot } from "expo-router";

export default function RootLayout() {
  return (
    <XPProvider>
      <Slot /> {/* Everything under app/ now has XPContext */}
    </XPProvider>
  );
}
