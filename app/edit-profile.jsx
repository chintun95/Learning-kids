// edit-profile.jsx
import React, { memo, useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  Animated,
  ScrollView,
  RefreshControl,
  ImageBackground,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { fetchUserProfile } from '../backend/fetchUserProfile';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import profileBg from '@/assets/images/app-background.png';

const ProfilePage = memo(() => {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    'FredokaOne-Regular': require('@/assets/fonts/FredokaOne-Regular.ttf'),
  });

  const [profile, setProfile] = useState(null);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(1)).current;

  const navigation = useNavigation();

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { profile, children } = await fetchUserProfile();
      setProfile(profile);
      setChildren(children);

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

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={styles().loaderContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles().loaderContainer}>
        <Text style={styles().error}>Error: {error}</Text>
        <TouchableOpacity style={styles().button} onPress={loadProfile}>
          <Text style={styles().buttonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const dynamicStyles = styles();
  return (
    <SafeAreaView style={dynamicStyles.container}>
      <ImageBackground source={profileBg} resizeMode="cover" style={dynamicStyles.background} />

      {/* Back button */}
      <View style={[dynamicStyles.backContainer, { top: insets.top + hp('1%') }]}>
        <Pressable
          style={dynamicStyles.backButton}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('LogInPage'))}
        >
          <Ionicons name="chevron-back" size={wp('6%')} color="#000" />
          <Text style={dynamicStyles.backLabel}>Back</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ alignItems: 'center' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <Text style={dynamicStyles.title}>Profile Info</Text>

        <Animated.View style={[dynamicStyles.card, { opacity: fadeAnim }]}>
          <ProfileField label="Parent Name" value={profile.parent_name} />
          <ProfileField label="Profile Created At" value={new Date(profile.created_at).toLocaleString()} />
          <ProfileField label="Number of Children" value={children.length} />
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: buttonAnim }] }}>
          <TouchableOpacity
            style={dynamicStyles.button}
            onPressIn={handleButtonPressIn}
            onPressOut={handleButtonPressOut}
            onPress={() => navigation.navigate("CreateQuestionsPage")}
          >
            <Text style={dynamicStyles.buttonText}>Create Questions</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
});

const ProfileField = ({ label, value }) => (
  <View style={styles().fieldContainer}>
    <Text style={styles().label}>{label}:</Text>
    <Text style={styles().value}>{value}</Text>
  </View>
);

const styles = () =>
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
    },
    title: {
      fontFamily: 'FredokaOne-Regular',
      fontSize: wp('10%'),
      color: '#333',
      marginBottom: hp('4%'),
      marginTop: hp('8%'),
    },
    card: {
      width: wp('85%'),
      backgroundColor: 'rgba(255,255,255,0.85)',
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
      color: '#555',
      marginBottom: hp('0.5%'),
    },
    value: {
      fontFamily: 'FredokaOne-Regular',
      fontSize: wp('5.5%'),
      color: '#222',
    },
    button: {
      backgroundColor: '#4A90E2',
      paddingVertical: hp('1.8%'),
      paddingHorizontal: wp('10%'),
      borderRadius: 30,
      marginTop: hp('2%'),
      alignItems: 'center',
      shadowColor: '#4A90E2',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 3,
    },
    buttonText: {
      color: '#fff',
      fontFamily: 'FredokaOne-Regular',
      fontSize: wp('5%'),
      textAlign: 'center',
    },
    backContainer: { position: 'absolute', left: wp('4%'), zIndex: 10 },
    backButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, minWidth: 48 },
    backLabel: { marginLeft: 2, fontFamily: 'FredokaOne-Regular', fontSize: wp('4.2%'), color: '#000' },
  });

export default ProfilePage;
