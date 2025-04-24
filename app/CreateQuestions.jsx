import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute } from '@react-navigation/native';
import { supabase } from '../backend/supabase';

const CreateQuestions = () => {
  const route = useRoute();
  const userId = route.params?.userId;
  const childId = route.params?.childId;

  const [questionText, setQuestionText] = useState('');
  const [answers, setAnswers] = useState([
    { id: 1, text: '', isCorrect: false },
    { id: 2, text: '', isCorrect: false },
    { id: 3, text: '', isCorrect: false },
    { id: 4, text: '', isCorrect: false },
  ]);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    loadQuestionsFromStorage();
    fetchQuestionsFromDatabase();
  }, []);

  const loadQuestionsFromStorage = async () => {
    const stored = await AsyncStorage.getItem('user_questions');
    if (stored) {
      setQuestions(JSON.parse(stored));
    }
  };

  const saveQuestionsToStorage = async (questionsList) => {
    await AsyncStorage.setItem('user_questions', JSON.stringify(questionsList));
  };

  const fetchQuestionsFromDatabase = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('child_id', childId);

      if (error) {
        console.error('Supabase fetch error:', error);
        return;
      }

      setQuestions(data);
      await saveQuestionsToStorage(data);
    } catch (e) {
      console.error('Unexpected fetch error:', e);
    }
  };

  const addAnswer = (index) => (text) => {
    const newAnswers = [...answers];
    newAnswers[index].text = text;
    setAnswers(newAnswers);
  };

  const handleCorrectAnswer = (answerId) => {
    const newAnswers = answers.map((a) => ({
      ...a,
      isCorrect: a.id === answerId,
    }));
    setAnswers(newAnswers);
  };

  const addQuestion = async () => {
    if (!questionText.trim()) {
      Alert.alert('Missing Question', 'Please enter a question.');
      return;
    }

    if (!answers.some((a) => a.isCorrect)) {
      Alert.alert('No Correct Answer', 'Please select the correct answer.');
      return;
    }

    const correct = answers.find((a) => a.isCorrect)?.text;
    const options = answers.map((a) => a.text);

    try {
      const { data, error } = await supabase.from('questions').insert({
        question: questionText,
        options: options,
        correct_answer: correct,
        child_id: childId,
        parent_id: userId,
      }).select().single();

      if (error) {
        console.error('Insert error:', error);
        Alert.alert('Database Error', 'Could not save the question.');
        return;
      }

      const updated = [...questions, data];
      setQuestions(updated);
      await saveQuestionsToStorage(updated);

      // Reset inputs
      setQuestionText('');
      setAnswers([
        { id: 1, text: '', isCorrect: false },
        { id: 2, text: '', isCorrect: false },
        { id: 3, text: '', isCorrect: false },
        { id: 4, text: '', isCorrect: false },
      ]);
    } catch (e) {
      console.error('Unexpected insert error:', e);
    }
  };

  const deleteQuestion = async (questionId) => {
    if (!questionId || typeof questionId !== 'string' || questionId.length !== 36) {
      Alert.alert('Invalid Question ID', 'This question cannot be deleted because it was not saved to the database.');
      return;
    }

    try {
      const { error } = await supabase.from('questions').delete().eq('id', questionId);
      if (error) {
        console.error('Delete error:', error);
        Alert.alert('Error', 'Failed to delete question from database');
        return;
      }

      const updatedQuestions = questions.filter((q) => q.id !== questionId);
      setQuestions(updatedQuestions);
      await saveQuestionsToStorage(updatedQuestions);
    } catch (e) {
      console.error('Unexpected error during delete:', e);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Creating questions for child: {childId}</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter Question"
        value={questionText}
        onChangeText={setQuestionText}
      />

      {answers.map((answer, index) => (
        <View key={answer.id} style={styles.answerRow}>
          <Text style={styles.label}>Answer {index + 1}:</Text>
          <TextInput
            style={styles.answerInput}
            placeholder={`Enter answer ${index + 1}`}
            onChangeText={addAnswer(index)}
            value={answer.text}
          />
          <Button
            title={answer.isCorrect ? 'Correct' : 'Mark Correct'}
            onPress={() => handleCorrectAnswer(answer.id)}
          />
        </View>
      ))}

      <Button title="Add Question" onPress={addQuestion} />

      <View style={styles.questionList}>
        <FlatList
          data={questions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.questionItem}>
              <Text style={styles.questionText}>Question: {item.question}</Text>
              {item.options.map((opt, index) => (
                <Text key={index}>
                  Answer {index + 1}: {opt} {opt === item.correct_answer ? '(Correct)' : ''}
                </Text>
              ))}
              <Button title="Delete" color="red" onPress={() => deleteQuestion(item.id)} />
            </View>
          )}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  header: {
    fontSize: 16,
    marginBottom: 10,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  label: {
    width: 75,
  },
  answerInput: {
    flex: 1,
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  questionList: {
    marginTop: 20,
  },
  questionItem: {
    marginBottom: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: 'gray',
  },
  questionText: {
    fontWeight: 'bold',
  },
});

export default CreateQuestions;
