import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { fetchQuizzes, getQuizQuestions } from '../backend/quizzes';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

const QuizSelectionScreen = () => {
  const navigation = useNavigation();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const uid = auth.currentUser?.uid;

  // Load available quizzes
  const loadQuizzes = useCallback(async () => {
    if (!uid) {
      Alert.alert("Error", "You must be logged in to view quizzes.");
      navigation.goBack();
      return;
    }

    setLoading(true);
    try {
      const quizList = await fetchQuizzes();
      
      // Get question count for each quiz
      const quizzesWithCount = await Promise.all(
        quizList.map(async (quiz) => {
          const questions = await getQuizQuestions(quiz.id);
          return { ...quiz, questionCount: questions.length };
        })
      );

      // Filter out quizzes with no questions
      const validQuizzes = quizzesWithCount.filter(q => q.questionCount > 0);

      if (validQuizzes.length === 0) {
        Alert.alert("No Quizzes", "Please ask your parent to create some quizzes first!");
        navigation.goBack();
        return;
      }

      setQuizzes(validQuizzes);
    } catch (error) {
      console.error("Failed to load quizzes", error);
      Alert.alert("Error", "Failed to load quizzes.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [uid, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadQuizzes();
    }, [loadQuizzes])
  );

  const handleQuizSelect = (quiz) => {
    navigation.navigate('QuizScreen', { quizId: quiz.id, quizName: quiz.name });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Choose a Quiz</Text>
      <Text style={styles.subtitle}>Select which quiz you want to take</Text>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {quizzes.map((quiz) => (
          <TouchableOpacity
            key={quiz.id}
            style={styles.quizCard}
            onPress={() => handleQuizSelect(quiz)}
          >
            <View style={styles.quizHeader}>
              <Text style={styles.quizName}>{quiz.name}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{quiz.questionCount} Q's</Text>
              </View>
            </View>
            {quiz.description ? (
              <Text style={styles.quizDescription}>{quiz.description}</Text>
            ) : null}
            <View style={styles.playButton}>
              <Text style={styles.playButtonText}>Start Quiz →</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default QuizSelectionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
    padding: 20,
  },
  title: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('8%'),
    color: '#333',
    textAlign: 'center',
    marginTop: hp('2%'),
    marginBottom: hp('1%'),
  },
  subtitle: {
    fontSize: wp('4%'),
    color: '#666',
    textAlign: 'center',
    marginBottom: hp('3%'),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  quizCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quizName: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('6%'),
    color: '#333',
    flex: 1,
  },
  badge: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: wp('3.5%'),
    fontWeight: '700',
  },
  quizDescription: {
    fontSize: wp('4%'),
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  playButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 8,
  },
  playButtonText: {
    color: '#fff',
    fontSize: wp('4.5%'),
    fontWeight: '700',
  },
  backButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 16,
  },
  backButtonText: {
    color: '#333',
    fontSize: wp('4.5%'),
    fontWeight: '700',
  },
});
