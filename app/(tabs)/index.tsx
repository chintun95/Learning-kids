import React, { memo } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, View, Dimensions, PixelRatio, Pressable, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Video, ResizeMode } from 'expo-av'; // Import ResizeMode enum
import { Link } from 'expo-router';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

// Import for Snake Game Screen (or any other additional screens)
import SnakeGame from './SnakeGame';

// Responsive Scaling
const video = require("@/assets/images/App-home-page.mp4");

const { width, height } = Dimensions.get('window');
const IMAGE_SIZE = PixelRatio.roundToNearestPixel(841);

// Stack Navigator for app navigation
const Stack = createStackNavigator();

const App = memo(() => {
  const [fontsLoaded] = useFonts({
    "FredokaOne-Regular": require("@/assets/fonts/FredokaOne-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return <Text>Loading fonts...</Text>;
  }

  return (
    <NavigationContainer>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack.Navigator>
          <Stack.Screen name="Home" options={{ title: "Home" }}>
            {(props) => (
              <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />

                {/* Background Video */}
                <View style={styles.videoWrapper} pointerEvents="none">
                  <Video
                    source={video}
                    shouldPlay
                    isLooping
                    resizeMode={ResizeMode.COVER}  // Use ResizeMode enum
                    style={styles.video}
                  />
                </View>

                {/* Welcome Text */}
                <Text style={styles.text}>Welcome To </Text>

                {/* Logo */}
                <Image
                  source={require("@/assets/images/logo-black.png")}
                  style={styles.image}
                />

                {/* Subtitle */}
                <Text style={styles.textSub}>Where we make learning essential information fun! </Text>

                {/* Button */}
                <Link href="/logIn-page" asChild>
                  <Pressable style={styles.button}>
                    <Text style={styles.buttonText}>Lets Begin!</Text>
                  </Pressable>
                </Link>

              </SafeAreaView>
            )}
          </Stack.Screen>

          {/* Snake Game Screen */}
          <Stack.Screen name="Snake Game" component={SnakeGame} />
        </Stack.Navigator>
      </GestureHandlerRootView>
    </NavigationContainer>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoWrapper: {
    position: 'absolute',
    width: wp('100%'),
    height: hp('100%'),
  },
  video: {
    width: wp('100%'),
    height: hp('100%'),
    position: 'absolute',
  },
  text: {
    position: 'absolute',
    top: hp('10%'),
    textAlign: 'center',
    color: '#1E1E1E',
    fontSize: wp('15%'), // Scales with screen size
    fontFamily: 'FredokaOne-Regular',
  },
  textSub: {
    position: 'absolute',
    bottom: hp('35%'),
    textAlign: 'center',
    color: '#1E1E1E',
    fontSize: wp('4.8%'),
    fontFamily: 'FredokaOne-Regular',
    width: wp('80%'), // 80% of screen width
  },
  button: {
    position: 'absolute',
    bottom: hp('20%'),
    width: wp('70%'),
    height: hp('8%'),
    borderRadius: 50,
    borderWidth: 6,
    borderColor: '#1E1E1E',
    backgroundColor: '#93DEFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#1E1E1E',
    fontSize: wp('10%'),
    fontFamily: 'FredokaOne-Regular',
  },
  image: {
    position: 'absolute',
    top: hp('-10%'),
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    resizeMode: 'contain',
  }
});

export default App;
