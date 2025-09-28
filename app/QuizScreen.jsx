//QuizScreen.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TextInput, TouchableOpacity, Alert } from 'react-native';
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
  const [userAnswer, setUserAnswer] = useState('');
  const [questionsPerSession, setQuestionsPerSession] = useState(5);

  const auth = getAuth();
  const uid = auth.currentUser?.uid;

  const loadQuiz = useCallback(async () => {
    if (!uid) {
      Alert.alert("Error", "You must be logged in to play the quiz.");
      navigation.goBack();
      return;
    }
    setLoading(true);
    try {
      const userQuestions = await fetchQuestions(uid);
      if (userQuestions.length === 0) {
        Alert.alert("No Questions", "Please ask your parent to create some questions first!");
        navigation.goBack();
        return;
      }
      const shuffled = [...userQuestions].sort(() => 0.5 - Math.random());
      setQuestions(shuffled.slice(0, Math.min(shuffled.length, questionsPerSession)));
      setCurrentQuestionIndex(0);
    } catch (error) {
      console.error("Failed to load quiz", error);
      Alert.alert("Error", "Failed to load questions.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [uid, questionsPerSession, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadQuiz();
    }, [loadQuiz])
  );

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setUserAnswer('');
    } else {
      Alert.alert("Quiz Complete!", "You've finished the questions for now.");
      navigation.navigate('GamePage');
    }
  };

  const handleAnswer = async (option) => {
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion.question_type === 'typed_answer') {
        if (!userAnswer.trim()) {
            Alert.alert("Empty Answer", "Please type an answer.");
            return;
        }
        // For typed answers, submit for approval
        const { error } = await supabase.from('submissions').insert([{
            question_id: currentQuestion.id,
            child_id: uid, // Assuming child is the one playing
            parent_id: currentQuestion.parent_id,
            submitted_answer: userAnswer,
            status: 'pending'
        }]);

        if (error) {
            Alert.alert("Error", "Could not submit your answer.");
        } else {
            Alert.alert("Submitted!", "Your parent will check your answer soon.");
            setTimeout(handleNextQuestion, 500);
        }

    } else {
      // For MC and T/F
      if (option === currentQuestion.correct_answer) {
        Alert.alert('Correct!', 'Great job!');
      } else {
        Alert.alert('Incorrect', 'Try again next time!');
      }
      setTimeout(handleNextQuestion, 500);
    }
  };

  if (loading || questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  const renderInputs = () => {
    if (currentQuestion.question_type === 'multiple_choice') {
      return Object.entries(currentQuestion.options).map(([key, value]) => (
        <TouchableOpacity key={key} style={styles.button} onPress={() => handleAnswer(key)}>
            <Text style={styles.buttonText}>{`${key.toUpperCase()}: ${value}`}</Text>
        </TouchableOpacity>
      ));
    }
    if (currentQuestion.question_type === 'true_false') {
        return Object.entries(currentQuestion.options).map(([key, value]) => (
            <TouchableOpacity key={key} style={styles.button} onPress={() => handleAnswer(key)}>
                <Text style={styles.buttonText}>{value}</Text>
            </TouchableOpacity>
      ));
    }
    if (currentQuestion.question_type === 'typed_answer') {
      return (
        <>
          <TextInput
            style={styles.input}
            placeholder="Type your answer here..."
            value={userAnswer}
            onChangeText={setUserAnswer}
          />
          <TouchableOpacity style={styles.button} onPress={() => handleAnswer(userAnswer)}>
            <Text style={styles.buttonText}>Submit</Text>
          </TouchableOpacity>
        </>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.progressText}>Question {currentQuestionIndex + 1} of {questions.length}</Text>
      <Text style={styles.question}>{currentQuestion.question}</Text>
      {renderInputs()}
    </SafeAreaView>
  );
};

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
    top: hp('10%')
  },
  question: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('7%'),
    textAlign: 'center',
    marginBottom: hp('5%'),
    color: '#333'
  },
  input: {
    fontFamily: 'FredokaOne-Regular',
    width: wp('80%'),
    padding: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: '#fff'
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
  }
});

export default QuizScreen;