//ProgressChart.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
  SafeAreaView // Use SafeAreaView for top-level container
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // Keep if using React Navigation
import { auth } from '../firebase'; // Assuming firebase setup
import { supabase } from '../backend/supabase'; // Assuming supabase setup
import { LineChart } from 'react-native-chart-kit';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  getDay,
  getHours,
} from 'date-fns';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

// --- Reusable Chart Component (Extracted Logic) ---
const ProgressChartComponent = ({ userId }) => {
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'day'
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState(null);
  const [incorrectQuestions, setIncorrectQuestions] = useState([]); // State for incorrect questions list
  const chartRef = useRef(null);
  const [alertLoading, setAlertLoading] = useState(false); // Keep for potential future use or remove if not needed

  const chartWidth = Dimensions.get('window').width * 0.95; // Slightly wider
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(50, 50, 50, ${opacity})`, // Darker labels
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '1',
    },
    propsForBackgroundLines: {
        strokeDasharray: '',
        stroke: '#eef', // Lighter blue grid lines
    }
  };

  const processChartData = (records, mode) => {
    // Keep raw records for incorrect list generation
    const incorrectRecords = records.filter(r => !r.is_correct);

    let labels;
    let correctData;
    let incorrectData;

    if (mode === 'week') {
      labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      correctData = Array(7).fill(0);
      incorrectData = Array(7).fill(0);

      records.forEach(record => {
        try {
            const answeredDate = new Date(record.answered_at);
            const dayIndex = getDay(answeredDate);
            if (record.is_correct) {
              correctData[dayIndex]++;
            } else {
              incorrectData[dayIndex]++;
            }
        } catch (dateError) {
             console.error(`[processChartData] Error parsing date: ${record.answered_at}`, dateError);
        }
      });
    } else { // 'day'
      labels = ['12-6a', '6-12p', '12-6p', '6-12a'];
      correctData = Array(4).fill(0);
      incorrectData = Array(4).fill(0);

      records.forEach(record => {
         try {
            const answeredDate = new Date(record.answered_at);
            const hour = getHours(answeredDate);
            let index = 0;
            if (hour >= 6 && hour < 12) index = 1;
            else if (hour >= 12 && hour < 18) index = 2;
            else if (hour >= 18) index = 3;

            if (record.is_correct) correctData[index]++;
            else incorrectData[index]++;
         } catch (dateError) {
             console.error(`[processChartData] Error parsing date: ${record.answered_at}`, dateError);
         }
      });
    }

    const totalAnswers = correctData.reduce((a, b) => a + b, 0) + incorrectData.reduce((a, b) => a + b, 0);
    if (totalAnswers === 0) {
        setIncorrectQuestions([]); // Clear incorrect list if no data
        return null;
    }

    // Fetch and set incorrect question details after processing counts
    fetchIncorrectQuestionDetails(incorrectRecords);

    return {
      labels: labels,
      datasets: [
        { data: correctData, color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, strokeWidth: 2 },
        { data: incorrectData, color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`, strokeWidth: 2 }
      ],
      legend: ['Correct', 'Incorrect']
    };
  };

  // Function to fetch details for incorrect questions
   const fetchIncorrectQuestionDetails = async (incorrectRecords) => {
       const questionIds = incorrectRecords.map(r => r.question_id).filter(id => !!id);
       if (questionIds.length === 0) {
           setIncorrectQuestions([]);
           return;
       }

       try {
           const { data: questionsData, error: questionsError } = await supabase
               .from('questions')
               .select('id, question, correct_answer, options')
               .in('id', questionIds);

           if (questionsError) throw questionsError;

           if (questionsData) {
                // Map the fetched data for easier display
                const details = incorrectRecords.map(record => {
                    const questionDetail = questionsData.find(q => q.id === record.question_id);
                    if (!questionDetail) return null; // Skip if question not found (maybe deleted?)

                    let correctAnswerText = questionDetail.correct_answer;
                    if (questionDetail.options && typeof questionDetail.options === 'object' && questionDetail.correct_answer) {
                        correctAnswerText = questionDetail.options[questionDetail.correct_answer] || questionDetail.correct_answer;
                    }
                    return {
                        logId: record.id, // Add a unique key for the list
                        questionText: questionDetail.question,
                        correctAnswerText: correctAnswerText,
                        answeredAt: format(new Date(record.answered_at), 'Pp') // Format date/time nicely
                    };
                }).filter(item => item !== null); // Remove null entries

               setIncorrectQuestions(details);
           } else {
               setIncorrectQuestions([]);
           }
       } catch (error) {
           console.error("Error fetching incorrect question details:", error);
           setIncorrectQuestions([]); // Clear on error
           Alert.alert("Error", "Could not fetch details for incorrect questions.");
       }
   };


  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        if (!userId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setChartData(null);
        setIncorrectQuestions([]); // Clear incorrect list on new fetch

        const now = new Date();
        let startDate;
        let endDate = endOfDay(now);

        if (viewMode === 'week') {
          startDate = startOfWeek(now);
        } else {
          startDate = startOfDay(now);
        }

        // Fetch logs with question_id
        const { data, error } = await supabase
          .from('answer_log')
          .select('id, is_correct, answered_at, question_id') // Added id for list key
          .eq('user_id', userId)
          .gte('answered_at', startDate.toISOString())
          .lte('answered_at', endDate.toISOString())
          .order('answered_at', { ascending: false }); // Show newest first in list potentially

        if (error) {
          console.error('[fetchData] Error fetching chart data:', error.message);
          setChartData(null);
        } else if (data && data.length > 0) {
            const processed = processChartData(data, viewMode); // This now also triggers fetching incorrect details
            if (processed) {
                setChartData(processed);
            } else {
                setChartData(null);
            }
        } else {
            setChartData(null);
            setIncorrectQuestions([]); // Ensure list is cleared if no logs
        }
        setLoading(false);
      };

      fetchData();
    }, [userId, viewMode])
  );

  const handleShareChart = async () => {
      if (!chartRef.current) return;
      try {
          const uri = await captureRef(chartRef, { format: 'png', quality: 0.9 });
          if (!await Sharing.isAvailableAsync()) {
              Alert.alert("Error", "Sharing is not available."); return;
          }
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share progress' });
      } catch (error) {
          Alert.alert("Error", "Could not share chart.");
      }
  };

  return (
    <View style={styles.chartSectionContainer}>
      <View style={styles.chartDisplayContainer} ref={chartRef} collapsable={false}>
        <Text style={styles.chartTitle}>Progress Tracker</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'day' && styles.toggleActive]}
            onPress={() => setViewMode('day')}
          >
            <Text style={[styles.toggleText, viewMode === 'day' && styles.toggleActiveText]}>Daily</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'week' && styles.toggleActive]}
            onPress={() => setViewMode('week')}
          >
            <Text style={[styles.toggleText, viewMode === 'week' && styles.toggleActiveText]}>Weekly</Text>
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator size="large" color="#007AFF" style={styles.chartLoadingIndicator} />}

        {!loading && !chartData && (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No data for this period.</Text>
            <Text style={styles.noDataSubText}>Play a game to see your stats!</Text>
          </View>
        )}

        {!loading && chartData && (
          <LineChart
            data={chartData}
            width={chartWidth}
            height={250}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withDots={true}
            withShadow={false}
            withInnerLines={true}
            withOuterLines={false}
            fromZero={true}
            yAxisInterval={1}
            // onDataPointClick removed - details are listed below now
          />
        )}
      </View>

       {/* Share Button positioned below the chart background */}
      {!loading && chartData && (
            <TouchableOpacity style={styles.shareChartButton} onPress={handleShareChart}>
                <Text style={styles.shareChartButtonText}>Share Chart</Text>
            </TouchableOpacity>
        )}

      {/* Incorrect Questions List */}
      {!loading && incorrectQuestions.length > 0 && (
          <View style={styles.incorrectListContainer}>
              <Text style={styles.incorrectListTitle}>Incorrect Answers ({viewMode === 'week' ? 'This Week' : 'Today'})</Text>
              {incorrectQuestions.map((item) => (
                  <View key={item.logId} style={styles.incorrectItem}>
                      <Text style={styles.incorrectQuestionText}>{item.questionText}</Text>
                      <Text style={styles.incorrectAnswerText}>Correct Answer: {item.correctAnswerText}</Text>
                      <Text style={styles.incorrectTimestamp}>{item.answeredAt}</Text>
                  </View>
              ))}
          </View>
      )}
       {!loading && chartData && incorrectQuestions.length === 0 && (
            <Text style={styles.noIncorrectText}>No incorrect answers recorded for this period!</Text>
       )}
    </View>
  );
};

