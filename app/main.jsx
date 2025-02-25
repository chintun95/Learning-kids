// app/main.jsx
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';  // Correctly import Link

const MainPage = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Main Page</Text>

      <View style={styles.row}>
        {/* Snake Game Box Link */}
        <Link href="/SnakeGame" asChild>
          <TouchableOpacity style={styles.box}>
            <Text>Snake Game</Text>
          </TouchableOpacity>
        </Link>

        <View style={styles.box}>
          <Text>Game 2</Text>
        </View>

        <View style={styles.box}>
          <Text>Game 3</Text>
        </View>
      </View>

      <Link href="/parent-profile" asChild>
        <TouchableOpacity style={styles.profileButton} activeOpacity={0.7}>
          <Text style={styles.buttonText}>Parent Profile</Text>
        </TouchableOpacity>
      </Link>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  box: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#DDD',
    margin: 10,
  },
  profileButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    position: 'absolute',
    bottom: 20,
  },
  buttonText: {
    color: 'white',
  },
});

export default MainPage;
