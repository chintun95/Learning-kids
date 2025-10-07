//edit-profile.jsx
import React, { memo, useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  Animated,
  useColorScheme,
  ScrollView,
  RefreshControl,
  ImageBackground,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { fetchUserProfile } from '../backend/fetchUserProfile';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// 👉 import background image
import profileBg from '@/assets/images/app-background.png';

const ProfilePage = memo(() => {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    'FredokaOne-Regular': require('@/assets/fonts/FredokaOne-Regular.ttf'),
  });

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(1)).current;

  const navigation = useNavigation();
  const colorScheme = useColorScheme();

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await fetchUserProfile();
      setProfile(data);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      console.error('Profile fetch error:', err);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleButtonPressIn = () => {
    Animated.spring(buttonAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handleButtonPressOut = () => {
    Animated.spring(buttonAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles().loaderContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles().loadingText}>Loading fonts...</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles().loaderContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles(colorScheme).loaderContainer}>
        <Text style={styles(colorScheme).error}>Error: {error}</Text>
        <TouchableOpacity style={styles(colorScheme).button} onPress={loadProfile}>
          <Text style={styles(colorScheme).buttonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const dynamicStyles = styles(colorScheme);
  const profileFields = [
    { label: 'Parent Name', value: profile.parent_name },
    { label: 'Phone Number', value: profile.phone_number },
    { label: 'Child Name', value: profile.child_name },
    { label: 'Child Age', value: profile.child_age },
    { label: 'Created At', value: new Date(profile.created_at).toLocaleString() },
  ];

  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* Background image */}
      <ImageBackground source={profileBg} resizeMode="cover" style={dynamicStyles.background} />

      {/* back button */}
      <View style={[dynamicStyles.backContainer, { top: insets.top + hp('1%') }]}>
        <Pressable
          style={dynamicStyles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('LogInPage'))}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={wp('6.2%')} color="#000" />
          <Text style={dynamicStyles.backLabel}>Back</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ alignItems: 'center' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <Text style={dynamicStyles.title}>Profile Info</Text>

        <Animated.View style={[dynamicStyles.card, { opacity: fadeAnim }]}>
          {profileFields.map((field, index) => (
            <ProfileField
              key={index}
              label={field.label}
              value={field.value}
              colorScheme={colorScheme}
            />
          ))}
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: buttonAnim }] }}>
          <TouchableOpacity
            style={dynamicStyles.button}
            onPressIn={handleButtonPressIn}
            onPressOut={handleButtonPressOut}
            onPress={() => navigation.navigate("CreateQuestionsPage")}
            accessible={true}
            accessibilityLabel="Create Questions"
          >
            <Text style={dynamicStyles.buttonText}>Create Questions</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
});

const ProfileField = ({ label, value, colorScheme }) => {
  const dynamicStyles = styles(colorScheme);
  return (
    <View style={dynamicStyles.fieldContainer}>
      <Text style={dynamicStyles.label}>{label}:</Text>
      <Text style={dynamicStyles.value}>{value}</Text>
    </View>
  );
};

const styles = (theme = 'dark') =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
    },
    background: {
      position: 'absolute',
      width: wp('100%'),
      height: hp('100%'),
    },
    loaderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme === 'dark' ? '#000' : '#f0f4f8',
    },
    loadingText: {
      marginTop: hp('2%'),
      fontSize: wp('4.5%'),
      fontFamily: 'FredokaOne-Regular',
      color: '#666',
    },
    title: {
      fontFamily: 'FredokaOne-Regular',
      fontSize: wp('10%'),
      color: theme === 'dark' ? '#fff' : '#1E1E1E',
      marginBottom: hp('4%'),
      marginTop: hp('8%'),
    },
    card: {
      width: wp('85%'),
      backgroundColor:
        theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.85)',
      borderRadius: 20,
      padding: wp('6%'),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
      marginBottom: hp('4%'),
    },
    fieldContainer: {
      marginBottom: hp('2%'),
    },
    label: {
      fontFamily: 'FredokaOne-Regular',
      fontSize: wp('4.5%'),
      color: theme === 'dark' ? '#000000ff' : '#555',
      marginBottom: hp('0.5%'),
    },
    value: {
      fontFamily: 'FredokaOne-Regular',
      fontSize: wp('5.5%'),
      color: theme === 'dark' ? '#fff5f5ff' : '#222',
    },
    error: {
      fontSize: wp('4.5%'),
      color: 'red',
      fontFamily: 'FredokaOne-Regular',
      marginBottom: hp('2%'),
    },
    button: {
      backgroundColor: '#4A90E2',
      paddingVertical: hp('1.8%'),
      paddingHorizontal: wp('10%'),
      borderRadius: 30,
      shadowColor: '#4A90E2',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 3,
      marginTop: hp('2%'),
    },
    buttonText: {
      color: '#fff',
      fontFamily: 'FredokaOne-Regular',
      fontSize: wp('5%'),
      textAlign: 'center',
    },
    // back
    backContainer: { position: 'absolute', left: wp('4%'), zIndex: 10 },
    backButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, minWidth: 48 },
    backLabel: { marginLeft: 2, fontFamily: 'FredokaOne-Regular', fontSize: wp('4.2%'), color: '#000' },
  });

export default ProfilePage;
