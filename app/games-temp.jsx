// app/games-temp.jsx
import React, { memo, useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

import Flappy from './Games/flappy';
import Snake from './SnakeGame';

const GamesTemp = memo(() => {
  const [fontsLoaded] = useFonts({
    'FredokaOne-Regular': require('@/assets/fonts/FredokaOne-Regular.ttf'),
  });

  const [selectedGame, setSelectedGame] = useState(null);

  if (!fontsLoaded) {
    return <Text>Loading fonts...</Text>;
  }

  const handleGameSelect = (gameKey) => {
    setSelectedGame(gameKey);
  };

  const renderGame = () => {
    switch (selectedGame) {
      case 'flappy':
        return <Flappy />;
      case 'Snake':
        return <Snake />;
      // case 'puzzle':
      //   return <PuzzleGame />;
      // case 'math':
      //   return <MathGame />;
      default:
        return null;
    }
  };

  if (selectedGame) {
    return <SafeAreaView style={{ flex: 1 }}>{renderGame()}</SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Select a Game!</Text>

      <View style={styles.grid}>
        {/* Flappy Game Button */}
        <Pressable onPress={() => handleGameSelect('flappy')} style={styles.gameButton}>
          <Image source={require('@/assets/images/kiwi.png')} style={styles.icon} />
          <Text style={styles.gameText}>Flappy</Text>
        </Pressable>

        {/* Placeholder Buttons for More Games */}
        <Pressable onPress={() => handleGameSelect('Snake')} style={styles.gameButton}>
          <Image source={require('@/assets/images/snake.png')} style={styles.icon} />
          <Text style={styles.gameText}>Snake</Text>
        </Pressable>

        <Pressable onPress={() => {}} style={styles.gameButton}>
          <Image source={require('@/assets/images/watermelon.png')} style={styles.icon} />
          <Text style={styles.gameText}>Game 3</Text>
        </Pressable>

        <Pressable onPress={() => {}} style={styles.gameButton}>
          <Image source={require('@/assets/images/question.png')} style={styles.icon} />
          <Text style={styles.gameText}>Game 4</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: hp('10%'),
    backgroundColor: '#fff',
  },
  title: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('10%'),
    color: '#1E1E1E',
    marginBottom: hp('5%'),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
  },
  gameButton: {
    width: wp('35%'),
    height: wp('35%'),
    margin: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  icon: {
    width: wp('15%'),
    height: wp('15%'),
    marginBottom: 8,
  },
  gameText: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('4%'),
    color: '#333',
  },
});

export default GamesTemp;
