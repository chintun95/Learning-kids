// app/game-page.jsx
import React, { useState, memo } from 'react'
import { StyleSheet, Text, View, ImageBackground, PixelRatio, TextInput, TouchableOpacity, Pressable } from 'react-native'
import loginImage from "@/assets/images/app-background.png"
import { Link } from 'expo-router'; 
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from "expo-font"
import { MaterialIcons } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

  
const GamePage = memo(() => {

  const [fontsLoaded] = useFonts({
      "FredokaOne-Regular": require("@/assets/fonts/FredokaOne-Regular.ttf"),
  });
  
  if (!fontsLoaded) {
    return <Text>Loading fonts...</Text>;
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Background image */}
      <ImageBackground
        source={loginImage}
        resizeMode='cover'
        style={styles.image}
        contentFit="fill"
      >
      </ImageBackground>

      {/* Main Text */}
      <Text style={styles.text}>Lets Have Some Fun!!!</Text>

      {/* image */}
      <Image
        source={require("@/assets/images/game-page-img.png")}
        style={styles.logo}
      />

      {/* Sub-Text */}
      <Text style={styles.subText}>What game would you like to play:</Text>
      

      

      
      {/* Link to game-page.jsx page */}
      <Link href="/SnakeGame" asChild>
        <TouchableOpacity style={styles.button} activeOpacity={0.7}>
          <Text style={styles.buttonText}>Log In</Text>
        </TouchableOpacity>
      </Link>

    </SafeAreaView>
  );
});
  
const LOGO_WIDTH = PixelRatio.roundToNearestPixel(214);
const LOGO_HEIGHT = PixelRatio.roundToNearestPixel(214);
const BOX_WIDTH = PixelRatio.roundToNearestPixel(332);
const BOX_HEIGHT = PixelRatio.roundToNearestPixel(50);
  
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    position: 'absolute',
    width: wp('100%'),
    height: hp('100%'),
  },
  text: {
    marginBottom: hp('28%'),
    textAlign: 'center',
    color: '#1E1E1E',
    fontSize: wp('12.2%'),
    fontFamily: 'FredokaOne-Regular',
  },
  logo: {
    bottom: hp('36%'),
    marginTop: hp('5%'),
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
    resizeMode: 'contain',
  },
  subText: {
    marginBottom: hp('15%'),
    textAlign: 'center',
    color: '#0A0A0A',
    fontSize: wp('5.5%'),
    fontFamily: 'FredokaOne-Regular',
  },

  button: {
    position: 'absolute',
    bottom: hp('29%'),
    width: wp('50%'),
    height: hp('7%'),
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: '#D9D9D9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 2, height: 4 },
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: '#000',
    fontSize: wp('7.2%'),
    fontFamily: 'FredokaOne-Regular',
  },
});
  
  
  export default GamePage;
  