// app/QuizScreen.jsx

import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { supabase } from '../backend/supabase';
import { fetchQuestions } from '../backend/fetchquestions';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useChild } from './ChildContext';

// --- NEW IMPORTS ---
import { checkAndGrantAchievement, ACHIEVEMENT_CODES } from './utils/achievements';

const QuizScreen = () => {
  const navigation = useNavigation();
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [questionsPerSession, setQuestionsPerSession] = useState(5); 

  const [isAnswering, setIsAnswering] = useState(false);
  const [feedbackContent, setFeedbackContent] = useState(null);
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const { selectedChild } = useChild();

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
    if (!selectedChild) {
      Alert.alert("Error", "No child selected.");
      navigation.navigate("ChildSelectScreen");
      return;
    }

    setLoading(true);
    try {
      const limit = await fetchQuestionLimit();
      setQuestionsPerSession(limit);

      const userQuestions = await fetchQuestions(uid);
      if (userQuestions.length === 0) {
        Alert.alert("No Questions", "Please ask your parent to create some questions first!");
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
  }, [uid, navigation, fetchQuestionLimit, selectedChild]);

  useFocusEffect(
    useCallback(() => {
      loadQuiz();
    }, [loadQuiz])
  );

  // ✅ Handle answer + log to Supabase
  const handleAnswer = async (option) => {
    if (isAnswering) return; 
    setIsAnswering(true);

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) {
      setIsAnswering(false);
      return;
    }

    const isCorrect = option === currentQuestion.correct_answer;

    // --- UPDATED: Stats & Achievement Logic ---
    if (uid && selectedChild?.id && currentQuestion.id) {
      // 1. Log Answer
      const { error } = await supabase.from('answer_log').insert({
        user_id: uid,
        child_id: selectedChild.id,
        question_id: currentQuestion.id,
        is_correct: isCorrect,
        game_name: 'Quiz',
      });

      if (error) {
        console.error('Error logging quiz answer:', error.message);
      }

      // 2. Update User Stats & Check Achievements
      try {
          const { data: stats } = await supabase
              .from('user_stats')
              .select('total_questions_answered, correct_answers')
              .eq('user_id', uid)
              .maybeSingle();
          
          const total = (stats?.total_questions_answered || 0) + 1;
          const correct = (stats?.correct_answers || 0) + (isCorrect ? 1 : 0);

          await supabase
              .from('user_stats')
              .upsert({ 
                  user_id: uid, 
                  total_questions_answered: total,
                  correct_answers: correct
              }, { onConflict: 'user_id' });
              
          if (isCorrect) {
              if (correct === 3) await checkAndGrantAchievement(uid, ACHIEVEMENT_CODES.THREE_CORRECT);
              if (correct === 5) await checkAndGrantAchievement(uid, ACHIEVEMENT_CODES.FIVE_CORRECT);
          }

      } catch (e) {
          console.error("Error updating stats:", e);
      }
    }
    // --- END UPDATED LOGIC ---

    if (isCorrect) {
      setFeedbackContent({ icon: '🎉👍', text: 'Great job!' });
    } else {
      setFeedbackContent({ icon: '❌', text: 'Incorrect' });
    }

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
    ]).start(async () => {
      setFeedbackContent(null);

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setIsAnswering(false); 
      } else {
        // Quiz Complete - Grant First Game Achievement
        if (uid) await checkAndGrantAchievement(uid, ACHIEVEMENT_CODES.FIRST_GAME);

        Alert.alert("Quiz Complete!", "You've finished the quiz!");
        navigation.navigate('GamePage');
      }
    });
  };

  if (loading || questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  const renderOptions = () => {
    if (!currentQuestion?.options) return null;

    return Object.entries(currentQuestion.options).map(([key, value]) => (
      <TouchableOpacity
        key={key}
        style={styles.button}
        onPress={() => handleAnswer(key)}
        disabled={isAnswering}
      >
        <Text style={styles.buttonText}>{`${key.toUpperCase()}: ${value}`}</Text>
      </TouchableOpacity>
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.progressText}>
        Question {currentQuestionIndex + 1} of {questions.length}
      </Text>
      <Text style={styles.question}>{currentQuestion.question}</Text>
      {renderOptions()}

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
        </Animated.View>
      )}
      
    </SafeAreaView>
  );
};

export default QuizScreen;

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
});