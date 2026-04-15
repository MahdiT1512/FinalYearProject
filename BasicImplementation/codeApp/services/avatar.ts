export const AVATAR_STYLES = [
  "bottts",
  "avataaars",
  "lorelei",
  "initials",
  "adventurer",
] as const;

export type AvatarStyle = (typeof AVATAR_STYLES)[number];

export type AvatarRarity = "common" | "rare" | "epic" | "legendary";

export type UserAvatarSkin = {
  id: string;
  avatarStyle: AvatarStyle;
  avatarSeed: string;
  unlocked: boolean;
  name: string;
  rarity: AvatarRarity;
  rewardTitle: string | null;
  frameColor: string;
  accentColor: string;
};

export const DEFAULT_AVATAR_STYLE: AvatarStyle = "bottts";

export const RARITY_META: Record<
  AvatarRarity,
  {
    label: string;
    unlockXP: number;
    frameColor: string;
    accentColor: string;
    rewardTitle: string | null;
    perk: string;
  }
> = {
  common: {
    label: "Common",
    unlockXP: 0,
    frameColor: "#D0D0D0",
    accentColor: "#8A8A8A",
    rewardTitle: null,
    perk: "Standard profile frame",
  },
  rare: {
    label: "Rare",
    unlockXP: 300,
    frameColor: "#4C8DFF",
    accentColor: "#2F6BFF",
    rewardTitle: "Focused Learner",
    perk: "Blue border + profile badge",
  },
  epic: {
    label: "Epic",
    unlockXP: 1200,
    frameColor: "#A855F7",
    accentColor: "#7C3AED",
    rewardTitle: "Syntax Specialist",
    perk: "Purple glow + leaderboard highlight",
  },
  legendary: {
    label: "Legendary",
    unlockXP: 3000,
    frameColor: "#F59E0B",
    accentColor: "#D97706",
    rewardTitle: "Python Master",
    perk: "Gold frame + title + crown",
  },
};

export const buildAvatarUrl = (
  style: AvatarStyle,
  seed: string,
  size = 128
) => {
  return `https://api.dicebear.com/9.x/${style}/png?seed=${encodeURIComponent(
    seed
  )}&size=${size}`;
};

export const avatarLabel = (style: AvatarStyle) => {
  switch (style) {
    case "bottts":
      return "Bot";
    case "avataaars":
      return "Avatar";
    case "lorelei":
      return "Portrait";
    case "initials":
      return "Initials";
    case "adventurer":
      return "Adventurer";
    default:
      return "Avatar";
  }
};

export const generateAvatarId = () => {
  return `avatar_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
};

export const randomAvatarSeed = (base: string = "") => {
  return `${base}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
};

export const getUnlockedRarities = (totalXP: number): AvatarRarity[] => {
  const rarities: AvatarRarity[] = ["common"];
  if (totalXP >= RARITY_META.rare.unlockXP) rarities.push("rare");
  if (totalXP >= RARITY_META.epic.unlockXP) rarities.push("epic");
  if (totalXP >= RARITY_META.legendary.unlockXP) rarities.push("legendary");
  return rarities;
};

export const getNextRarityTarget = (totalXP: number) => {
  if (totalXP < RARITY_META.rare.unlockXP) {
    return { rarity: "rare" as const, xpNeeded: RARITY_META.rare.unlockXP };
  }
  if (totalXP < RARITY_META.epic.unlockXP) {
    return { rarity: "epic" as const, xpNeeded: RARITY_META.epic.unlockXP };
  }
  if (totalXP < RARITY_META.legendary.unlockXP) {
    return {
      rarity: "legendary" as const,
      xpNeeded: RARITY_META.legendary.unlockXP,
    };
  }
  return null;
};

const RARITY_WEIGHTS: Record<AvatarRarity, number> = {
  common: 60,
  rare: 25,
  epic: 10,
  legendary: 5,
};

const RARITY_STYLE_POOLS: Record<AvatarRarity, AvatarStyle[]> = {
  common: ["bottts", "initials"],
  rare: ["avataaars", "lorelei"],
  epic: ["adventurer", "avataaars", "lorelei"],
  legendary: ["bottts", "adventurer", "lorelei"],
};

const pickRandom = <T,>(items: T[]) => {
  return items[Math.floor(Math.random() * items.length)];
};

export const pickSpinRarity = (available: AvatarRarity[]) => {
  const pool = available.map((rarity) => ({
    rarity,
    weight: RARITY_WEIGHTS[rarity],
  }));

  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
  const roll = Math.random() * totalWeight;

  let running = 0;
  for (const item of pool) {
    running += item.weight;
    if (roll <= running) return item.rarity;
  }

  return available[0] ?? "common";
};

export const makeDefaultAvatarSkin = (uid: string): UserAvatarSkin => {
  const meta = RARITY_META.common;
  return {
    id: "default",
    avatarStyle: DEFAULT_AVATAR_STYLE,
    avatarSeed: uid,
    unlocked: true,
    name: "Default",
    rarity: "common",
    rewardTitle: meta.rewardTitle,
    frameColor: meta.frameColor,
    accentColor: meta.accentColor,
  };
};

export const makeSpinAvatarSkin = (
  uid: string,
  totalXP: number
): UserAvatarSkin => {
  const available = getUnlockedRarities(totalXP);
  const rarity = pickSpinRarity(available);
  const meta = RARITY_META[rarity];
  const style = pickRandom(RARITY_STYLE_POOLS[rarity]);

  return {
    id: generateAvatarId(),
    avatarStyle: style,
    avatarSeed: randomAvatarSeed(uid),
    unlocked: true,
    name: `${meta.label} ${avatarLabel(style)}`,
    rarity,
    rewardTitle: meta.rewardTitle,
    frameColor: meta.frameColor,
    accentColor: meta.accentColor,
  };
};

export const getAvatarUrl = (skin: {
  avatarStyle: AvatarStyle;
  avatarSeed: string;
}) => buildAvatarUrl(skin.avatarStyle, skin.avatarSeed, 128);