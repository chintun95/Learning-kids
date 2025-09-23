//login

import React, { useState, memo } from 'react'
import { StyleSheet, Text, View, ImageBackground,PixelRatio, TextInput,
   Pressable,TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import loginImage from "@/assets/images/app-background.png"
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from "expo-font"
import { MaterialIcons } from '@expo/vector-icons';
// Responsive Scaling
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import startFlappyGame from './Games/flappy';
import { useNavigation } from '@react-navigation/native';




const LogInPage = memo(() => {
  const navigation = useNavigation();

  //Font
  const [fontsLoaded] = useFonts({
      "FredokaOne-Regular": require("@/assets/fonts/FredokaOne-Regular.ttf"),
    });

    //Text boxes
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    if (!fontsLoaded) {
      return <Text>Loading fonts...</Text>;
    }

    const handleLogin = async () => {
      const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
      if (!emailRegex.test(email)) {
        Alert.alert('Invalid email', 'Please re-enter email');
        return;
      }

      try {
        setIsLoading(true);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        Alert.alert("Login successful!", `Hello, ${userCredential.user.email}`);
        navigation.navigate("ProfilePage");
      } catch (err) {
        const msg = err?.message ?? "Unknown error";
        setErrorMessage(msg);
        Alert.alert("Login failed!", msg);
      } finally {
        setIsLoading(false);
      }
    };
  

  return (
    <SafeAreaView style={styles.container}>
      {/* Background image*/} 
      <ImageBackground
        source={loginImage}
        resizeMode='cover'
        style={styles.image}
        //contentFit="fill"
      /> 

      {/* Logo */}
      <Image
        source={require("@/assets/images/logo-black.png")}
        style={styles.logo}
      />

      {/* Log In Text */}
      <Text style={styles.text}>Log In</Text>

      <View style={styles.boxes}>
        <Text style={styles.boxLabel} >Email:</Text>
        <TextInput
          style={styles.inputText}
          placeholder='Type here...'
          placeholderTextColor={"#aaa"}
          autoCapitalize="none"
          keyboardType="email-address"
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

      <TouchableOpacity onPress={handleLogin}>
        <View style={styles.button}>
          <Text style={styles.buttonText}>
            {isLoading ? "Logging in..." : "Login"}
          </Text>
        </View>
      </TouchableOpacity>
      
      {/* Sign Up Text */}
      <Pressable
        style={{ position: 'absolute', top: hp('75%') }}
        onPress={() => navigation.navigate('SignInPage')} 
      >
        <Text style={styles.otherText}>Don’t have an account? Sign Up</Text>
      </Pressable>
      
      {/* Social Login Icons */}
      <Text style={styles.otherText1}>Or continue with:</Text>
      <View style={styles.iconContainer}>
        <Pressable onPress={() => navigation.navigate('GamesPage')}>
          <Image style={styles.icon} source={require('@/assets/images/google-icon.png')} />
        </Pressable>

        <Pressable onPress={() => navigation.navigate('ProfilePage')}>
          <Image style={styles.icon} source={require('@/assets/images/apple-icon.png')} />
        </Pressable>

        <Pressable onPress={() => navigation.navigate('GamesTemp')}>
          <Image style={styles.icon} source={require('@/assets/images/facebook-icon.png')} />
        </Pressable>
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
    bottom: hp('25%'), // Moves button lower on bigger screens
    width: wp('50%'),
    height: hp('7%'),
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: '#D9D9D9',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
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