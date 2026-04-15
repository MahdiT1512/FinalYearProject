import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Switch,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import { db } from "../../firebase/config";
import { useAuth } from "../context/AuthContext";
import {
  changePasswordWithCurrentPassword,
  sendResetPasswordEmail,
} from "../../services/auth";
import CountryPickerField from "../Components/common/CountryPickerField";
import { getCountryName, normalizeCountryCode } from "../data/countries";

type SkillLevel = "Beginner" | "Intermediate" | "Advanced";

type UserDoc = {
  username?: string;
  country?: string;
  anonymous?: boolean;
  userSkillLevel?: SkillLevel;
};

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export default function EditProfile() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("Beginner");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));

        if (snap.exists()) {
          const data = snap.data() as UserDoc;
          setUsername(data.username || "");
          setCountry(normalizeCountryCode(data.country || ""));
          setAnonymous(!!data.anonymous);
          setSkillLevel((data.userSkillLevel as SkillLevel) || "Beginner");
        }
      } catch {
        Alert.alert("Error", "Could not load your profile.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const trimmedUsername = useMemo(() => username.trim(), [username]);
  const normalizedCountry = useMemo(
    () => normalizeCountryCode(country),
    [country],
  );

  const usernameError = useMemo(() => {
    if (!trimmedUsername) return "Username is required.";
    if (trimmedUsername.length < 3)
      return "Username must be at least 3 characters.";
    if (trimmedUsername.length > 20)
      return "Username must be 20 characters or fewer.";
    if (!USERNAME_REGEX.test(trimmedUsername)) {
      return "Use only letters, numbers, and underscores.";
    }
    return "";
  }, [trimmedUsername]);

  const countryError = useMemo(() => {
    if (!normalizedCountry) return "Please choose your country.";
    return "";
  }, [normalizedCountry]);

  const passwordError = useMemo(() => {
    if (!newPassword && !confirmPassword && !currentPassword) return "";
    if (!currentPassword) return "Enter your current password.";
    if (!newPassword) return "Enter a new password.";
    if (newPassword.length < 6)
      return "New password must be at least 6 characters.";
    if (newPassword !== confirmPassword) return "New passwords do not match.";
    if (currentPassword === newPassword) {
      return "Your new password should be different.";
    }
    return "";
  }, [currentPassword, newPassword, confirmPassword]);

  const handleSaveProfile = async () => {
    if (!user) return;

    if (usernameError) {
      Alert.alert("Invalid username", usernameError);
      return;
    }

    if (countryError) {
      Alert.alert("Missing country", countryError);
      return;
    }

    try {
      setSavingProfile(true);

      await updateDoc(doc(db, "users", user.uid), {
        username: trimmedUsername,
        country: normalizedCountry,
        countryName: getCountryName(normalizedCountry),
        anonymous,
        userSkillLevel: skillLevel,
      });

      Alert.alert("Profile updated", "Your changes were saved successfully.");
    } catch {
      Alert.alert("Error", "Could not save your profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) {
      Alert.alert("Error", "No email found for this account.");
      return;
    }

    if (passwordError) {
      Alert.alert("Password issue", passwordError);
      return;
    }

    try {
      setSavingPassword(true);

      await changePasswordWithCurrentPassword(
        user.email,
        currentPassword,
        newPassword,
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      Alert.alert("Password changed", "Your password was updated.");
    } catch (err: any) {
      Alert.alert(
        "Could not change password",
        err?.message || "Please check your current password and try again.",
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSendReset = async () => {
    if (!user?.email) {
      Alert.alert("Error", "No email found for this account.");
      return;
    }

    try {
      setSendingReset(true);
      await sendResetPasswordEmail(user.email);
      Alert.alert(
        "Reset email sent",
        "Check your inbox for password reset instructions.",
      );
    } catch (err: any) {
      Alert.alert(
        "Could not send reset email",
        err?.message || "Please try again.",
      );
    } finally {
      setSendingReset(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>Account</Text>
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.subtitle}>
            Tune how you appear, learn, and sign in.
          </Text>
        </View>

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile Details</Text>
        <Text style={styles.cardHint}>
          This is what shapes your identity across the app.
        </Text>

        <Text style={styles.label}>Email</Text>
        <Text style={styles.readonlyValue}>{user?.email ?? "—"}</Text>

        <Text style={styles.label}>Username</Text>
        <TextInput
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          style={[
            styles.input,
            !!usernameError && username.length > 0 && styles.inputError,
          ]}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
        />
        <Text
          style={[
            styles.helperText,
            !!usernameError && username.length > 0 && styles.helperError,
          ]}
        >
          {usernameError && username.length > 0
            ? usernameError
            : "3–20 characters. Letters, numbers, underscores."}
        </Text>

        <Text style={styles.label}>Country</Text>
        <CountryPickerField value={country} onChange={setCountry} />
        <Text style={[styles.helperText, !!countryError && styles.helperError]}>
          {normalizedCountry
            ? `Selected: ${getCountryName(normalizedCountry)}`
            : countryError}
        </Text>

        <Text style={styles.label}>Skill Level</Text>
        <Text style={styles.sectionSubcopy}>
          This helps guide recommendations and difficulty.
        </Text>
        <View style={styles.skillRow}>
          {(["Beginner", "Intermediate", "Advanced"] as SkillLevel[]).map(
            (level) => {
              const selected = skillLevel === level;

              return (
                <Pressable
                  key={level}
                  style={[
                    styles.skillButton,
                    selected && styles.skillButtonActive,
                  ]}
                  onPress={() => setSkillLevel(level)}
                >
                  <Text
                    style={[
                      styles.skillButtonText,
                      selected && styles.skillButtonTextActive,
                    ]}
                  >
                    {level}
                  </Text>
                </Pressable>
              );
            },
          )}
        </View>

        <View style={styles.visibilityCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.visibilityTitle}>Leaderboard privacy</Text>
            <Text style={styles.visibilityText}>
              {anonymous
                ? "You appear anonymously on public boards."
                : "Your username and country can appear on public boards."}
            </Text>
          </View>

          <Switch value={anonymous} onValueChange={setAnonymous} />
        </View>

        <Pressable
          style={[styles.saveButton, savingProfile && styles.buttonDisabled]}
          onPress={handleSaveProfile}
          disabled={savingProfile}
        >
          <Text style={styles.saveText}>
            {savingProfile ? "Saving..." : "Save Profile Changes"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Security</Text>
        <Text style={styles.cardHint}>
          Change your password or send yourself a reset email.
        </Text>

        <Text style={styles.label}>Current Password</Text>
        <TextInput
          placeholder="Current password"
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
          style={styles.input}
        />

        <Text style={styles.label}>New Password</Text>
        <TextInput
          placeholder="New password"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          style={styles.input}
        />

        <Text style={styles.label}>Confirm New Password</Text>
        <TextInput
          placeholder="Confirm new password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={styles.input}
        />

        {!!passwordError && (
          <Text style={[styles.helperText, styles.helperError]}>
            {passwordError}
          </Text>
        )}

        <Pressable
          style={[
            styles.passwordButton,
            (savingPassword || !!passwordError) && styles.buttonDisabled,
          ]}
          onPress={handleChangePassword}
          disabled={savingPassword || !!passwordError}
        >
          <Text style={styles.passwordButtonText}>
            {savingPassword ? "Updating..." : "Change Password"}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.secondaryButton,
            sendingReset && styles.buttonDisabledLight,
          ]}
          onPress={handleSendReset}
          disabled={sendingReset}
        >
          <Text style={styles.secondaryButtonText}>
            {sendingReset ? "Sending..." : "Send Password Reset Email"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#F7F8FC",
    flexGrow: 1,
    paddingBottom: 36,
  },

  loadingWrap: {
    flex: 1,
    backgroundColor: "#F7F8FC",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    color: "#6B7280",
    fontWeight: "700",
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    gap: 16,
  },

  eyebrow: {
    color: "#6C63FF",
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },

  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111827",
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    maxWidth: 280,
  },

  backButton: {
    backgroundColor: "#FFFFFF",
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  backText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },

  cardTitle: {
    fontWeight: "900",
    fontSize: 18,
    color: "#111827",
  },

  cardHint: {
    marginTop: 4,
    marginBottom: 12,
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 18,
  },

  label: {
    fontWeight: "800",
    marginTop: 14,
    marginBottom: 6,
    color: "#111827",
    fontSize: 13,
  },

  readonlyValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4B5563",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },

  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    padding: 13,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    color: "#111827",
  },

  inputError: {
    borderColor: "#DC2626",
  },

  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },

  helperError: {
    color: "#DC2626",
  },

  sectionSubcopy: {
    color: "#6B7280",
    fontSize: 12,
    marginBottom: 8,
  },

  skillRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },

  skillButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#EEF0F4",
    alignItems: "center",
  },

  skillButtonActive: {
    backgroundColor: "#111827",
  },

  skillButtonText: {
    color: "#374151",
    fontWeight: "800",
    fontSize: 13,
  },

  skillButtonTextActive: {
    color: "#FFFFFF",
  },

  visibilityCard: {
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  visibilityTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  visibilityText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: "#6B7280",
  },

  saveButton: {
    marginTop: 18,
    backgroundColor: "#6C63FF",
    paddingVertical: 15,
    borderRadius: 14,
  },

  saveText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 15,
  },

  passwordButton: {
    marginTop: 18,
    backgroundColor: "#111827",
    paddingVertical: 15,
    borderRadius: 14,
  },

  passwordButtonText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 15,
  },

  secondaryButton: {
    marginTop: 10,
    backgroundColor: "#EEF2FF",
    paddingVertical: 14,
    borderRadius: 14,
  },

  secondaryButtonText: {
    color: "#4338CA",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 14,
  },

  buttonDisabled: {
    opacity: 0.55,
  },

  buttonDisabledLight: {
    opacity: 0.65,
  },
});
