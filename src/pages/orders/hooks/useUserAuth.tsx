// hooks/useUserAuth.ts
import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import type { ClientProfile } from "../../../types/types";
import { auth } from "../../../firebase/firebase";
import { supabase } from "../../../lib/supabase";


export const useUserAuth = () => {
  const [user, setUser] = useState<ClientProfile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const checkUser = useCallback(async () => {
    try {
      const u = auth.currentUser;
      if (!u) {
        setIsLoadingUser(false);
        return;
      }

      const { data: clientProfile, error } = await supabase
        .from("client_profiles")
        .select("*")
        .eq("firebase_uid", u.uid)
        .single();

      if (error) {
        setIsLoadingUser(false);
        return;
      }

      if (clientProfile) {
        const fullName = clientProfile.full_name || "";
        const parts = fullName.split(" ");
        const firstName = parts[0] || "";
        const lastName = parts.slice(1).join(" ") || "";


        console.log("$$$$$$$ clientProfile: ", clientProfile)

        const profile: ClientProfile = {
          id: clientProfile.id,
          email: clientProfile.email,
          first_name: firstName,
          last_name: lastName,
          phone: clientProfile.phone,
          points: clientProfile.points,
          address: clientProfile.address,
          city: clientProfile.city,
          zip_code: clientProfile.zip_code,
          firebase_uid: clientProfile.firebase_uid || "",
          full_name: clientProfile.full_name || "",
          created_at: clientProfile.created_at || "",
          updated_at: clientProfile.updated_at || "",
          total_points: clientProfile.total_points || 0,
          current_tier: clientProfile.current_tier || ""
        };
        setUser(profile);
      }
      setIsLoadingUser(false);
    } catch {
      setIsLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        checkUser();
      } else {
        setUser(null);
        setIsLoadingUser(false);
      }
    });
    return () => unsub();
  }, [checkUser]);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
      const { data: clientProfile, error } = await supabase
        .from("client_profiles")
        .select("*")
        .eq("firebase_uid", cred.user.uid)
        .single();

      if (error) {
        setAuthError("User profile not found");
        return;
      }

      const fullName = clientProfile.full_name || "";
      const parts = fullName.split(" ");
      const firstName = parts[0] || "";
      const lastName = parts.slice(1).join(" ") || "";

      setUser({
        id: clientProfile.id,
        email: clientProfile.email,
        first_name: firstName,
        last_name: lastName,
        phone: clientProfile.phone,
        points: clientProfile.points,
        address: clientProfile.address,
        city: clientProfile.city,
        zip_code: clientProfile.zip_code,
        firebase_uid: clientProfile.firebase_uid || "",
        full_name: clientProfile.full_name || "",
        created_at: clientProfile.created_at || "",
        updated_at: clientProfile.updated_at || "",
        total_points: clientProfile.total_points || 0,
        current_tier: clientProfile.current_tier || ""
      });

      setShowAuthModal(false);
      setAuthForm({ email: "", password: "", firstName: "", lastName: "", phone: "" });
    } catch (err: any) {
      setAuthError(err?.message || "Login failed");
    } finally {
      setIsAuthLoading(false);
    }
  }, [authForm]);

  const handleSignup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
      const fullName = `${authForm.firstName} ${authForm.lastName}`.trim();
      const { data: clientProfile, error } = await supabase
        .from("client_profiles")
        .insert({
          firebase_uid: cred.user.uid,
          email: authForm.email,
          full_name: fullName,
          phone: authForm.phone,
          points: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;

      setUser({
        id: clientProfile.id,
        email: clientProfile.email,
        first_name: authForm.firstName,
        last_name: authForm.lastName,
        phone: clientProfile.phone,
        points: clientProfile.points,
        address: clientProfile.address,
        city: clientProfile.city,
        zip_code: clientProfile.zip_code,
        firebase_uid: clientProfile.firebase_uid || "",
        full_name: clientProfile.full_name || "",
        created_at: clientProfile.created_at || "",
        updated_at: clientProfile.updated_at || "",
        total_points: clientProfile.total_points || 0,
        current_tier: clientProfile.current_tier || ""
      });

      setShowAuthModal(false);
      setAuthForm({ email: "", password: "", firstName: "", lastName: "", phone: "" });
    } catch (err: any) {
      setAuthError(err?.message || "Signup failed");
    } finally {
      setIsAuthLoading(false);
    }
  }, [authForm]);

  const handleLogout = useCallback(async () => {
    await auth.signOut();
    setUser(null);
  }, []);

  const openAuthModal = useCallback((mode: "login" | "signup" = "login") => {
    setIsLoginMode(mode === "login");
    setShowAuthModal(true);
    setAuthError("");
  }, []);

  const closeAuthModal = useCallback(() => {
    setShowAuthModal(false);
    setAuthError("");
    setAuthForm({ email: "", password: "", firstName: "", lastName: "", phone: "" });
  }, []);

  return {
    user,
    isLoadingUser,
    showAuthModal,
    isLoginMode,
    authForm,
    isAuthLoading,
    authError,
    setAuthForm,
    setIsLoginMode,
    setAuthError,
    handleLogin,
    handleSignup,
    handleLogout,
    openAuthModal,
    closeAuthModal,
    setShowAuthModal
  };
};