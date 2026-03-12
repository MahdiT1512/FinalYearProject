// Components/common/LessonDeck.tsx
import React, { useContext, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import lessonsData from "../../data/lessons.json";
import { XPContext } from "../../context/XPContext";

const { width } = Dimensions.get("window");

export default function LessonDeck() {
  const router = useRouter();
  const { completedLessons } = useContext(XPContext);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeLesson, setActiveLesson] = useState<any | null>(null);

  // Filter only completed lessons for the deck
  const deck = useMemo(() => {
    const lessons = lessonsData as any[];

    const completed = lessons.filter((l) => completedLessons.includes(l.id));

    // Sort by completion order (older completed first)
    completed.sort(
      (a, b) => completedLessons.indexOf(a.id) - completedLessons.indexOf(b.id),
    );

    // Only show up to 6 lessons in deck
    return completed.slice(0, 6);
  }, [completedLessons]);

  if (!deck.length) return null; // hide deck if nothing completed

  const onPressCard = (lesson: any) => {
    setActiveLesson(lesson);
    setModalVisible(true);
  };

  const onStart = () => {
    if (!activeLesson) return;
    setModalVisible(false);
    router.push(`/learn/${encodeURIComponent(activeLesson.id)}`);
  };

  const onSkip = () => {
    setModalVisible(false);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Lesson Deck</Text>

      <View style={styles.deckContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {deck.map((lesson, idx) => {
            const overlap = Math.max(0, Math.min(3, idx));
            const cardWidth = Math.min(220, Math.round(width * 0.6));
            const scale = 1 - overlap * 0.04;
            const marginLeft = idx === 0 ? 0 : -40;
            return (
              <TouchableOpacity
                key={lesson.id}
                onPress={() => onPressCard(lesson)}
                activeOpacity={0.9}
                style={[
                  styles.card,
                  {
                    width: cardWidth,
                    transform: [{ scale }],
                    marginLeft,
                    zIndex: 100 - idx,
                  },
                ]}
              >
                <Text numberOfLines={2} style={styles.cardTitle}>
                  {lesson.title}
                </Text>
                <Text style={styles.cardModule}>
                  {lesson.module ?? "General"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{activeLesson?.title}</Text>
            <Text style={styles.modalStat}>
              Module: {activeLesson?.module ?? "General"}
            </Text>
            <Text style={styles.modalStat}>Completed before: Yes</Text>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.btn, styles.startBtn]}
                onPress={onStart}
              >
                <Text style={styles.btnText}>Start</Text>
              </Pressable>

              <Pressable style={[styles.btn, styles.skipBtn]} onPress={onSkip}>
                <Text style={styles.btnText}>Skip</Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.closeX}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeXText}>✕</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: "100%", paddingVertical: 10 },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 8, marginLeft: 6 },
  deckContainer: { height: 140, justifyContent: "center" },
  scrollContent: { alignItems: "center", paddingLeft: 8, paddingRight: 16 },
  card: {
    height: 120,
    borderRadius: 12,
    backgroundColor: "#FFAEBC",
    padding: 12,
    justifyContent: "space-between",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    marginVertical: 6,
  },
  cardTitle: { color: "#fff", fontWeight: "800", fontSize: 14 },
  cardModule: { color: "#fff", opacity: 0.9, fontSize: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modal: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    position: "relative",
  },
  modalTitle: { fontSize: 20, fontWeight: "800", marginBottom: 8 },
  modalStat: { color: "#555", marginBottom: 6 },
  modalButtons: {
    flexDirection: "row",
    marginTop: 14,
    width: "100%",
    justifyContent: "space-between",
  },
  btn: { paddingVertical: 10, paddingHorizontal: 22, borderRadius: 10 },
  startBtn: { backgroundColor: "#4CAF50" },
  skipBtn: { backgroundColor: "#FF6B6B" },
  btnText: { color: "#fff", fontWeight: "700" },
  closeX: { position: "absolute", top: 10, right: 10 },
  closeXText: { fontSize: 18, fontWeight: "700", color: "#444" },
});
