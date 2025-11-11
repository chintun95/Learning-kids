import NetInfo from "@react-native-community/netinfo";
import { supabase } from "@/lib/supabase";
import { TablesInsert } from "@/types/database.types";

/**
 * Inserts a completed session into Supabase when online and the childId is valid.
 */
export async function syncSessionToSupabase(
  session: TablesInsert<"Session">
): Promise<boolean> {
  try {
    // Ensure valid UUID childId
    if (!session.childid || !/^[0-9a-fA-F-]{36}$/.test(session.childid)) {
      console.warn(
        "⚠️ Skipping Supabase sync — invalid or local child ID:",
        session.childid
      );
      return false;
    }

    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      console.warn("⚠️ No internet connection. Session will sync later.");
      return false;
    }

    const { error } = await supabase.from("Session").insert(session);

    if (error) {
      console.error(
        "❌ Failed to insert session into Supabase:",
        error.message
      );
      return false;
    }

    console.log("✅ Session synced to Supabase successfully.");
    return true;
  } catch (err: any) {
    console.error("❌ Error syncing session:", err.message);
    return false;
  }
}
