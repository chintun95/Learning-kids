// app/utils/achievements.ts

import { supabase } from "../../backend/supabase";
import { Alert } from "react-native";

export const ACHIEVEMENT_CODES = {
  SIGN_UP: 'SIGN_UP',
  FIRST_GAME: 'FIRST_GAME',
  THREE_CORRECT: '3_CORRECT',
  FIVE_CORRECT: '5_CORRECT',
};

const formatAchievementName = (code: string) => {
  switch (code) {
    case ACHIEVEMENT_CODES.SIGN_UP: return "Welcome to Learning Kids! (Sign Up)";
    case ACHIEVEMENT_CODES.FIRST_GAME: return "First Game Played";
    case ACHIEVEMENT_CODES.THREE_CORRECT: return "Quiz Master I (3 Correct)";
    case ACHIEVEMENT_CODES.FIVE_CORRECT: return "Quiz Master II (5 Correct)";
    default: return code;
  }
}

/**
 * Calls the Supabase RPC function to grant a user-level achievement.
 * Assumes a Supabase RPC function 'grant_user_achievement' exists 
 * that inserts into a 'user_achievements' table.
 * @param userId The ID of the parent user (uid).
 * @param achievementKey The unique key of the achievement (e.g., 'FIRST_GAME').
 * @returns true if the achievement was newly granted, false otherwise.
 */
export const checkAndGrantAchievement = async (
  userId: string,
  achievementKey: string,
): Promise<boolean> => {
  if (!userId) return false;

  try {
    // Call the PostgreSQL RPC function
    const { data, error } = await supabase.rpc('grant_user_achievement', {
      p_user_id: userId,
      p_achievement_key: achievementKey,
    });

    if (error) {
      // Log error but don't crash app; achievement might depend on SQL setup
      console.error(`Error checking/granting achievement ${achievementKey}:`, error.message);
      return false;
    }

    // The RPC returns a 'success' boolean indicating if the achievement was newly inserted
    const wasNewlyGranted = data?.success || false;

    if (wasNewlyGranted) {
      Alert.alert("Achievement Unlocked! 🏆", `You earned: ${formatAchievementName(achievementKey)}!`);
    }
    
    return wasNewlyGranted;

  } catch (e) {
    console.error("Unexpected error in achievement check:", e);
    return false;
  }
};