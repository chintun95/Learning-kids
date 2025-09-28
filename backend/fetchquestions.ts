//fetchquestions.ts
import { supabase } from './supabase';

// Define the Question type to help with type safety
export interface Question {
  id: string;
  question: string;
  options: { [key: string]: string } | null;
  correct_answer: string;
  parent_id: string; // This should be a string referencing the user_id from profiles
  question_type: 'multiple_choice' | 'true_false' | 'typed_answer';
}

export async function fetchQuestions(parentId: string): Promise<Question[]> {
  if (!parentId) {
    throw new Error('Parent ID is required'); // Ensure parentId is not null
  }

  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*') // Consider specifying exact columns if necessary
      .eq('parent_id', parentId);  // Fetch questions based on parent_id

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

