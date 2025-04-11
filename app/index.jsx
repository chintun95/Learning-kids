//Home Page

import React, { memo } from 'react'
import { View, Text, StyleSheet, Dimensions, Pressable, PixelRatio } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Link } from 'expo-router';
import { useFonts } from "expo-font";
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

// Responsive Scaling
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

const video = require("@/assets/images/App-home-page.mp4");


const App = memo(() => {
  const player = useVideoPlayer(video, (player) => {
    player.loop = true;
    player.play();
  });

  const [fontsLoaded] = useFonts({
    "FredokaOne-Regular": require("@/assets/fonts/FredokaOne-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return <Text>Loading fonts...</Text>;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Video */}
      <View style={styles.videoWrapper} pointerEvents="none">
        <VideoView 
          style={styles.video} 
          player={player} 
          allowsFullscreen={false} 
          allowsPictureInPicture={false}
          nativeControls={false}
          contentFit="fill"
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
      <Link  href="/logIn-page" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Lets Begin!</Text>
        </Pressable>
      </Link>

    </SafeAreaView>
  );
});


const { width, height } = Dimensions.get('window');
const IMAGE_SIZE = PixelRatio.roundToNearestPixel(841);


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
    bottom: hp('20%'), // Moves button lower on bigger screens
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