import React, { useContext } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ProjectsContext } from "../context/ProjectContext";

export default function ProjectDetail() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();

  const { getProjectById, markProjectDone, isAccessible } =
    useContext(ProjectsContext);

  const project = getProjectById(projectId);

  if (!project) {
    return (
      <View style={styles.center}>
        <Text>Project not found</Text>
        <Pressable
          onPress={() => router.push("/Components/screens/projects")}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const accessible = isAccessible(project);

  return (
    <ScrollView style={styles.container}>
      {/* Exit always available */}
      <Pressable style={styles.close} onPress={() => router.back()}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>

      <Text style={styles.title}>{project.name}</Text>

      <Text style={styles.section}>
        Skill Level Required:{" "}
        {project.requiredSkillLevel?.join(", ") || "All Levels"}
      </Text>

      <Text style={styles.section}>{project.description}</Text>

      <Text style={styles.sectionTitle}>Instructions</Text>
      <Text style={styles.instructions}>{project.instructions}</Text>

      {/* Skills / Concepts */}
      <Text style={styles.sectionTitle}>Skills & Concepts</Text>
      <View style={styles.tagRow}>
        {project.requiredSkillLevel?.map((skill) => (
          <View key={skill} style={styles.tag}>
            <Text>{skill}</Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: 30 }}>
        {!project.completed && accessible && (
          <Pressable
            style={styles.completeBtn}
            onPress={async () => {
              await markProjectDone(project.id);
              router.push("/Components/screens/projects");
            }}
          >
            <Text style={styles.completeText}>
              Mark Project As Complete (+XP)
            </Text>
          </Pressable>
        )}

        {project.completed && (
          <Text style={styles.completedText}>✅ Project Completed</Text>
        )}

        {!accessible && (
          <Text style={styles.lockText}>
            🔒 You have not unlocked this project yet
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  close: {
    alignSelf: "flex-end",
    backgroundColor: "#FF6B6B",
    padding: 10,
    borderRadius: 8,
  },

  closeText: { color: "#fff", fontWeight: "700" },

  title: { fontSize: 24, fontWeight: "700", marginVertical: 12 },

  section: { fontSize: 15, marginVertical: 6 },

  sectionTitle: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: "700",
  },

  instructions: {
    marginTop: 8,
    fontSize: 15,
    color: "#444",
  },

  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },

  tag: {
    backgroundColor: "#eee",
    padding: 6,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6,
  },

  completeBtn: {
    backgroundColor: "#FFB703",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  completeText: { fontWeight: "700" },

  completedText: {
    color: "#1B9C85",
    fontWeight: "700",
  },

  lockText: {
    color: "#c43a3a",
    marginTop: 10,
    fontWeight: "700",
  },

  button: {
    backgroundColor: "#FFB703",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },

  buttonText: { color: "#fff" },
});
