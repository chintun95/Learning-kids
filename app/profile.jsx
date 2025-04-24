import React, { memo, useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity } from 'react-native';
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
  const navigation = useNavigation();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await fetchUserProfile();
        setProfile(data);
      } catch (err) {
        console.error('Profile fetch error:', err);
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  if (!fontsLoaded) {
    return <Text>Loading fonts...</Text>;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.error}>Error: {error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Profile Info</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Parent Name:</Text>
        <Text style={styles.value}>{profile.parent_name}</Text>

        <Text style={styles.label}>Phone Number:</Text>
        <Text style={styles.value}>{profile.phone_number}</Text>

        <Text style={styles.label}>Child Name:</Text>
        <Text style={styles.value}>{profile.child_name}</Text>

        <Text style={styles.label}>Child Age:</Text>
        <Text style={styles.value}>{profile.child_age}</Text>

        <Text style={styles.label}>Created At:</Text>
        <Text style={styles.value}>{new Date(profile.created_at).toLocaleString()}</Text>
      </View>

      {/* Custom button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('CreateQuestions')}
      >
        <Text style={styles.buttonText}>Go to Create Questions</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: hp('8%'),
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('10%'),
    marginBottom: hp('4%'),
    color: '#1E1E1E',
  },
  card: {
    width: wp('85%'),
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: wp('5%'),
    elevation: 3,
  },
  label: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('4.5%'),
    color: '#555',
    marginTop: hp('1%'),
  },
  value: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('4.2%'),
    color: '#000',
    marginBottom: hp('1.5%'),
  },
  error: {
    fontSize: wp('4.5%'),
    color: 'red',
    fontFamily: 'FredokaOne-Regular',
  },
  button: {
    marginTop: hp('4%'),
    backgroundColor: '#1E90FF',
    paddingVertical: hp('1.5%'),
    paddingHorizontal: wp('6%'),
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('4.5%'),
    textAlign: 'center',
  },
});

export default ProfilePage;
