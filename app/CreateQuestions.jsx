//CreateQuestions.jsx
import React, { memo, useState, useEffect } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, FlatList, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../backend/supabase';
import { getAuth } from 'firebase/auth';
import { useFonts } from 'expo-font';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useNavigation } from '@react-navigation/native';

const CreateQuestions = memo(() => {
  const [fontsLoaded] = useFonts({
    'FredokaOne-Regular': require('@/assets/fonts/FredokaOne-Regular.ttf'),
  });

  const [question, setQuestion] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [questionsList, setQuestionsList] = useState([]);
  const navigation = useNavigation();

  const auth = getAuth();
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (uid) {
      fetchQuestions();
    }
  }, [uid]);

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

  const handleCreateQuestion = async () => {
    if (!question || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
      setError('Please fill out all fields and select the correct answer');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { error: insertError } = await supabase.from('questions').insert([
        {
          question,
          options: {
            a: optionA,
            b: optionB,
            c: optionC,
            d: optionD,
          },
          correct_answer: correctAnswer,
          parent_id: uid,
        },
      ]);

      if (insertError) {
        throw insertError;
      }

      alert('Question created successfully!');
      clearFields();
      fetchQuestions(); // refresh list
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

  const handleDeleteQuestion = async (id) => {
    try {
      const { error } = await supabase.from('questions').delete().eq('id', id);
      if (error) throw error;
      fetchQuestions();
    } catch (err) {
      console.error('Delete question error:', err);
    }
  };

  const selectCorrectAnswer = (answerKey) => {
    setCorrectAnswer(answerKey);
  };

  if (!fontsLoaded) {
    return <Text>Loading fonts...</Text>;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Create Question</Text>

        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Enter question"
            value={question}
            onChangeText={setQuestion}
            style={styles.input}
            placeholderTextColor="#999"
          />
          <TextInput
            placeholder="Option A"
            value={optionA}
            onChangeText={setOptionA}
            style={styles.input}
            placeholderTextColor="#999"
          />
          <TextInput
            placeholder="Option B"
            value={optionB}
            onChangeText={setOptionB}
            style={styles.input}
            placeholderTextColor="#999"
          />
          <TextInput
            placeholder="Option C"
            value={optionC}
            onChangeText={setOptionC}
            style={styles.input}
            placeholderTextColor="#999"
          />
          <TextInput
            placeholder="Option D"
            value={optionD}
            onChangeText={setOptionD}
            style={styles.input}
            placeholderTextColor="#999"
          />

          {/* Correct Answer Selection */}
          <View style={styles.optionsRow}>
            {['a', 'b', 'c', 'd'].map((key) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.answerButton,
                  correctAnswer === key && styles.selectedAnswerButton,
                ]}
                onPress={() => selectCorrectAnswer(key)}
              >
                <Text style={styles.answerButtonText}>{key.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleCreateQuestion}>
          <Text style={styles.buttonText}>Submit Question</Text>
        </TouchableOpacity>

        {/* Questions List */}
        <FlatList
          data={questionsList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.questionCard}>
              <Text style={styles.questionText}>{item.question}</Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteQuestion(item.id)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
          scrollEnabled={false} // FlatList inside ScrollView must not scroll
          contentContainerStyle={{ paddingBottom: hp('10%') }}
        />
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: hp('8%'),
    paddingBottom: hp('10%'),
  },
  title: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('10%'),
    marginBottom: hp('4%'),
    color: '#1E1E1E',
  },
  inputContainer: {
    width: wp('85%'),
  },
  input: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('4.5%'),
    backgroundColor: '#f1f1f1',
    padding: wp('3%'),
    borderRadius: 10,
    marginBottom: hp('2%'),
    color: '#000',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: hp('2%'),
  },
  answerButton: {
    backgroundColor: '#ccc',
    padding: wp('3%'),
    borderRadius: 8,
  },
  selectedAnswerButton: {
    backgroundColor: '#1E90FF',
  },
  answerButtonText: {
    color: '#fff',
    fontFamily: 'FredokaOne-Regular',
  },
  error: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('4.5%'),
    color: 'red',
    marginTop: hp('1%'),
    textAlign: 'center',
  },
  button: {
    marginTop: hp('2%'),
    backgroundColor: '#1E90FF',
    paddingVertical: hp('1.5%'),
    paddingHorizontal: wp('6%'),
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('4.5%'),
    textAlign: 'center',
  },
  questionCard: {
    backgroundColor: '#f1f1f1',
    padding: wp('4%'),
    marginVertical: hp('1%'),
    borderRadius: 10,
    width: wp('85%'),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionText: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('4%'),
    color: '#333',
    flex: 1,
    flexWrap: 'wrap',
  },
  deleteButton: {
    backgroundColor: 'red',
    padding: wp('2%'),
    borderRadius: 5,
    marginLeft: wp('2%'),
  },
  deleteButtonText: {
    color: '#fff',
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('3.5%'),
  },
});

export default CreateQuestions;
