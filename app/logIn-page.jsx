import React, { useState, memo } from 'react'
import { StyleSheet, Text, View, ImageBackground,PixelRatio, TextInput,
   Pressable,TouchableOpacity, ActivityIndicator } from 'react-native'
import loginImage from "@/assets/images/app-background.png"
import { Link } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from "expo-font"
import { MaterialIcons } from '@expo/vector-icons';
// Responsive Scaling
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';



const LogInPage = memo(() => {

  //Font
  const [fontsLoaded] = useFonts({
      "FredokaOne-Regular": require("@/assets/fonts/FredokaOne-Regular.ttf"),
    });
  
    if (!fontsLoaded) {
      return <Text>Loading fonts...</Text>;
    }

    //Text boxes
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      {/* Background image*/} 
      <ImageBackground
        source={loginImage}
        resizeMode='cover'
        style={styles.image}
        contentFit="fill"
      > 
      </ImageBackground>

      {/* Logo */}
      <Image
        source={require("@/assets/images/logo-black.png")}
        style={styles.logo}
      />

      {/* Log In Text */}
      <Text style={styles.text}>Log In</Text>

      <View style={styles.boxes}>
        <Text style={styles.boxLabel} >Email or Phone number:</Text>
        <TextInput
          style={styles.inputText}
          placeholder='Type here...'
          placeholderTextColor={"#aaa"}
          value={email}
          onChangeText={setEmail}
        ></TextInput>

        <Text style={styles.boxLabel} >Password:</Text>
        <TextInput
          style={styles.inputText}
          placeholder='Type here...'
          placeholderTextColor={"#aaa"}
          secureTextEntry={true}
          value={password}
          onChangeText={setPassword}
        ></TextInput>
        <Text style={styles.subText} >forgot password?</Text>
      </View>



      {/* Button */}
      <Link  href="/" asChild>
        <TouchableOpacity style={styles.button} activeOpacity={0.7}>
          <Text style={styles.buttonText}>Log In</Text>
        </TouchableOpacity>
      </Link>

      {/* Sign Up Text */}
      <Link  href="/signIn-page" asChild>
          <Pressable style={{position: 'absolute',top: hp('75%')}}>
            <Text style={styles.otherText} >Don’t have account, Sign In</Text>
          </Pressable>
        </Link>
      
      {/* Social Login Icons */}
      <Text style={styles.otherText1}>Or continue with:</Text>
      <View style={styles.iconContainer}>
        <Link  href="/" asChild>
          <Pressable>
            <Image
              source={require("@/assets/images/google-icon.png")}
              style={styles.icon}
            />
          </Pressable>
        </Link>
        <Link  href="/" asChild>
          <Pressable>
            <Image
              source={require("@/assets/images/apple-icon.png")}
              style={styles.icon}
            />
          </Pressable>
        </Link>
        <Link  href="/" asChild>
          <Pressable>
            <Image
              source={require("@/assets/images/facebook-icon.png")}
              style={styles.icon}
            />
          </Pressable>
        </Link>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>By continuing, you accept our Terms of Service</Text>
    </SafeAreaView>
  );
});


const LOGO_WIDTH = PixelRatio.roundToNearestPixel(471);
const LOGO_HEIGHT = PixelRatio.roundToNearestPixel(414);
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
  logo: {
    position: 'absolute',
    top: hp('-6%'),
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
    resizeMode: 'contain',
  },
  text: {
    position: 'absolute',
    top: hp('30%'),
    textAlign: 'center',
    color: '#1E1E1E',
    fontSize: wp('12%'), // Scales with screen size
    fontFamily: 'FredokaOne-Regular',
  },
  boxes: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'left',
  },
  boxLabel: {
    color: '#0A0A0A',
    fontSize: wp('4.8%'),
    fontFamily: 'FredokaOne-Regular',
    marginBottom: 5,
    
  },
  inputText: {
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 30,
    fontSize: wp('4.6%'), // Scales with screen size
    fontFamily: 'FredokaOne-Regular',
    backgroundColor: '#D9D9D9',
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  subText: {
    textAlign: 'right',
    color: '#0A0A0A',
    fontSize: wp('3.8%'),
    fontFamily: 'FredokaOne-Regular',
    marginTop: -10,
  },
  button: {
    position: 'absolute',
    bottom: hp('29%'), // Moves button lower on bigger screens
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
  otherText: {
    textAlign: 'center',
    color: '#0A0A0A',
    fontSize: wp('4.4%'), // Scales with screen size
    fontFamily: 'FredokaOne-Regular',
  },
  otherText1: {
    position: 'absolute',
    top: hp('80%'),
    textAlign: 'center',
    color: '#0A0A0A',
    fontSize: wp('3.8%'), // Scales with screen size
    fontFamily: 'FredokaOne-Regular',
  },
  iconContainer:{
    position: 'absolute',
    top: hp('81%'),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
  },
  icon:{
    width: 60,
    height: 60,
    marginHorizontal: 15,
  },
  footer:{
    position: 'absolute',
    top: hp('95%'),
    textAlign: 'center',
    color: '#0A0A0A',
    fontSize: wp('2.8%'), // Scales with screen size
    fontFamily: 'FredokaOne-Regular',
  }

});

export default LogInPage;
