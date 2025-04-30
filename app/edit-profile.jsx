import React, { memo, useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  useColorScheme,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { fetchUserProfile } from '../backend/fetchUserProfile';
import { useNavigation } from '@react-navigation/native';

const ProfilePage = memo(() => {
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
            onPress={() => navigation.navigate('CreateQuestions')}
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

const styles = (theme = 'light') => StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: hp('6%'),
    backgroundColor: theme === 'dark' ? '#1E1E1E' : '#b5fffc',
    alignItems: 'center',
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
    fontSize: wp('9%'),
    color: theme === 'dark' ? '#fff' : '#1E1E1E',
    marginBottom: hp('4%'),
  },
  card: {
    width: wp('85%'),
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.85)',
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
    fontSize: wp('4%'),
    color: theme === 'dark' ? '#bbb' : '#555',
    marginBottom: hp('0.5%'),
  },
  value: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('5%'),
    color: theme === 'dark' ? '#eee' : '#222',
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
});

export default ProfilePage;
