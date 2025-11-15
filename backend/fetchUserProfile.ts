// backend/fetchUserProfile.js
import { supabase } from './supabase';
import { getAuth } from 'firebase/auth';

export async function fetchUserProfile() {
  const auth = getAuth();
  const uid = auth.currentUser?.uid;

  if (!uid) throw new Error('User not authenticated');

  // Fetch parent profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', uid)
    .single();

  if (profileError) throw profileError;

  // Fetch children linked to this parent
  const { data: children, error: childrenError } = await supabase
    .from('child_profiles')
    .select('*')
    .eq('parent_user_id', uid); // column linking children to parent

  if (childrenError) throw childrenError;

  // Return both profile and children in a single object
  return { profile, children };
}
