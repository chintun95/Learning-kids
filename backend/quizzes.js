import { supabase } from './supabase';
import { getAuth } from 'firebase/auth';

const auth = getAuth();

// Fetch all quizzes for current parent
export const fetchQuizzes = async () => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('parent_id', uid)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Create a new quiz
export const createQuiz = async (name, description = '') => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('quizzes')
    .insert([{ parent_id: uid, name, description }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete quiz
export const deleteQuiz = async (quizId) => {
  const { error } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', quizId);

  if (error) throw error;
};

// Get all questions in a quiz
export const getQuizQuestions = async (quizId) => {
  const { data, error } = await supabase
    .from('quiz_questions')
    .select(`
      question_id,
      questions (*)
    `)
    .eq('quiz_id', quizId);

  if (error) throw error;
  return data?.map(item => item.questions) || [];
};

// Add question to quiz
export const addQuestionToQuiz = async (quizId, questionId) => {
  const { data, error } = await supabase
    .from('quiz_questions')
    .insert([{ quiz_id: quizId, question_id: questionId }])
    .select();

  if (error) throw error;
  return data;
};

// Remove question from quiz
export const removeQuestionFromQuiz = async (quizId, questionId) => {
  const { error } = await supabase
    .from('quiz_questions')
    .delete()
    .eq('quiz_id', quizId)
    .eq('question_id', questionId);

  if (error) throw error;
};

// Assign quiz to a game
export const assignQuizToGame = async (gameName, quizId) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('game_quiz_assignments')
    .upsert([{ user_id: uid, game_name: gameName, quiz_id: quizId }], {
      onConflict: 'user_id,game_name'
    })
    .select();

  if (error) throw error;
  return data;
};

// Get assigned quiz for a game
export const getGameQuiz = async (gameName) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('game_quiz_assignments')
    .select('quiz_id')
    .eq('user_id', uid)
    .eq('game_name', gameName)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data?.quiz_id || null;
};

// Fetch questions for a game (from assigned quiz or all questions)
export const fetchQuestionsForGame = async (gameName) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');

  // Check if game has an assigned quiz
  const quizId = await getGameQuiz(gameName);

  if (quizId) {
    // Get questions from assigned quiz
    return await getQuizQuestions(quizId);
  } else {
    // Fallback to all questions (existing behavior)
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('parent_id', uid);

    if (error) throw error;
    return data || [];
  }
};