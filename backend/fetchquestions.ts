//fetchquestions.ts
import { supabase } from './supabase';

// Define the Question type to help with type safety
export interface Question {
  id: string;
  question: string;
  options: { [key: string]: string } | null;
  correct_answer: string;
  parent_id: string; // This should be a string referencing the user_id from profiles
  child_id: string | null; // Nullable - null means available for all children
  question_type: 'multiple_choice' | 'true_false' | 'typed_answer';
}

export async function fetchQuestions(parentId: string, childId?: string | null): Promise<Question[]> {
  if (!parentId) {
    throw new Error('Parent ID is required'); // Ensure parentId is not null
  }

  try {
    let query = supabase
      .from('questions')
      .select('*')
      .eq('parent_id', parentId);

    // If childId is provided, fetch questions for that specific child OR general questions (child_id is null)
    if (childId) {
      query = query.or(`child_id.eq.${childId},child_id.is.null`);
    } else if (childId === null) {
      // If explicitly null, fetch only general questions
      query = query.is('child_id', null);
    }
    // If childId is undefined, fetch all questions (no filter on child_id)

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching questions:', error);
      throw new Error(`Failed to fetch questions: ${error.message}`);
    }

    // Return an empty array if data is null or undefined
    if (data) {
      console.log('Raw questions data from supabase:', data);
      // Since options is JSONB, it should already be parsed as an object
      // Just return data as is
      return data as Question[];
    }
    return [];
  } catch (error) {
    console.error('Error in fetchQuestions:', error); // Log the error
    throw error; // Re-throw for handling outside the function
  }
}