// --- Main Progress Chart Screen ---
const ProgressChartScreen: React.FC = () => {
    const navigation = useNavigation();
    const user = auth.currentUser;

    // Add a simple header or use navigation options if part of a stack
    React.useLayoutEffect(() => {
        navigation.setOptions({ title: 'Progress Chart' });
    }, [navigation]);

    if (!user) {
        // Handle case where user is not logged in (e.g., redirect)
        return (
            <SafeAreaView style={styles.container}>
                <Text>Please log in to view progress.</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
             <ImageBackground
                source={require('../assets/images/app-background.png')} // Reuse background
                style={styles.backgroundImage}
                resizeMode="cover"
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <ProgressChartComponent userId={user.uid} />
                </ScrollView>
            </ImageBackground>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8', // Fallback background
  },
  backgroundImage: {
      flex: 1,
      width: '100%',
      height: '100%',
  },
  scrollContent: {
      flexGrow: 1,
      alignItems: 'center',
      paddingVertical: hp('3%'),
      paddingBottom: hp('5%'), // Ensure space at bottom
  },
  chartSectionContainer: {
      width: '100%',
      alignItems: 'center',
  },
  chartDisplayContainer: { // White background just for chart area + controls
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Slightly more opaque white
    borderRadius: 20,
    paddingVertical: hp('2%'),
    paddingHorizontal: wp('2%'),
    alignItems: 'center',
    width: wp('95%'), // Make chart container slightly wider
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: hp('1.5%'), // Space before share button
  },
  chartTitle: {
    fontSize: wp('6%'), // Larger title
    fontFamily: 'FredokaOne-Regular',
    marginBottom: hp('1.5%'),
    color: '#1E1E1E',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 20,
    marginBottom: hp('2%'),
    overflow: 'hidden',
  },
  toggleButton: {
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('5%'),
  },
  toggleActive: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  toggleText: {
    fontSize: wp('4%'),
    fontFamily: 'FredokaOne-Regular',
    color: '#0A0A0A',
  },
  toggleActiveText: {
    color: '#fff',
  },
  chart: {
    marginVertical: hp('1%'),
    borderRadius: 16,
  },
  chartLoadingIndicator: {
    marginVertical: hp('10%'), // Center loading indicator
  },
  noDataContainer: {
    paddingVertical: hp('5%'),
    paddingHorizontal: wp('5%'),
    alignItems: 'center',
    minHeight: 250, // Ensure it takes similar space to chart
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: wp('4.5%'),
    fontFamily: 'FredokaOne-Regular',
    color: '#555',
    textAlign: 'center',
    marginBottom: hp('1%'),
  },
  noDataSubText: {
    fontSize: wp('4%'),
    fontFamily: 'FredokaOne-Regular',
    color: '#888',
    textAlign: 'center',
  },
  shareChartButton: {
      marginTop: hp('1%'), // Position below chart container
      marginBottom: hp('2%'), // Space before incorrect list
      backgroundColor: '#5bc0de',
      paddingVertical: hp('1.2%'),
      paddingHorizontal: wp('6%'),
      borderRadius: 25, // More rounded
      borderWidth: 1.5,
      borderColor: '#46b8da',
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
  },
  shareChartButtonText: {
      color: '#fff',
      fontSize: wp('4.2%'), // Slightly larger
      fontFamily: 'FredokaOne-Regular',
      fontWeight: 'bold',
  },
  incorrectListContainer: {
    width: wp('90%'),
    marginTop: hp('1%'),
    backgroundColor: 'rgba(255, 255, 255, 0.85)', // Semi-transparent white
    borderRadius: 15,
    padding: wp('4%'),
    borderWidth: 2,
    borderColor: '#FFBABA', // Light red border
  },
  incorrectListTitle: {
    fontSize: wp('5%'),
    fontFamily: 'FredokaOne-Regular',
    color: '#D9534F', // Red title
    marginBottom: hp('1.5%'),
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FFBABA',
    paddingBottom: hp('1%'),
  },
  incorrectItem: {
    marginBottom: hp('1.5%'),
    paddingBottom: hp('1%'),
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  incorrectQuestionText: {
    fontSize: wp('4%'),
    fontFamily: 'FredokaOne-Regular',
    color: '#333',
    marginBottom: hp('0.5%'),
  },
  incorrectAnswerText: {
    fontSize: wp('3.8%'),
    fontFamily: 'FredokaOne-Regular',
    color: '#5cb85c', // Green for correct answer text
    marginLeft: wp('2%'), // Indent
    marginBottom: hp('0.5%'),
  },
  incorrectTimestamp: {
    fontSize: wp('3.2%'),
    fontFamily: 'FredokaOne-Regular',
    color: '#888',
    marginLeft: wp('2%'),
    textAlign: 'right', // Align time to the right
  },
    noIncorrectText: {
        marginTop: hp('2%'),
        fontSize: wp('4%'),
        fontFamily: 'FredokaOne-Regular',
        color: '#6c757d',
        textAlign: 'center',
        padding: wp('4%'),
    },
});

export default ProgressChartScreen;