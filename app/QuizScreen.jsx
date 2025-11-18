import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { supabase } from '../backend/supabase';
import { fetchQuestions } from '../backend/fetchquestions';
import { getQuizQuestions } from '../backend/quizzes';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useChild } from './ChildContext';

const QuizScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const quizId = route.params?.quizId;
  const quizName = route.params?.quizName;
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [questionsPerSession, setQuestionsPerSession] = useState(5); // default limit

  // --- ADD THESE ---
  const [isAnswering, setIsAnswering] = useState(false);
  const [feedbackContent, setFeedbackContent] = useState(null);
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const { selectedChild } = useChild(); // <-- 2. GET SELECTED CHILD
  // --- END ADD ---

  const auth = getAuth();
  const uid = auth.currentUser?.uid; // This is the PARENT'S ID

  // ✅ Fetch question limit from settings
  const fetchQuestionLimit = useCallback(async () => {
    if (!uid) return 5;
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('question_limit')
        .eq('user_id', uid)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data?.question_limit || 5;
    } catch (err) {
      console.error('Error fetching question limit:', err.message);
      return 5;
    }
  }, [uid]);

  // ✅ Load quiz questions
  const loadQuiz = useCallback(async () => {
    if (!uid) {
      Alert.alert("Error", "You must be logged in to play the quiz.");
      navigation.goBack();
      return;
    }
    // --- This check is now crucial ---
    if (!selectedChild) {
      Alert.alert("Error", "No child selected.");
      navigation.navigate("ChildSelectScreen");
      return;
    }
    // --- End check ---

    setLoading(true);
    try {
      const limit = await fetchQuestionLimit();
      setQuestionsPerSession(limit);

      let userQuestions;
      
      // If quizId is provided, load questions from that quiz
      if (quizId) {
        userQuestions = await getQuizQuestions(quizId);
      } else {
        // Otherwise, load all questions (fallback to old behavior)
        userQuestions = await fetchQuestions(uid);
      }
      
      if (userQuestions.length === 0) {
        Alert.alert("No Questions", "This quiz has no questions!");
        navigation.goBack();
        return;
      }

      const shuffled = [...userQuestions].sort(() => 0.5 - Math.random());
      setQuestions(shuffled.slice(0, Math.min(shuffled.length, limit)));
      setCurrentQuestionIndex(0);
    } catch (error) {
      console.error("Failed to load quiz", error);
      Alert.alert("Error", "Failed to load questions.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [uid, navigation, fetchQuestionLimit, selectedChild, quizId]); // Add selectedChild dependency

  useFocusEffect(
    useCallback(() => {
      loadQuiz();
    }, [loadQuiz])
  );

  // ✅ Handle answer + log to Supabase for ProgressionChart
  const handleAnswer = async (option) => {
    // --- ADD THESE ---
    if (isAnswering) return; // Don't allow multiple answers
    setIsAnswering(true);
    // --- END ADD ---

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) {
      setIsAnswering(false); // Failsafe
      return;
    }

    const isCorrect = option === currentQuestion.correct_answer;

    // --- 3. UPDATED LOGIC ---
    // Log answer in Supabase
    if (uid && selectedChild?.id && currentQuestion.id) {
      const { error } = await supabase.from('answer_log').insert({
        user_id: uid, // Parent's ID
        child_id: selectedChild.id, // Child's ID
        question_id: currentQuestion.id,
        is_correct: isCorrect,
        game_name: 'Quiz',
      });

      if (error) {
        console.error('Error logging quiz answer:', error.message);
      }
    }
    // --- END UPDATED LOGIC ---

    // --- REPLACE ALERTS WITH THIS ---
    if (isCorrect) {
      setFeedbackContent({ icon: '🎉👍', text: 'Great job!', correctAnswer: null });
    } else {
      const correctAnswerText = currentQuestion.options[currentQuestion.correct_answer];
      setFeedbackContent({ 
        icon: '❌', 
        text: 'Incorrect', 
        correctAnswer: `Correct answer: ${currentQuestion.correct_answer.toUpperCase()}: ${correctAnswerText}` 
      });
    }

    // --- REPLACE setTimeout WITH ANIMATION ---
    feedbackAnim.setValue(0);
    Animated.sequence([
      Animated.timing(feedbackAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(1000),
      Animated.timing(feedbackAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Logic to run AFTER animation
      setFeedbackContent(null);

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setIsAnswering(false); // Re-enable buttons
      } else {
        Alert.alert("Quiz Complete!", "You've finished the quiz!");
        navigation.navigate('GamePage');
        // No need to set isAnswering(false) here since we are navigating away
      }
    });
    // --- END REPLACEMENT ---
  };

  if (loading || questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  const renderOptions = () => {
    if (!currentQuestion?.options) return null;

    return Object.entries(currentQuestion.options).map(([key, value]) => (
      <TouchableOpacity
        key={key}
        style={styles.button}
        onPress={() => handleAnswer(key)}
        disabled={isAnswering} // <-- ADD THIS
      >
        <Text style={styles.buttonText}>{`${key.toUpperCase()}: ${value}`}</Text>
      </TouchableOpacity>
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.progressText}>
        {quizName ? quizName : 'Quiz'} - Question {currentQuestionIndex + 1} of {questions.length}
      </Text>
      <Text style={styles.question}>{currentQuestion.question}</Text>
      {renderOptions()}

      {/* --- ADD THIS NEW OVERLAY --- */}
      {feedbackContent && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.feedbackOverlay,
            {
              opacity: feedbackAnim,
              transform: [
                {
                  scale: feedbackAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.7, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.feedbackIcon}>{feedbackContent.icon}</Text>
          {feedbackContent.text ? (
            <Text style={styles.feedbackText}>{feedbackContent.text}</Text>
          ) : null}
          {feedbackContent.correctAnswer ? (
            <Text style={styles.correctAnswerText}>{feedbackContent.correctAnswer}</Text>
          ) : null}
        </Animated.View>
      )}
      {/* --- END ADD --- */}
      
    </SafeAreaView>
  );
};

export default QuizScreen;

// ... (Styles remain unchanged) ...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0f4f8',
  },
  progressText: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('4%'),
    color: '#888',
    position: 'absolute',
    top: hp('10%'),
  },
  question: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('7%'),
    textAlign: 'center',
    marginBottom: hp('5%'),
    color: '#333',
  },
  button: {
    backgroundColor: '#4A90E2',
    paddingVertical: hp('2%'),
    paddingHorizontal: wp('8%'),
    borderRadius: 30,
    marginVertical: hp('1%'),
    width: wp('80%'),
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('5%'),
  },

  feedbackOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  feedbackIcon: {
    fontSize: 80,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  feedbackText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  correctAnswerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    textAlign: 'center',
    maxWidth: '90%',
  },
});