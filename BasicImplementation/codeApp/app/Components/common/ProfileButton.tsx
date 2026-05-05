import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../../firebase/config";
import {
  buildAvatarUrl,
  DEFAULT_AVATAR_STYLE,
  UserAvatarSkin,
} from "../../../services/avatar";

type UserProfileDoc = {
  photoURL?: string;
  equippedAvatarId?: string;
  avatars?: UserAvatarSkin[];
};

//A profile button component that shows the users current avatar and takes them to their profile when clicked.
//The avatar is synced in real time as user makes changes to the user profile.
export default function ProfileButton() {
  const router = useRouter();
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setAvatarUrl(null);
      return;
    }

    const userRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (!snap.exists()) {
        setAvatarUrl(buildAvatarUrl(DEFAULT_AVATAR_STYLE, user.uid, 128));
        return;
      }

      const data = snap.data() as UserProfileDoc;

      if (data.photoURL) {
        setAvatarUrl(data.photoURL);
        return;
      }

      const equipped = data.avatars?.find(
        (a) => a.id === data.equippedAvatarId,
      );

      if (equipped) {
        setAvatarUrl(
          buildAvatarUrl(equipped.avatarStyle, equipped.avatarSeed, 128),
        );
      } else {
        setAvatarUrl(buildAvatarUrl(DEFAULT_AVATAR_STYLE, user.uid, 128));
      }
    });

    return unsubscribe;
  }, [user]);

  if (!user) return null;

  return (
    <Pressable
      onPress={() => router.push("/User/MyProfile")}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      <View style={styles.outerRing}>
        <Image
          source={{
            uri:
              avatarUrl || buildAvatarUrl(DEFAULT_AVATAR_STYLE, user.uid, 128),
          }}
          style={styles.image}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },

  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },

  outerRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    padding: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  image: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
  },
});
