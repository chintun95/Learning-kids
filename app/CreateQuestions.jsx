// file: app/CreateQuestions.jsx
import React, { memo, useState, useEffect } from 'react';
import {
  StyleSheet, Text, TextInput, TouchableOpacity, View, Pressable,
  ActivityIndicator, FlatList, ScrollView, Alert, Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../backend/supabase';
import { getAuth } from 'firebase/auth';
import { useFonts } from 'expo-font';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const CreateQuestions = memo(() => {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    'FredokaOne-Regular': require('@/assets/fonts/FredokaOne-Regular.ttf'),
  });

  const [question, setQuestion] = useState('');
  const [questionType, setQuestionType] = useState('multiple_choice');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [questionsList, setQuestionsList] = useState([]);
  const [activeTab, setActiveTab] = useState('create');
  const [questionsToComplete, setQuestionsToComplete] = useState(5);

  const navigation = useNavigation();
  const auth = getAuth();
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (uid) {
      fetchQuestions();
      fetchQuestionLimit();
    }
  }, [uid]);

  // Fetch question limit from Supabase
  const fetchQuestionLimit = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('question_limit')
        .eq('user_id', uid)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data?.question_limit) setQuestionsToComplete(data.question_limit);
    } catch (err) {
      console.error('Fetch question limit error:', err.message);
    }
  };

  // Fetch all questions
  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('parent_id', uid);
      if (error) throw error;
      setQuestionsList(data);
    } catch (err) {
      console.error('Fetch questions error:', err);
    }
  };

  // Create new question
  const handleCreateQuestion = async () => {
    if (!question) {
      setError('Please enter a question.');
      return;
    }

    let payload = {
      question,
      parent_id: uid,
      options: null,
      correct_answer: '',
      question_type: questionType,
    };

    if (questionType === 'multiple_choice') {
      if (!optionA || !optionB || !optionC || !optionD || !correctAnswer) {
        setError('Please fill all options and select a correct answer.');
        return;
      }
      payload.options = { a: optionA, b: optionB, c: optionC, d: optionD };
      payload.correct_answer = correctAnswer;
    } else if (questionType === 'true_false') {
      if (!correctAnswer) {
        setError('Please select True or False as the correct answer.');
        return;
      }
      payload.options = { a: 'True', b: 'False' };
      payload.correct_answer = correctAnswer;
    }

    setLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase.from('questions').insert([payload]);
      if (insertError) throw insertError;
      Alert.alert('Success', 'Question created successfully!');
      clearFields();
      fetchQuestions();
    } catch (err) {
      console.error('Create question error:', err);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const clearFields = () => {
    setQuestion('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setCorrectAnswer('');
  };

  const renderQuestionInputs = () => {
    if (questionType === 'multiple_choice') {
      return (
        <>
          <TextInput placeholder="Option A" value={optionA} onChangeText={setOptionA} style={styles.input} />
          <TextInput placeholder="Option B" value={optionB} onChangeText={setOptionB} style={styles.input} />
          <TextInput placeholder="Option C" value={optionC} onChangeText={setOptionC} style={styles.input} />
          <TextInput placeholder="Option D" value={optionD} onChangeText={setOptionD} style={styles.input} />
          <Text style={styles.label}>Correct Answer:</Text>
          <View style={styles.optionsRow}>
            {['a', 'b', 'c', 'd'].map((key) => (
              <TouchableOpacity
                key={key}
                style={[styles.answerButton, correctAnswer === key && styles.selectedAnswerButton]}
                onPress={() => setCorrectAnswer(key)}
              >
                <Text style={styles.answerButtonText}>{key.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      );
    }

    if (questionType === 'true_false') {
      return (
        <>
          <Text style={styles.label}>Correct Answer:</Text>
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={[styles.answerButton, correctAnswer === 'a' && styles.selectedAnswerButton]}
              onPress={() => setCorrectAnswer('a')}
            >
              <Text style={styles.answerButtonText}>True</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.answerButton, correctAnswer === 'b' && styles.selectedAnswerButton]}
              onPress={() => setCorrectAnswer('b')}
            >
              <Text style={styles.answerButtonText}>False</Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    return null;
  };

  // Delete question
  const handleDeleteQuestion = async (questionId) => {
    Alert.alert(
      'Delete Question',
      'Are you sure you want to delete this question?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('questions')
                .delete()
                .eq('id', questionId)
                .eq('parent_id', uid);

              if (error) throw error;
              Alert.alert('Deleted', 'Question removed successfully.');
              fetchQuestions();
            } catch (err) {
              console.error('Delete question error:', err);
              Alert.alert('Error', 'Failed to delete question.');
            }
          },
        },
      ]
    );
  };

  // Save question limit
  const handleSetQuestionLimit = async (num) => {
    setQuestionsToComplete(num);
    try {
      await supabase
        .from('settings')
        .upsert({ user_id: uid, question_limit: num }, { onConflict: 'user_id' });
      Alert.alert('Saved', `Question limit set to ${num}`);
    } catch (error) {
      console.error('Error saving question limit:', error.message);
      Alert.alert('Error', 'Failed to save question limit');
    }
  };

  if (!fontsLoaded) return <ActivityIndicator />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.backContainer, { top: Platform.OS === 'ios' ? insets.top + hp('2%') : hp('2.5%') }]}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={wp('6.2%')} color="#000" />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
      </View>

      {/* Tab selector */}
      <View style={styles.tabRow}>
        {['create', 'questions'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={styles.tabText}>{tab.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Create Tab */}
      {activeTab === 'create' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Create a Question</Text>
          <TextInput placeholder="Enter question" value={question} onChangeText={setQuestion} style={styles.input} />

          <Text style={styles.label}>Question Type:</Text>
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={[styles.typeButton, questionType === 'multiple_choice' && styles.selectedTypeButton]}
              onPress={() => setQuestionType('multiple_choice')}
            >
              <Text style={styles.answerButtonText}>Multiple Choice</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, questionType === 'true_false' && styles.selectedTypeButton]}
              onPress={() => setQuestionType('true_false')}
            >
              <Text style={styles.answerButtonText}>True/False</Text>
            </TouchableOpacity>
          </View>

          {renderQuestionInputs()}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.button} onPress={handleCreateQuestion} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit Question</Text>}
          </TouchableOpacity>

          {/* Adjustable questions-to-complete selector */}
          <View style={{ marginTop: hp('3%'), alignItems: 'center' }}>
            <Text style={{ fontFamily: 'FredokaOne-Regular', fontSize: wp('4.5%'), marginBottom: hp('1%') }}>
              Questions to complete before game ends:
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
              {[...Array(10)].map((_, i) => {
                const num = i + 1;
                return (
                  <TouchableOpacity
                    key={num}
                    style={{
                      backgroundColor: questionsToComplete === num ? '#4A90E2' : '#ccc',
                      paddingVertical: hp('1%'),
                      paddingHorizontal: wp('3%'),
                      borderRadius: 12,
                      marginHorizontal: 3,
                    }}
                    onPress={() => handleSetQuestionLimit(num)}
                  >
                    <Text
                      style={{
                        color: questionsToComplete === num ? '#fff' : '#000',
                        fontFamily: 'FredokaOne-Regular',
                      }}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Questions Tab */}
      {activeTab === 'questions' && (
        <FlatList
          style={{ marginTop: hp('2%') }}
          data={questionsList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const formattedType =
              item.question_type === 'multiple_choice'
                ? 'Multiple Choice'
                : item.question_type === 'true_false'
                ? 'True/False'
                : '';

            return (
              <View style={styles.questionCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.questionText}>{item.question}</Text>
                  <Text style={styles.questionTypeText}>{formattedType}</Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleDeleteQuestion(item.id)}
                  style={{
                    backgroundColor: '#FF5C5C',
                    paddingVertical: hp('1%'),
                    paddingHorizontal: wp('3%'),
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: '#fff', fontFamily: 'FredokaOne-Regular' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            );
          }}
          contentContainerStyle={{ alignItems: 'center', paddingBottom: hp('5%') }}
        />
      )}
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  scrollContent: { alignItems: 'center', paddingTop: hp('2%'), paddingBottom: hp('5%') },
  title: { fontFamily: 'FredokaOne-Regular', fontSize: wp('9%'), marginBottom: hp('3%'), color: '#1E1E1E' },
  input: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('4.5%'),
    backgroundColor: '#fff',
    padding: wp('3.5%'),
    borderRadius: 10,
    marginBottom: hp('2%'),
    color: '#000',
    width: wp('85%'),
    borderWidth: 1,
    borderColor: '#ddd',
  },
  label: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('4.5%'),
    color: '#333',
    marginBottom: hp('1.5%'),
    alignSelf: 'flex-start',
    marginLeft: wp('7.5%'),
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: hp('1%'),
    width: wp('85%'),
    flexWrap: 'wrap',
  },
  typeButton: { backgroundColor: '#ccc', paddingVertical: hp('1.5%'), paddingHorizontal: wp('3%'), borderRadius: 8, margin: 5 },
  selectedTypeButton: { backgroundColor: '#4A90E2' },
  answerButton: { backgroundColor: '#ccc', padding: wp('3%'), borderRadius: 8, margin: 5, minWidth: wp('18%'), alignItems: 'center' },
  selectedAnswerButton: { backgroundColor: '#4CAF50' },
  answerButtonText: { color: '#fff', fontFamily: 'FredokaOne-Regular' },
  error: { fontFamily: 'FredokaOne-Regular', fontSize: wp('4%'), color: 'red', marginTop: hp('1%'), textAlign: 'center' },
  button: { marginTop: hp('2%'), backgroundColor: '#1E90FF', paddingVertical: hp('1.8%'), paddingHorizontal: wp('6%'), borderRadius: 30, width: wp('85%') },
  buttonText: { color: '#fff', fontFamily: 'FredokaOne-Regular', fontSize: wp('5%'), textAlign: 'center' },
  questionCard: {
    backgroundColor: '#fff',
    padding: wp('4%'),
    marginVertical: hp('1%'),
    borderRadius: 10,
    width: wp('85%'),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  questionText: { fontFamily: 'FredokaOne-Regular', fontSize: wp('4%'), color: '#333', flex: 1, marginRight: 10 },
  questionTypeText: { fontFamily: 'FredokaOne-Regular', fontSize: wp('3.5%'), color: '#888', fontStyle: 'italic', marginRight: 10 },
  backContainer: { position: 'absolute', left: wp('4%'), zIndex: 10 },
  backButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, minWidth: 48 },
  backLabel: { marginLeft: 2, fontFamily: 'FredokaOne-Regular', fontSize: wp('4.2%'), color: '#000' },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#eee',
    marginTop: hp('6%'),
    width: '100%',
  },
  tabButton: { padding: 10, borderRadius: 8, flex: 1, alignItems: 'center' },
  tabButtonActive: { backgroundColor: '#4A90E2' },
  tabText: { fontFamily: 'FredokaOne-Regular', color: '#000', fontSize: wp('4%') },
});

export default CreateQuestions;
