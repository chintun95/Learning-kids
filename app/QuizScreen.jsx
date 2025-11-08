import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { supabase } from '../backend/supabase';
import { fetchQuestions } from '../backend/fetchquestions';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

const QuizScreen = () => {
  const navigation = useNavigation();
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [questionsPerSession, setQuestionsPerSession] = useState(5); // default limit

  const auth = getAuth();
  const uid = auth.currentUser?.uid;

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
  }, [uid, navigation, fetchQuestionLimit]);

  useFocusEffect(
    useCallback(() => {
      loadQuiz();
    }, [loadQuiz])
  );

  // ✅ Handle answer + log to Supabase for ProgressionChart
  const handleAnswer = async (option) => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    const isCorrect = option === currentQuestion.correct_answer;

    // Log answer in Supabase
    if (uid && currentQuestion.id) {
      const { error } = await supabase.from('answer_log').insert({
        user_id: uid,
        question_id: currentQuestion.id,
        is_correct: isCorrect,
        game_name: 'Quiz', // Important for ProgressionChart filtering
      });

      if (error) {
        console.error('Error logging quiz answer:', error.message);
      }
    }

    if (isCorrect) {
      Alert.alert('✅ Correct!', 'Great job!');
    } else {
      Alert.alert('❌ Incorrect', 'Try again next time!');
    }

    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        Alert.alert("Quiz Complete!", "You've finished the quiz!");
        navigation.navigate('GamePage');
      }
    }, 500);
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
      <TouchableOpacity key={key} style={styles.button} onPress={() => handleAnswer(key)}>
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
});
