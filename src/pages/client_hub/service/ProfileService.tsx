import { supabase } from "../../../lib/supabase";
import type { ClientProfile } from "../../../types/types";

export class ProfileService {
    /**
     * Simple update without Firebase auth complications
     */
    static async updateProfile(
        clientId: string,
        updatedProfile: Partial<ClientProfile>
    ): Promise<{ success: boolean; error?: string }> {

        console.log("🚀 UPDATING PROFILE:", updatedProfile);
        console.log("🎯 CLIENT ID:", clientId);

        try {
            const { data, error } = await supabase
                .from("client_profiles")
                .update({
                    ...updatedProfile,
                    updated_at: new Date().toISOString()
                })
                .eq("id", clientId)
                .select();

            console.log("📡 Supabase Response:", { data, error });

            if (error) {
                console.error("❌ Supabase Error:", error);
                return { success: false, error: error.message };
            }

            if (!data || data.length === 0) {
                console.error("❌ No rows updated");
                return { success: false, error: "Update failed - no rows affected" };
            }

            console.log("✅ Update successful:", data[0]);
            return { success: true };
        } catch (err: any) {
            console.error("❌ Profile update failed:", err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Update using Firebase UID
     */
    static async updateProfileByFirebaseUID(
        firebaseUid: string,
        updatedProfile: Partial<ClientProfile>
    ): Promise<{ success: boolean; error?: string }> {

        console.log("🔄 UPDATE BY FIREBASE UID:", updatedProfile);
        console.log("🔐 FIREBASE UID:", firebaseUid);

        try {
            const { data, error } = await supabase
                .from("client_profiles")
                .update({
                    ...updatedProfile,
                    updated_at: new Date().toISOString()
                })
                .eq("firebase_uid", firebaseUid)
                .select();

            console.log("📡 Supabase Response:", { data, error });

            if (error) {
                console.error("❌ Supabase Error:", error);
                return { success: false, error: error.message };
            }

            if (!data || data.length === 0) {
                console.error("❌ No profile found with that Firebase UID");
                return { success: false, error: "Profile not found" };
            }

            console.log("✅ Update successful:", data[0]);
            return { success: true };
        } catch (err: any) {
            console.error("❌ Profile update failed:", err);
            return { success: false, error: err.message };
        }
    }

    // Keep existing methods
    static async getProfileByFirebaseUID(firebaseUid: string): Promise<ClientProfile | null> {
        const { data, error } = await supabase
            .from("client_profiles")
            .select("*")
            .eq("firebase_uid", firebaseUid)
            .single();
        
        console.log("🔍 Get profile by Firebase UID:", { data, error, firebaseUid });
        
        if (error) {
            console.error("❌ Error fetching profile:", error);
            return null;
        }
        return data as ClientProfile;
    }

    static async getProfile(clientId: string): Promise<ClientProfile | null> {
        const { data, error } = await supabase
            .from("client_profiles")
            .select("*")
            .eq("id", clientId)
            .single();
            
        if (error) {
            console.error("❌ Error fetching profile:", error);
            return null;
        }
        return data as ClientProfile;
    }
}