// backend/fetchUserProfile.js
import { supabase } from './supabase';
import { getAuth } from 'firebase/auth';

export async function fetchUserProfile() {
  const auth = getAuth();
  const uid = auth.currentUser?.uid;

  if (!uid) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', uid)
    .single();

  if (error) throw error;

  return data;
}
