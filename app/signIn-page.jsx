//sign up
// Sign In Page
import React, { useState, memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
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
  Alert,
  Modal
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from "expo-font";
import { Ionicons } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase'; 
import { supabase } from '../backend/supabase';

import loginImage from "@/assets/images/app-background.png";

const SignInPage = memo(() => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

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

  // Input State (kid fields removed)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showTerms, setShowTerms] = useState(false);

  const handleSignUp = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid email', 'Please re-enter email');
      return;
    }

    if (password !== confirm) {
      Alert.alert('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const { error } = await supabase.from('profiles').insert([
        {
          user_id: user.uid,
          parent_name: name,
          phone_number: phone,
        }
      ]);

      if (error) {
        console.error('Supabase insert error:', error);
        Alert.alert('Signup failed', 'Could not save profile data.');
      } else {
        Alert.alert('Sign up successful!', `Welcome, ${user.email}`);
        setErrorMessage('');
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(error.message);
      Alert.alert('Signup Error', error.message);
    } finally {
      setIsLoading(false);
    }
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

              {/* back button */}
              <View style={[styles.backContainer, { top: insets.top + hp('1%') }]}>
                <Pressable
                  style={styles.backButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('LogInPage'))}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <Ionicons name="chevron-back" size={wp('6.2%')} color="#000" />
                  <Text style={styles.backLabel}>Back</Text>
                </Pressable>
              </View>

              <View style={styles.innerContainer}>
                {/* Logo */}
                <Image source={require("@/assets/images/logo-black.png")} style={styles.logo} />

                <View style={{ bottom: hp('25%')}}>
                  <Text style={styles.text}>Sign Up</Text>

                  {/* Parent section */}
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

                </View>

                <TouchableOpacity onPress={handleSignUp}>
                  <View style={styles.button}>
                    <Text style={styles.buttonText}>
                      {isLoading ? "Signing up..." : "Sign Up"}
                    </Text>
                  </View>
                </TouchableOpacity>

                <Text style={styles.footer}>
                  By continuing, you accept our{' '}
                  <Text style={styles.termsLink} onPress={() => setShowTerms(true)}>
                    Terms of Service
                  </Text>
                </Text>
              </View>

            </ImageBackground>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Terms of Service Modal */}
      <Modal
        visible={showTerms}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTerms(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Terms of Service</Text>
            <TouchableOpacity onPress={() => setShowTerms(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.termsText}>
              <Text style={styles.termsHeading}>1. Acceptance of Terms{"\n\n"}</Text>
              By accessing and using this Learning Kids application, you accept and agree to be bound by the terms and provision of this agreement.
              {"\n\n"}
              <Text style={styles.termsHeading}>2. Description of Service{"\n\n"}</Text>
              Learning Kids provides educational games and activities for children. The service includes quiz games, progress tracking, and parental controls.
              {"\n\n"}
              <Text style={styles.termsHeading}>3. User Accounts{"\n\n"}</Text>
              You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
              {"\n\n"}
              <Text style={styles.termsHeading}>4. Privacy and Data Protection{"\n\n"}</Text>
              We collect and store information about you and your child's progress to provide personalized learning experiences. We do not share personal information with third parties without your consent.
              {"\n\n"}
              <Text style={styles.termsHeading}>5. Children's Privacy{"\n\n"}</Text>
              This app is designed for children with parental supervision. Parents are responsible for monitoring their children's use of the application.
              {"\n\n"}
              <Text style={styles.termsHeading}>6. User Conduct{"\n\n"}</Text>
              You agree not to use the service for any unlawful purpose or in any way that could damage, disable, or impair the service.
              {"\n\n"}
              <Text style={styles.termsHeading}>7. Content{"\n\n"}</Text>
              All content provided through the app, including text, graphics, and games, is owned by Learning Kids or its licensors and is protected by copyright laws.
              {"\n\n"}
              <Text style={styles.termsHeading}>8. Modifications to Service{"\n\n"}</Text>
              We reserve the right to modify or discontinue the service at any time without notice.
              {"\n\n"}
              <Text style={styles.termsHeading}>9. Limitation of Liability{"\n\n"}</Text>
              Learning Kids shall not be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use the service.
              {"\n\n"}
              <Text style={styles.termsHeading}>10. Changes to Terms{"\n\n"}</Text>
              We reserve the right to update these terms at any time. Continued use of the service constitutes acceptance of modified terms.
              {"\n\n"}
              <Text style={styles.termsHeading}>11. Contact Information{"\n\n"}</Text>
              For questions about these Terms of Service, please contact us through the app settings.
              {"\n\n"}
              <Text style={styles.termsFooter}>Last Updated: November 2025</Text>
            </Text>
          </ScrollView>
          <TouchableOpacity style={styles.acceptButton} onPress={() => setShowTerms(false)}>
            <Text style={styles.acceptButtonText}>Close</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
});

// -------------------- styles stay identical --------------------

const LOGO_WIDTH = PixelRatio.roundToNearestPixel(556);
const LOGO_HEIGHT = PixelRatio.roundToNearestPixel(488);
const BOX_WIDTH = wp('85%');
const BOX_HEIGHT = hp('6%');

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardAvoidingContainer: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  innerContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { flex: 1, width: '100%', height: '100%', alignItems: 'center' },
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
  termsLink: {
    color: '#4A90E2',
    textDecorationLine: 'underline',
    fontFamily: 'FredokaOne-Regular',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp('4%'),
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  modalTitle: {
    fontSize: wp('6%'),
    fontFamily: 'FredokaOne-Regular',
    color: '#1E1E1E',
  },
  closeButton: {
    padding: wp('2%'),
  },
  closeButtonText: {
    fontSize: wp('7%'),
    color: '#666',
  },
  modalContent: {
    flex: 1,
    padding: wp('5%'),
  },
  termsText: {
    fontSize: wp('3.8%'),
    lineHeight: wp('6%'),
    color: '#333',
  },
  termsHeading: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('4.2%'),
    color: '#1E1E1E',
  },
  termsFooter: {
    fontStyle: 'italic',
    color: '#666',
    fontSize: wp('3.2%'),
  },
  acceptButton: {
    margin: wp('4%'),
    backgroundColor: '#4A90E2',
    padding: wp('4%'),
    borderRadius: 25,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: wp('4.5%'),
    fontFamily: 'FredokaOne-Regular',
  },
  backContainer: {
    position: 'absolute',
    left: wp('4%'),
    zIndex: 10
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    minWidth: 48
  },
  backLabel: {
    marginLeft: 2,
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('4.2%'),
    color: '#000'
  },
});

export default SignInPage;
