// app/logIn-page.jsx

//login

// app/logIn-page.jsx

import React, { useState, memo } from 'react'
import { StyleSheet, Text, View, ImageBackground,PixelRatio, TextInput,
   Pressable,TouchableOpacity, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native'
import loginImage from "@/assets/images/app-background.png"
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from "expo-font"
import { MaterialIcons } from '@expo/vector-icons';
// Responsive Scaling
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
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
    const [showTerms, setShowTerms] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [isResetting, setIsResetting] = useState(false);

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



        navigation.navigate("ChildSelectScreen");

      } catch (err) {
        const msg = err?.message ?? "Unknown error";
        setErrorMessage(msg);
        Alert.alert("Login failed!", msg);
      } finally {
        setIsLoading(false);
      }
    };

    const handleForgotPassword = async () => {
      const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
      if (!resetEmail || !emailRegex.test(resetEmail)) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
      }

      try {
        setIsResetting(true);
        await sendPasswordResetEmail(auth, resetEmail);
        Alert.alert(
          'Email Sent!',
          `A password reset link has been sent to ${resetEmail}. Please check your inbox and spam folder.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowForgotPassword(false);
                setResetEmail('');
              }
            }
          ]
        );
      } catch (error) {
        let errorMsg = 'Failed to send reset email. Please try again.';
        if (error.code === 'auth/user-not-found') {
          errorMsg = 'No account found with this email address.';
        } else if (error.code === 'auth/invalid-email') {
          errorMsg = 'Invalid email address.';
        } else if (error.code === 'auth/too-many-requests') {
          errorMsg = 'Too many attempts. Please try again later.';
        }
        Alert.alert('Error', errorMsg);
      } finally {
        setIsResetting(false);
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
        <Pressable onPress={() => setShowForgotPassword(true)}>
          <Text style={styles.subText}>forgot password?</Text>
        </Pressable>
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

      {/* Footer */}
      <Text style={styles.footer}>
        By continuing, you accept our{' '}
        <Text style={styles.termsLink} onPress={() => setShowTerms(true)}>
          Terms of Service
        </Text>
      </Text>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPassword}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowForgotPassword(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.forgotPasswordModal}>
            <Text style={styles.forgotPasswordTitle}>Reset Password</Text>
            <Text style={styles.forgotPasswordSubtitle}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>
            
            <TextInput
              style={styles.forgotPasswordInput}
              placeholder="Enter your email"
              placeholderTextColor="#aaa"
              autoCapitalize="none"
              keyboardType="email-address"
              value={resetEmail}
              onChangeText={setResetEmail}
            />

            <View style={styles.forgotPasswordButtons}>
              <TouchableOpacity
                style={[styles.forgotPasswordButton, styles.cancelButton]}
                onPress={() => {
                  setShowForgotPassword(false);
                  setResetEmail('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.forgotPasswordButton, styles.sendButton]}
                onPress={handleForgotPassword}
                disabled={isResetting}
              >
                {isResetting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.sendButtonText}>Send Link</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    color: '#4A90E2',
    fontSize: wp('3.8%'),
    fontFamily: 'FredokaOne-Regular',
    marginTop: -10,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp('5%'),
  },
  forgotPasswordModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: wp('6%'),
    width: wp('85%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  forgotPasswordTitle: {
    fontSize: wp('6.5%'),
    fontFamily: 'FredokaOne-Regular',
    color: '#1E1E1E',
    textAlign: 'center',
    marginBottom: hp('1.5%'),
  },
  forgotPasswordSubtitle: {
    fontSize: wp('3.8%'),
    color: '#666',
    textAlign: 'center',
    marginBottom: hp('3%'),
    lineHeight: wp('5.5%'),
  },
  forgotPasswordInput: {
    width: '100%',
    height: hp('6.5%'),
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderRadius: 25,
    fontSize: wp('4.2%'),
    backgroundColor: '#F5F5F5',
    paddingHorizontal: wp('4%'),
    marginBottom: hp('3%'),
  },
  forgotPasswordButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp('3%'),
  },
  forgotPasswordButton: {
    flex: 1,
    height: hp('6%'),
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: wp('4.5%'),
    fontFamily: 'FredokaOne-Regular',
  },
  sendButton: {
    backgroundColor: '#4A90E2',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: wp('4.5%'),
    fontFamily: 'FredokaOne-Regular',
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
  footer:{
    position: 'absolute',
    top: hp('95%'),
    textAlign: 'center',
    color: '#0A0A0A',
    fontSize: wp('2.8%'), // Scales with screen size
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

});

export default LogInPage;