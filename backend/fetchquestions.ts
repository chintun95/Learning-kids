// fetchQuestions.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase'; 

export async function fetchQuestions(childId: string) {
  if (!childId) throw new Error('Child ID is required');

  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('child_id', childId);

    if (error) {
      console.error('Error fetching questions:', error);
      //  Be more specific in the error message.
      throw new Error(`Failed to fetch questions: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error fetching questions:', error);
    throw error; // Re-throw for handling outside the function.  Crucial
  }
}