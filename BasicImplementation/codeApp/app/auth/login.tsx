import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  login,
  signUp,
  sendResetPasswordEmail,
  getFriendlyAuthError,
} from "../../services/auth";
import { createUserDoc, SkillLevel } from "../../services/firestore";
import CountryPickerField from "../Components/common/CountryPickerField";

type Mode = "login" | "signup";

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("Beginner");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const emailTrimmed = email.trim();
  const usernameTrimmed = username.trim();

  const emailLooksValid = useMemo(() => {
    if (!emailTrimmed) return false;
    return /\S+@\S+\.\S+/.test(emailTrimmed);
  }, [emailTrimmed]);

  const usernameLooksValid = useMemo(() => {
    if (!usernameTrimmed) return false;
    return usernameTrimmed.length >= 3;
  }, [usernameTrimmed]);

  const passwordLooksValid = password.length >= 6;

  const signupReady =
    emailLooksValid &&
    passwordLooksValid &&
    usernameLooksValid &&
    !!country.trim() &&
    confirmPassword === password;

  const loginReady = emailLooksValid && !!password.trim();

  const validateSignUp = () => {
    if (!emailTrimmed) {
      Alert.alert("Missing email", "Please enter your email.");
      return false;
    }

    if (!emailLooksValid) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return false;
    }

    if (!password.trim()) {
      Alert.alert("Missing password", "Please enter your password.");
      return false;
    }

    if (!passwordLooksValid) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return false;
    }

    if (!usernameTrimmed) {
      Alert.alert("Missing username", "Please choose a username.");
      return false;
    }

    if (!usernameLooksValid) {
      Alert.alert(
        "Username too short",
        "Username should be at least 3 characters long.",
      );
      return false;
    }

    if (!country.trim()) {
      Alert.alert("Missing country", "Please choose your country.");
      return false;
    }

    if (!confirmPassword.trim()) {
      Alert.alert("Confirm password", "Please confirm your password.");
      return false;
    }

    if (confirmPassword !== password) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    if (!loginReady) {
      Alert.alert(
        "Missing details",
        "Enter a valid email and password to log in.",
      );
      return;
    }

    try {
      setLoading(true);
      await login(emailTrimmed, password);
      router.replace("/");
    } catch (err: any) {
      Alert.alert("Login error", getFriendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!validateSignUp()) return;

    try {
      setLoading(true);

      const user = await signUp(emailTrimmed, password);

      await createUserDoc(user.uid, {
        email: emailTrimmed,
        username: usernameTrimmed,
        country,
        userSkillLevel: skillLevel,
      });

      router.replace("/onboarding/welcome");
    } catch (err: any) {
      Alert.alert("Signup error", getFriendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!emailTrimmed) {
      Alert.alert(
        "Enter your email first",
        "Type your email above, then tap reset password.",
      );
      return;
    }

    if (!emailLooksValid) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      await sendResetPasswordEmail(emailTrimmed);
      Alert.alert(
        "Reset email sent",
        "Check your inbox for password reset instructions.",
      );
    } catch (err: any) {
      Alert.alert("Reset error", getFriendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#A0E7E5", "#CDB4FF", "#FFAFCC"]}
      style={styles.screen}
    >
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandBlock}>
            <Text style={styles.brandEyebrow}>CodeSpark</Text>
            <Text style={styles.brandTitle}>Learn Python. Build momentum.</Text>
            <Text style={styles.brandSubtitle}>
              Guided lessons, syntax drills, review practice, daily goals,
              projects, and unlocks, all designed to make progress feel clear.
            </Text>
          </View>

          <View style={styles.featureRow}>
            <View style={styles.featurePill}>
              <Text style={styles.featurePillText}>📚 Lessons</Text>
            </View>
            <View style={styles.featurePill}>
              <Text style={styles.featurePillText}>⚡ Syntax</Text>
            </View>
            <View style={styles.featurePill}>
              <Text style={styles.featurePillText}>🏆 XP & Streaks</Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.cardEyebrow}>
              {mode === "login" ? "Welcome back" : "Join CodeSpark"}
            </Text>

            <Text style={styles.title}>
              {mode === "login" ? "Continue your run" : "Start your coding run"}
            </Text>

            <Text style={styles.subtitle}>
              {mode === "login"
                ? "Log in to continue learning, protect your streak, and pick up exactly where you left off."
                : "Create your account, choose your current level, and get a smoother CodeSpark start."}
            </Text>

            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  mode === "login" && styles.modeButtonActive,
                ]}
                onPress={() => setMode("login")}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    mode === "login" && styles.modeButtonTextActive,
                  ]}
                >
                  Login
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeButton,
                  mode === "signup" && styles.modeButtonActive,
                ]}
                onPress={() => setMode("signup")}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    mode === "signup" && styles.modeButtonTextActive,
                  ]}
                >
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                placeholder="you@example.com"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
                placeholderTextColor="#9CA3AF"
              />
              {!!email && !emailLooksValid && (
                <Text style={styles.validationText}>
                  Enter a valid email address.
                </Text>
              )}
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                placeholder="At least 6 characters"
                secureTextEntry
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
                placeholderTextColor="#9CA3AF"
              />
              {!!password && !passwordLooksValid && (
                <Text style={styles.validationText}>
                  Password must be at least 6 characters.
                </Text>
              )}
            </View>

            {mode === "signup" && (
              <>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>Username</Text>
                  <TextInput
                    placeholder="Choose a public username"
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    editable={!loading}
                    placeholderTextColor="#9CA3AF"
                  />
                  {!!username && !usernameLooksValid && (
                    <Text style={styles.validationText}>
                      Username must be at least 3 characters.
                    </Text>
                  )}
                </View>

                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>Country</Text>
                  <CountryPickerField value={country} onChange={setCountry} />
                </View>

                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <TextInput
                    placeholder="Retype password"
                    secureTextEntry
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!loading}
                    placeholderTextColor="#9CA3AF"
                  />
                  {!!confirmPassword && confirmPassword !== password && (
                    <Text style={styles.validationText}>
                      Passwords do not match.
                    </Text>
                  )}
                </View>

                <Text style={styles.sectionLabel}>Your starting level</Text>
                <View style={styles.skillRow}>
                  {(
                    ["Beginner", "Intermediate", "Advanced"] as SkillLevel[]
                  ).map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.skillButton,
                        skillLevel === level && styles.skillButtonActive,
                      ]}
                      onPress={() => setSkillLevel(level)}
                      disabled={loading}
                    >
                      <Text
                        style={[
                          styles.skillButtonText,
                          skillLevel === level && styles.skillButtonTextActive,
                        ]}
                      >
                        {level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.levelHelpCard}>
                  <Text style={styles.levelHelpTitle}>
                    How CodeSpark uses this
                  </Text>
                  <Text style={styles.levelHelpText}>
                    Beginner = more guidance and gentler ramp
                    {"\n"}
                    Intermediate = some prior coding comfort
                    {"\n"}
                    Advanced = faster ramp and tougher starting pace
                  </Text>
                </View>
              </>
            )}

            {mode === "login" ? (
              <>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (!loginReady || loading) && styles.primaryButtonDisabled,
                  ]}
                  onPress={handleLogin}
                  disabled={!loginReady || loading}
                >
                  <Text style={styles.primaryButtonText}>
                    {loading ? "Logging in..." : "Login to CodeSpark"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryTextButton}
                  onPress={handleForgotPassword}
                  disabled={loading}
                >
                  <Text style={styles.secondaryTextButtonText}>
                    Forgot password?
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (!signupReady || loading) && styles.primaryButtonDisabled,
                ]}
                onPress={handleSignUp}
                disabled={!signupReady || loading}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? "Creating account..." : "Create CodeSpark Account"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    paddingBottom: 36,
  },

  brandBlock: {
    marginBottom: 14,
    paddingHorizontal: 4,
  },

  brandEyebrow: {
    color: "#4338CA",
    fontWeight: "900",
    marginBottom: 6,
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 1.2,
  },

  brandTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#111827",
    lineHeight: 38,
  },

  brandSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#4B5563",
    maxWidth: 520,
  },

  featureRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 2,
  },

  featurePill: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  featurePillText: {
    color: "#312E81",
    fontSize: 12,
    fontWeight: "800",
  },

  heroCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 24,
    padding: 22,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  cardEyebrow: {
    color: "#6C63FF",
    fontWeight: "800",
    marginBottom: 8,
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 1,
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 8,
    color: "#111827",
  },

  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
    lineHeight: 20,
  },

  modeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },

  modeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#EEF0F4",
    alignItems: "center",
  },

  modeButtonActive: {
    backgroundColor: "#111827",
  },

  modeButtonText: {
    color: "#374151",
    fontWeight: "700",
  },

  modeButtonTextActive: {
    color: "#FFFFFF",
  },

  inputWrap: {
    marginBottom: 12,
  },

  inputLabel: {
    fontWeight: "700",
    marginBottom: 8,
    color: "#111827",
  },

  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    color: "#111827",
  },

  validationText: {
    marginTop: 6,
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
  },

  sectionLabel: {
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 6,
    color: "#111827",
  },

  skillRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
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
    fontWeight: "700",
    fontSize: 12,
  },

  skillButtonTextActive: {
    color: "#FFFFFF",
  },

  levelHelpCard: {
    backgroundColor: "#F5F3FF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
  },

  levelHelpTitle: {
    fontWeight: "800",
    color: "#4338CA",
    marginBottom: 6,
  },

  levelHelpText: {
    color: "#4B5563",
    lineHeight: 20,
    fontSize: 13,
  },

  primaryButton: {
    backgroundColor: "#6C63FF",
    padding: 15,
    borderRadius: 14,
    marginTop: 14,
  },

  primaryButtonDisabled: {
    backgroundColor: "#C7C6FF",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 15,
  },

  secondaryTextButton: {
    marginTop: 14,
    alignItems: "center",
  },

  secondaryTextButtonText: {
    color: "#4F46E5",
    fontWeight: "700",
  },
});
