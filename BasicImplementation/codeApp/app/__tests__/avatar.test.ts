import {
  getUnlockedRarities,
  getNextRarityTarget,
  makeDefaultAvatarSkin,
  buildAvatarUrl,
} from "../../services/avatar";

describe("avatar reward logic", () => {
  test("only common rarity is unlocked at 0 XP", () => {
    expect(getUnlockedRarities(0)).toEqual(["common"]);
  });

  test("rare rarity unlocks at 300 XP", () => {
    expect(getUnlockedRarities(300)).toEqual(["common", "rare"]);
  });

  test("epic rarity unlocks at 1200 XP", () => {
    expect(getUnlockedRarities(1200)).toEqual(["common", "rare", "epic"]);
  });

  test("legendary rarity unlocks at 3000 XP", () => {
    expect(getUnlockedRarities(3000)).toEqual([
      "common",
      "rare",
      "epic",
      "legendary",
    ]);
  });

  test("returns next rarity target", () => {
    expect(getNextRarityTarget(100)).toEqual({
      rarity: "rare",
      xpNeeded: 300,
    });
  });

  test("creates default avatar skin from uid", () => {
    const avatar = makeDefaultAvatarSkin("user123");

    expect(avatar.id).toBe("default");
    expect(avatar.avatarSeed).toBe("user123");
    expect(avatar.rarity).toBe("common");
    expect(avatar.unlocked).toBe(true);
  });

  test("builds Dicebear avatar URL", () => {
    const url = buildAvatarUrl("bottts", "user123", 128);

    expect(url).toContain("https://api.dicebear.com/9.x/bottts/png");
    expect(url).toContain("seed=user123");
    expect(url).toContain("size=128");
  });
});