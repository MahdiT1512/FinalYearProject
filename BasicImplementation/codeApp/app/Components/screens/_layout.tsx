import React from "react";
import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

//Tab icon component that keeps each tab with the same label and styling
function TabIcon({
  focused,
  color,
  label,
  icon,
  bgColor,
}: {
  focused: boolean;
  color: string;
  label: string;
  icon: React.ReactNode;
  bgColor: string;
}) {
  return (
    <View style={styles.tabItemWrap}>
      <View
        style={[
          styles.iconBubble,
          focused && {
            backgroundColor: bgColor,
            transform: [{ translateY: -2 }],
          },
        ]}
      >
        {icon}
      </View>
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? "#111827" : "#7C8594" },
          focused && styles.tabLabelActive,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// This layout is shared by all tabs that are in the tabs directory. These tabs are for the main features of the app(Syntax, Projects, Leaderboard and Learning)
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          left: 14,
          right: 14,
          bottom: 14,
          height: 82,
          borderRadius: 28,
          backgroundColor: "rgba(255,255,255,0.96)",
          borderTopWidth: 0,
          paddingTop: 10,
          paddingBottom: 10,
          paddingHorizontal: 8,
          shadowColor: "#000",
          shadowOpacity: 0.14,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 14,
        },
        sceneStyle: {
          backgroundColor: "#F7F8FC",
        },
        tabBarItemStyle: {
          borderRadius: 22,
          marginHorizontal: 2,
        },
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === "index") {
            return (
              <TabIcon
                focused={focused}
                color={color}
                label="Learn"
                bgColor="#EDE9FE"
                icon={
                  <Ionicons
                    name={focused ? "book" : "book-outline"}
                    size={size + 2}
                    color={focused ? "#6D28D9" : "#8B5CF6"}
                  />
                }
              />
            );
          }

          if (route.name === "syntax") {
            return (
              <TabIcon
                focused={focused}
                color={color}
                label="Syntax"
                bgColor="#DBEAFE"
                icon={
                  <MaterialCommunityIcons
                    name="code-tags"
                    size={size + 2}
                    color={focused ? "#2563EB" : "#60A5FA"}
                  />
                }
              />
            );
          }

          if (route.name === "projects") {
            return (
              <TabIcon
                focused={focused}
                color={color}
                label="Projects"
                bgColor="#FEF3C7"
                icon={
                  <Ionicons
                    name={focused ? "rocket" : "rocket-outline"}
                    size={size + 2}
                    color={focused ? "#D97706" : "#F59E0B"}
                  />
                }
              />
            );
          }

          if (route.name === "leaderboard") {
            return (
              <TabIcon
                focused={focused}
                color={color}
                label="Ranks"
                bgColor="#FCE7F3"
                icon={
                  <Ionicons
                    name={focused ? "trophy" : "trophy-outline"}
                    size={size + 2}
                    color={focused ? "#DB2777" : "#F472B6"}
                  />
                }
              />
            );
          }

          return (
            <TabIcon
              focused={focused}
              color={color}
              label="Tab"
              bgColor="#E5E7EB"
              icon={
                <Ionicons
                  name={focused ? "ellipse" : "ellipse-outline"}
                  size={size}
                  color={focused ? "#111827" : "#9CA3AF"}
                />
              }
            />
          );
        },
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Learn",
        }}
      />

      <Tabs.Screen
        name="syntax"
        options={{
          title: "Syntax",
        }}
      />

      <Tabs.Screen
        name="projects"
        options={{
          title: "Projects",
        }}
      />

      <Tabs.Screen
        name="leaderboard"
        options={{
          title: "Ranks",
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItemWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 74,
  },

  iconBubble: {
    minWidth: 50,
    height: 42,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    backgroundColor: "transparent",
  },

  tabLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "800",
  },

  tabLabelActive: {
    fontWeight: "900",
  },
});
