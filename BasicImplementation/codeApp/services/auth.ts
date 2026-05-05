import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { auth } from "../firebase/config";

export const signUp = async (email: string, password: string) => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  return userCredential.user;
};

export const login = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password,
  );
  return userCredential.user;
};

export const logout = async () => {
  await signOut(auth);
};

export const sendResetPasswordEmail = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

export const changePasswordWithCurrentPassword = async (
  email: string,
  currentPassword: string,
  newPassword: string,
) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No signed in user.");
  }

  const credential = EmailAuthProvider.credential(email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
};

// Converts the firebase auth error codes into user readable messages to display.
export const getFriendlyAuthError = (err: any) => {
  const code = err?.code || "";

  switch (code) {
    case "auth/email-already-in-use":
      return "That email is already being used by another account.";
    case "auth/invalid-email":
      return "That email address looks invalid.";
    case "auth/weak-password":
      return "Password is too weak. Try at least 6 characters.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/missing-password":
      return "Please enter your password.";
    default:
      return err?.message || "Something went wrong. Please try again.";
  }
};