import React, { useMemo } from "react";
import UnlockCelebrationModal, {
  UnlockCelebrationItem,
} from "./UnlockCelebrationModal";
import { UnlockItem } from "../../context/UnlocksContext";
import { BADGE_DEFS } from "../../../services/badges";

type Props = {
  visible: boolean;
  item: UnlockItem | null;
  onClose: () => void;
};

const DEFAULT_BADGE_META: Record<string, { icon: string; accent: string }> = {
  first_lesson: { icon: "🚀", accent: "#F59E0B" },
  xp_100: { icon: "✨", accent: "#8B5CF6" },
  xp_1000: { icon: "🔥", accent: "#EF4444" },
  spin_1: { icon: "🎰", accent: "#06B6D4" },
  streak_3: { icon: "⚡", accent: "#F97316" },
  streak_7: { icon: "🏆", accent: "#10B981" },
  review_1: { icon: "📘", accent: "#6366F1" },
};

export default function GlobalUnlockModal({ visible, item, onClose }: Props) {
  const celebrationItem = useMemo<UnlockCelebrationItem | null>(() => {
    if (!item) return null;

    if (item.type === "badge") {
      const badgeDef = BADGE_DEFS.find((badge) => badge.id === item.id);
      const badgeMeta = DEFAULT_BADGE_META[item.id ?? ""] ?? {
        icon: item.emoji ?? "🏅",
        accent: item.accent ?? "#F59E0B",
      };

      return {
        type: "badge",
        id: item.id ?? "badge",
        name: badgeDef?.name ?? item.title,
        description:
          badgeDef?.description ??
          item.subtitle ??
          "A new badge has been unlocked.",
        icon: badgeMeta.icon,
        accent: badgeMeta.accent,
      };
    }

    if (item.type === "title") {
      return {
        type: "title",
        title: item.subtitle || item.title,
        accent: item.accent ?? "#6C63FF",
        icon: item.emoji ?? "👑",
      };
    }

    if (item.type === "avatar") {
      return {
        type: "avatar",
        name: item.subtitle || item.title,
        description: "A new avatar has been added to your collection.",
        accent: item.accent ?? "#06B6D4",
        icon: item.emoji ?? "🎨",
      };
    }

    if (item.type === "project") {
      return {
        type: "project",
        title: item.title,
        description: item.subtitle || "A new project brief has been unlocked.",
        accent: item.accent ?? "#F59E0B",
        icon: item.emoji ?? "🚀",
      };
    }

    return {
      type: "achievement",
      title: item.title,
      description: item.subtitle,
      accent: item.accent ?? "#10B981",
      icon: item.emoji ?? "🏆",
    };
  }, [item]);

  return (
    <UnlockCelebrationModal
      visible={visible}
      item={celebrationItem}
      onClose={onClose}
    />
  );
}
