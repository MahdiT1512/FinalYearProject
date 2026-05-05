import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { EnhancedFeedback } from "../../../services/questionFeedback";

export default function QuestionFeedbackCard({
  feedback,
}: {
  feedback: EnhancedFeedback | null;
}) {
  if (!feedback) return null;

  const success = feedback.tone === "success";
  const warning = feedback.tone === "warning";
  const error = feedback.tone === "error";

  return (
    <View
      style={[
        styles.card,
        success && styles.successCard,
        warning && styles.warningCard,
        error && styles.errorCard,
      ]}
    >
      <Text style={styles.title}>{feedback.title}</Text>
      <Text style={styles.message}>{feedback.message}</Text>

      {!!feedback.hint && (
        <Text style={styles.hint}>Hint: {feedback.hint}</Text>
      )}

      {!!feedback.likelyMistakeType && (
        <Text style={styles.meta}>
          Likely issue: {feedback.likelyMistakeType}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },

  successCard: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },

  warningCard: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },

  errorCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },

  title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  message: {
    marginTop: 6,
    color: "#374151",
    fontWeight: "700",
    lineHeight: 21,
  },

  hint: {
    marginTop: 8,
    color: "#4B5563",
    fontWeight: "700",
    lineHeight: 20,
  },

  meta: {
    marginTop: 8,
    color: "#6B7280",
    fontWeight: "800",
    fontSize: 12,
    textTransform: "capitalize",
  },
});
