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

import { 
  createQuiz,
  fetchQuizzes,
  deleteQuiz,
  getQuizQuestions,
  addQuestionToQuiz,
  removeQuestionFromQuiz
} from '../backend/quizzes';

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

  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [newQuizName, setNewQuizName] = useState('');
  const [newQuizDescription, setNewQuizDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [questionsList, setQuestionsList] = useState([]);
  const [activeTab, setActiveTab] = useState('create');
  const [questionsToComplete, setQuestionsToComplete] = useState(5);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);

  const navigation = useNavigation();
  const auth = getAuth();
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (uid) {
      fetchQuestions();
      fetchQuestionLimit();
      loadQuizzes();
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

  // Generate questions with ChatGPT
  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) {
      Alert.alert('Error', 'Please enter a prompt describing what questions you want to create.');
      return;
    }

    setAiLoading(true);
    setError('');

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_OPENAI_API_KEY_HERE',
        },

        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful educational assistant that creates quiz questions for children. Always respond with valid JSON array format.'
            },
            {
              role: 'user',
              content: `Create 5 educational quiz questions based on: "${aiPrompt}". Return ONLY a JSON array: [{"question": "text", "type": "multiple_choice" or "true_false", "options": {"a": "A", "b": "B", "c": "C", "d": "D"}, "correct_answer": "a"}]. For true_false use options {"a": "True", "b": "False"}.`
            }
          ],
          temperature: 0.7,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate questions');
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      let questions;
      try {
        questions = JSON.parse(content);
      } catch (parseError) {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          questions = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Invalid response format from AI');
        }
      }

      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('No questions generated');
      }

      setGeneratedQuestions(questions);
      Alert.alert('Success', `Generated ${questions.length} questions! Review and save them below.`);
    } catch (err) {
      console.error('AI generation error:', err);
      setError(err.message || 'Failed to generate questions with AI');
      Alert.alert('Error', err.message || 'Failed to generate questions. Please check your API key.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveGeneratedQuestion = async (generatedQ, index) => {
    try {
      const payload = {
        question: generatedQ.question,
        parent_id: uid,
        options: generatedQ.options,
        correct_answer: generatedQ.correct_answer,
        question_type: generatedQ.type,
      };

      const { error: insertError } = await supabase.from('questions').insert([payload]);
      if (insertError) throw insertError;

      setGeneratedQuestions(prev => prev.filter((_, i) => i !== index));
      Alert.alert('Saved', 'Question added to your question bank!');
      fetchQuestions();
    } catch (err) {
      console.error('Save generated question error:', err);
      Alert.alert('Error', 'Failed to save question');
    }
  };

  const handleSaveAllGenerated = async () => {
    if (generatedQuestions.length === 0) return;

    setLoading(true);
    try {
      const payload = generatedQuestions.map(q => ({
        question: q.question,
        parent_id: uid,
        options: q.options,
        correct_answer: q.correct_answer,
        question_type: q.type,
      }));

      const { error: insertError } = await supabase.from('questions').insert(payload);
      if (insertError) throw insertError;

      Alert.alert('Success', `All ${generatedQuestions.length} questions saved!`);
      setGeneratedQuestions([]);
      setAiPrompt('');
      fetchQuestions();
    } catch (err) {
      console.error('Save all questions error:', err);
      Alert.alert('Error', 'Failed to save questions');
    } finally {
      setLoading(false);
    }
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

  // Load all quizzes
  const loadQuizzes = async () => {
    try {
      const data = await fetchQuizzes();
      setQuizzes(data);
    } catch (error) {
      console.error('Error loading quizzes:', error);
      Alert.alert('Error', 'Failed to load quizzes');
    }
  };

  // Create a new quiz
  const handleCreateQuiz = async () => {
    if (!newQuizName.trim()) {
      Alert.alert('Error', 'Please enter a quiz name');
      return;
    }

    try {
      await createQuiz(newQuizName.trim(), newQuizDescription.trim());
      setNewQuizName('');
      setNewQuizDescription('');
      loadQuizzes();
      Alert.alert('Success', 'Quiz created!');
    } catch (error) {
      console.error('Error creating quiz:', error);
      Alert.alert('Error', 'Failed to create quiz');
    }
  };

  // Delete a quiz
  const handleDeleteQuiz = async (quizId) => {
    Alert.alert(
      'Delete Quiz',
      'Are you sure? This will remove the quiz but not the questions.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteQuiz(quizId);
              loadQuizzes();
              if (selectedQuiz?.id === quizId) {
                setSelectedQuiz(null);
                setQuizQuestions([]);
              }
              Alert.alert('Success', 'Quiz deleted');
            } catch (error) {
              console.error('Error deleting quiz:', error);
              Alert.alert('Error', 'Failed to delete quiz');
            }
          }
        }
      ]
    );
  };

  // Select a quiz to manage
  const handleSelectQuiz = async (quiz) => {
    setSelectedQuiz(quiz);
    try {
      const questions = await getQuizQuestions(quiz.id);
      setQuizQuestions(questions);
    } catch (error) {
      console.error('Error loading quiz questions:', error);
      Alert.alert('Error', 'Failed to load quiz questions');
    }
  };

  // Add question to quiz
  const handleAddQuestionToQuiz = async (questionId) => {
    if (!selectedQuiz) return;

    try {
      await addQuestionToQuiz(selectedQuiz.id, questionId);
      handleSelectQuiz(selectedQuiz); // Refresh
      Alert.alert('Success', 'Question added to quiz');
    } catch (error) {
      console.error('Error adding question:', error);
      Alert.alert('Error', 'Failed to add question. It may already be in the quiz.');
    }
  };

  // Remove question from quiz
  const handleRemoveQuestionFromQuiz = async (questionId) => {
    if (!selectedQuiz) return;

    try {
      await removeQuestionFromQuiz(selectedQuiz.id, questionId);
      handleSelectQuiz(selectedQuiz); // Refresh
      Alert.alert('Success', 'Question removed from quiz');
    } catch (error) {
      console.error('Error removing question:', error);
      Alert.alert('Error', 'Failed to remove question');
    }
  };

  // Check if question is in the selected quiz
  const isQuestionInQuiz = (questionId) => {
    return quizQuestions.some(q => q.id === questionId);
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
        {['create', 'ai', 'questions', 'quizzes'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={styles.tabText}>{tab === 'ai' ? '🤖 AI' : tab.toUpperCase()}</Text>
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

      {/* AI Generate Tab */}
      {activeTab === 'ai' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>🤖 AI Question Generator</Text>
          <Text style={styles.aiSubtitle}>
            Describe what kind of questions you want, and AI will generate them for you!
          </Text>

          <TextInput
            placeholder="e.g., Create math questions about addition for 1st graders"
            value={aiPrompt}
            onChangeText={setAiPrompt}
            style={[styles.input, styles.aiPromptInput]}
            multiline
            numberOfLines={4}
            placeholderTextColor="#999"
          />

          <Text style={styles.aiExamplesTitle}>Example prompts:</Text>
          <View style={styles.aiExamplesContainer}>
            <TouchableOpacity
              style={styles.aiExampleButton}
              onPress={() => setAiPrompt('Create 5 science questions about animals for elementary students')}
            >
              <Text style={styles.aiExampleText}>🐾 Animals & Science</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.aiExampleButton}
              onPress={() => setAiPrompt('Create 5 math questions about multiplication for 3rd graders')}
            >
              <Text style={styles.aiExampleText}>🔢 Math Multiplication</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.aiExampleButton}
              onPress={() => setAiPrompt('Create 5 geography questions about continents and oceans')}
            >
              <Text style={styles.aiExampleText}>🌍 Geography</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, styles.aiGenerateButton]}
            onPress={handleGenerateWithAI}
            disabled={aiLoading}
          >
            {aiLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>✨ Generate Questions with AI</Text>
            )}
          </TouchableOpacity>

          {/* Generated Questions List */}
          {generatedQuestions.length > 0 && (
            <View style={styles.generatedSection}>
              <View style={styles.generatedHeader}>
                <Text style={styles.generatedTitle}>Generated Questions ({generatedQuestions.length})</Text>
                <TouchableOpacity
                  style={styles.saveAllButton}
                  onPress={handleSaveAllGenerated}
                  disabled={loading}
                >
                  <Text style={styles.saveAllButtonText}>💾 Save All</Text>
                </TouchableOpacity>
              </View>

              {generatedQuestions.map((q, index) => (
                <View key={index} style={styles.generatedQuestionCard}>
                  <View style={styles.generatedQuestionHeader}>
                    <Text style={styles.generatedQuestionType}>
                      {q.type === 'multiple_choice' ? '📝 Multiple Choice' : '✓✗ True/False'}
                    </Text>
                  </View>
                  <Text style={styles.generatedQuestionText}>{q.question}</Text>
                  
                  <View style={styles.generatedOptionsContainer}>
                    {Object.entries(q.options).map(([key, value]) => (
                      <View
                        key={key}
                        style={[
                          styles.generatedOption,
                          q.correct_answer === key && styles.generatedCorrectOption
                        ]}
                      >
                        <Text style={styles.generatedOptionText}>
                          {key.toUpperCase()}: {value}
                          {q.correct_answer === key && ' ✓'}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.saveOneButton}
                    onPress={() => handleSaveGeneratedQuestion(q, index)}
                  >
                    <Text style={styles.saveOneButtonText}>💾 Save This Question</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
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

      {/* Quizzes Tab */}
      {activeTab === 'quizzes' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Manage Quizzes</Text>

          {/* Create Quiz Section */}
          <View style={{ width: wp('85%'), marginBottom: hp('3%') }}>
            <Text style={styles.label}>Create New Quiz</Text>
            <TextInput
              placeholder="Quiz Name"
              value={newQuizName}
              onChangeText={setNewQuizName}
              style={styles.input}
            />
            <TextInput
              placeholder="Description (optional)"
              value={newQuizDescription}
              onChangeText={setNewQuizDescription}
              style={styles.input}
              multiline
            />
            <TouchableOpacity style={styles.button} onPress={handleCreateQuiz}>
              <Text style={styles.buttonText}>Create Quiz</Text>
            </TouchableOpacity>
          </View>

          {/* Quiz List */}
          <View style={{ width: wp('85%'), marginBottom: hp('3%') }}>
            <Text style={styles.label}>Your Quizzes ({quizzes.length})</Text>
            {quizzes.map((quiz) => (
              <View key={quiz.id} style={styles.questionCard}>
                <TouchableOpacity 
                  onPress={() => handleSelectQuiz(quiz)} 
                  style={{ flex: 1 }}
                >
                  <Text style={styles.questionText}>{quiz.name}</Text>
                  {quiz.description && (
                    <Text style={styles.questionTypeText}>{quiz.description}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteQuiz(quiz.id)}
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
            ))}
          </View>

          {/* Selected Quiz - Manage Questions */}
          {selectedQuiz && (
            <View style={{ width: wp('85%') }}>
              <Text style={styles.label}>
                Manage: {selectedQuiz.name}
              </Text>
              <Text style={{ 
                fontFamily: 'FredokaOne-Regular', 
                fontSize: wp('3.5%'), 
                color: '#666',
                marginBottom: hp('2%'),
                textAlign: 'center'
              }}>
                Questions in quiz: {quizQuestions.length}
              </Text>

              {questionsList.map((question) => {
                const inQuiz = isQuestionInQuiz(question.id);
                const formattedType =
                  question.question_type === 'multiple_choice'
                    ? 'MC'
                    : question.question_type === 'true_false'
                    ? 'T/F'
                    : '';

                return (
                  <View key={question.id} style={styles.questionCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.questionText} numberOfLines={2}>
                        {question.question}
                      </Text>
                      <Text style={styles.questionTypeText}>{formattedType}</Text>
                    </View>
                    <TouchableOpacity
                      style={{
                        backgroundColor: inQuiz ? '#FF5C5C' : '#4CAF50',
                        paddingVertical: hp('1%'),
                        paddingHorizontal: wp('3%'),
                        borderRadius: 8,
                        minWidth: wp('18%'),
                        alignItems: 'center',
                      }}
                      onPress={() =>
                        inQuiz
                          ? handleRemoveQuestionFromQuiz(question.id)
                          : handleAddQuestionToQuiz(question.id)
                      }
                    >
                      <Text style={{ color: '#fff', fontFamily: 'FredokaOne-Regular' }}>
                        {inQuiz ? 'Remove' : 'Add'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
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
  
  // AI Tab Styles
  aiSubtitle: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('4%'),
    color: '#666',
    textAlign: 'center',
    marginBottom: hp('2%'),
    width: wp('85%'),
  },
  aiPromptInput: {
    height: hp('15%'),
    textAlignVertical: 'top',
    paddingTop: wp('3.5%'),
  },
  aiExamplesTitle: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('4%'),
    color: '#333',
    marginTop: hp('1%'),
    marginBottom: hp('1%'),
  },
  aiExamplesContainer: {
    width: wp('85%'),
    marginBottom: hp('2%'),
  },
  aiExampleButton: {
    backgroundColor: '#E3F2FD',
    padding: wp('3%'),
    borderRadius: 10,
    marginBottom: hp('1%'),
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  aiExampleText: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('3.8%'),
    color: '#1976D2',
  },
  aiGenerateButton: {
    backgroundColor: '#9C27B0',
  },
  generatedSection: {
    width: wp('85%'),
    marginTop: hp('3%'),
  },
  generatedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('2%'),
  },
  generatedTitle: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('5%'),
    color: '#333',
  },
  saveAllButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('4%'),
    borderRadius: 20,
  },
  saveAllButtonText: {
    color: '#fff',
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('3.5%'),
  },
  generatedQuestionCard: {
    backgroundColor: '#fff',
    padding: wp('4%'),
    borderRadius: 12,
    marginBottom: hp('2%'),
    borderWidth: 2,
    borderColor: '#E3F2FD',
  },
  generatedQuestionHeader: {
    marginBottom: hp('1%'),
  },
  generatedQuestionType: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('3.5%'),
    color: '#1976D2',
  },
  generatedQuestionText: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('4.2%'),
    color: '#333',
    marginBottom: hp('1.5%'),
  },
  generatedOptionsContainer: {
    marginBottom: hp('1.5%'),
  },
  generatedOption: {
    backgroundColor: '#F5F5F5',
    padding: wp('2.5%'),
    borderRadius: 8,
    marginBottom: hp('0.5%'),
  },
  generatedCorrectOption: {
    backgroundColor: '#C8E6C9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  generatedOptionText: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('3.8%'),
    color: '#333',
  },
  saveOneButton: {
    backgroundColor: '#2196F3',
    paddingVertical: hp('1.2%'),
    paddingHorizontal: wp('4%'),
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  saveOneButtonText: {
    color: '#fff',
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('3.5%'),
  },
});

export default CreateQuestions;
