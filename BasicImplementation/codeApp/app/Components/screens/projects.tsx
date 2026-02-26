import React, { useContext } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { XPContext } from "../../context/XPContext";
import { ProjectsContext } from "../../context/ProjectContext";

export default function ProjectsScreen() {
  const router = useRouter();

  const { xp, userSkillLevel, completedLessons } = useContext(XPContext);
  const { projects, isAccessible } = useContext(ProjectsContext);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Projects</Text>
      <Text style={styles.xp}>Total XP: {xp}</Text>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => {
          const accessible = isAccessible(
            item,
            userSkillLevel,
            completedLessons.length,
          );

          return (
            <TouchableOpacity
              style={[
                styles.card,
                !accessible && styles.lockedCard,
                item.completed && styles.completedCard,
              ]}
              disabled={!accessible}
              onPress={() =>
                router.push({
                  pathname: "/projects/[projectId]",
                  params: { projectId: item.id },
                })
              }
            >
              <Text style={styles.title}>{item.name}</Text>

              <Text style={styles.desc}>{item.description}</Text>

              {/* Skill Tags */}
              <View style={styles.tagRow}>
                {item.requiredSkillLevel?.map((skill) => (
                  <View key={skill} style={styles.tag}>
                    <Text style={styles.tagText}>{skill}</Text>
                  </View>
                ))}
              </View>

              {/* Status Labels */}
              {!accessible && <Text style={styles.lockText}>🔒 Locked</Text>}

              {item.completed && (
                <Text style={styles.doneText}>✅ Completed</Text>
              )}

              <Text style={styles.xpReward}>XP Reward: {item.xp}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },

  header: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },

  xp: {
    fontSize: 16,
    marginBottom: 16,
    color: "#444",
  },

  card: {
    backgroundColor: "#f2f2f2",
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
  },

  lockedCard: {
    backgroundColor: "#ddd",
    opacity: 0.6,
  },

  completedCard: {
    backgroundColor: "#E6F9ED",
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
  },

  desc: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
  },

  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },

  tag: {
    backgroundColor: "#EAF4FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginTop: 6,
  },

  tagText: {
    fontSize: 12,
  },

  lockText: {
    marginTop: 8,
    color: "#c43a3a",
    fontWeight: "700",
  },

  doneText: {
    marginTop: 8,
    color: "#1B9C85",
    fontWeight: "700",
  },

  xpReward: {
    marginTop: 6,
    fontWeight: "600",
  },
});
