import React, { useState, memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  PixelRatio,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert
} from 'react-native';
import { Link } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from "expo-font";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase'; 

import loginImage from "@/assets/images/app-background.png";

const SignInPage = memo(() => {
  // Font Loading
  const [fontsLoaded] = useFonts({
    "FredokaOne-Regular": require("@/assets/fonts/FredokaOne-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  // Input State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [kname, setKname] = useState('');
  const [kemail, setKemail] = useState('');
  const [knum, setKnum] = useState('');
  const [kage, setKage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignUp = () => {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid email', 'Please re-enter email');
      return;
    }

    setIsLoading(true);
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        Alert.alert('Sign up successful!', `Welcome, ${user.email}`);
        setErrorMessage('');
      })
      .catch((error) => {
        setErrorMessage(error.message);
      })
      .finally(() => setIsLoading(false));
    };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingContainer}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <ImageBackground source={loginImage} resizeMode="cover" style={styles.image}>
                <View style={styles.innerContainer}>
                    {/* Logo */}
                    <Image source={require("@/assets/images/logo-black.png")} style={styles.logo} />
                    <View style={{ bottom: hp('25%')}}>
                        <Text style={styles.text}>Sign In</Text>

                        {/* Parent or Guardians section */}
                        <Text style={styles.subText}>Parent or Guardian's Information:</Text>

                        <View style={styles.boxes}>
                        <Text style={styles.boxLabel}>Full Name:</Text>
                        <TextInput
                            style={styles.inputText}
                            placeholder="Full name..."
                            placeholderTextColor="#aaa"
                            keyboardType="default"
                            autoCapitalize="words"
                            value={name}
                            onChangeText={setName}
                        />
                        <Text style={styles.boxLabel}>E-mail:</Text>
                        <TextInput
                            style={styles.inputText}
                            placeholder="E-mail..."
                            placeholderTextColor="#aaa"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                        />
                        <Text style={styles.boxLabel}>Phone Number:</Text>
                        <TextInput
                            style={styles.inputText}
                            placeholder="Phone number..."
                            placeholderTextColor="#aaa"
                            keyboardType="phone-pad"
                            value={phone}
                            onChangeText={setPhone}
                        />
                        <Text style={styles.boxLabel}>Password:</Text>
                        <TextInput
                            style={styles.inputText}
                            placeholder="Enter password..."
                            placeholderTextColor="#aaa"
                            secureTextEntry={true}
                            value={password}
                            onChangeText={setPassword}
                        />
                        <Text style={styles.boxLabel}>Confirm Password:</Text>
                        <TextInput
                            style={styles.inputText}
                            placeholder="Confirm password..."
                            placeholderTextColor="#aaa"
                            secureTextEntry={true}
                            value={confirm}
                            onChangeText={setConfirm}
                        />
                    </View>


                        {/* Kid’s section */}
                        <Text style={styles.subText}>Kid’s Information:</Text>
                        <Text style={styles.boxLabel}>Full Name:</Text>
                        <TextInput
                            style={styles.inputText}
                            placeholder="Full name..."
                            placeholderTextColor="#aaa"
                            keyboardType="default"
                            autoCapitalize="words"
                            value={kname}
                            onChangeText={setKname}
                        />
                        <Text style={styles.boxLabel}>E-mail:</Text>
                        <TextInput
                            style={styles.inputText}
                            placeholder="E-mail..."
                            placeholderTextColor="#aaa"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={kemail}
                            onChangeText={setKemail}
                        />
                        <Text style={styles.boxLabel}>Phone Number:</Text>
                        <TextInput
                            style={styles.inputText}
                            placeholder="Phone number..."
                            placeholderTextColor="#aaa"
                            keyboardType="phone-pad"
                            value={knum}
                            onChangeText={setKnum}
                        />
                        <Text style={styles.boxLabel}>Kids Age:</Text>
                        <TextInput
                            style={styles.inputText}
                            placeholder="Age..."
                            placeholderTextColor="#aaa"
                            keyboardType='number-pad'
                            value={kage}
                            onChangeText={setKage}
                        />

                    </View>

                    <TouchableOpacity onPress={handleSignUp}>
                      <View style={styles.button}>
                        <Text style={styles.buttonText}>
                          {isLoading ? "Signing up..." : "Sign Up"}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Footer */}
                    <Text style={styles.footer}>By continuing, you accept our Terms of Service.</Text>
                </View>
            </ImageBackground>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
});

// Responsive Scaling
const LOGO_WIDTH = PixelRatio.roundToNearestPixel(556);
const LOGO_HEIGHT = PixelRatio.roundToNearestPixel(488);
const BOX_WIDTH = wp('85%');
const BOX_HEIGHT = hp('6%');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  innerContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
  },
  logo: {
    bottom: hp('15%'),
    marginTop: hp('5%'),
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
    resizeMode: 'contain',
  },
  text: {
    marginTop: hp('5%'),
    textAlign: 'center',
    color: '#1E1E1E',
    fontSize: wp('10.5%'),
    fontFamily: 'FredokaOne-Regular',
  },
  subText: {
    marginTop: hp('3%'),
    marginBottom: hp('1%'),
    textAlign: 'center',
    color: '#0A0A0A',
    fontSize: wp('5.5%'),
    fontFamily: 'FredokaOne-Regular',
  },
  boxes: {
    width: '100%',
    alignItems: 'center',
    marginTop: hp('2%'),
  },
  boxLabel: {
    alignSelf: 'flex-start',
    marginLeft: wp('5%'),
    color: '#0A0A0A',
    fontSize: wp('4.0%'),
    fontFamily: 'FredokaOne-Regular',
    marginBottom: 6,
  },
  inputText: {
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 25,
    fontSize: wp('3.5%'),
    fontFamily: 'FredokaOne-Regular',
    backgroundColor: '#F5F5F5',
    marginBottom: 15,
    paddingHorizontal: 15,
    color: '#333',
  },
  button: {
    marginTop: hp('3%'),
    bottom: hp('15%'),
    width: wp('50%'),
    height: hp('8%'),
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
    fontSize: wp('7.5%'),
    fontFamily: 'FredokaOne-Regular',
  },
  footer: {
    marginTop: hp('3%'),
    textAlign: 'center',
    color: '#0A0A0A',
    fontSize: wp('3.2%'),
    fontFamily: 'FredokaOne-Regular',
  },
});

export default SignInPage;
