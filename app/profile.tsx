import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  PixelRatio,
  ImageBackground,
  Switch,
  ActivityIndicator // Keep ActivityIndicator for profile loading
} from 'react-native';
import { auth } from '../firebase'; // Assuming firebase.js/ts is correctly set up
import { signOut } from 'firebase/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // Keep if using React Navigation
// If using expo-router, replace above with: import { useRouter, useFocusEffect } from 'expo-router';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'; // Keep if using React Navigation
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { scheduleLocalNotification, scheduleDailyReminder, cancelDailyReminder, isDailyReminderScheduled, getDailyReminderTime } from './utils/notifications'; // Ensure path is correct
// Removed chart-related imports

// --- Main Profile Screen ---
const Profile: React.FC = () => { // Removed Props type if not needed
  // Use appropriate navigation type based on your setup (React Navigation or Expo Router)
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  // const router = useRouter(); // Uncomment if using Expo Router

  const [userData, setUserData] = useState({
    name: 'User',
    email: auth.currentUser?.email || 'No email',
    joinDate: 'Loading...',
    // These might come from your database later
    achievements: [
      { id: 1, title: 'First Login', completed: true },
      { id: 2, title: 'Complete Profile', completed: false },
      { id: 3, title: 'Play First Game', completed: true },
    ],
  });

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTimeLabel, setReminderTimeLabel] = useState<string | null>(null);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editHour, setEditHour] = useState(9);
  const [editMinute, setEditMinute] = useState(0);

  // Loading state for initial profile fetch
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Use useFocusEffect from React Navigation or Expo Router
  useFocusEffect(
    useCallback(() => {
      setLoadingProfile(true); // Start loading when screen focuses
      const user = auth.currentUser;
      if (user) {
        const joinDate = user.metadata.creationTime
          ? new Date(user.metadata.creationTime).toLocaleDateString()
          : 'Unknown';

        setUserData(prev => ({
          ...prev,
          email: user.email || 'No email',
          name: user.displayName || 'User',
          joinDate
        }));

        (async () => {
          const scheduled = await isDailyReminderScheduled();
          setReminderEnabled(!!scheduled);
          if (scheduled) {
            const time = await getDailyReminderTime(); // Ensure getDailyReminderTime is exported
            if (time) {
              setEditHour(time.hour);
              setEditMinute(time.minute);
              const hh = ((time.hour + 11) % 12) + 1;
              const mm = time.minute.toString().padStart(2, '0');
              const ampm = time.hour >= 12 ? 'PM' : 'AM';
              setReminderTimeLabel(`Daily at ${hh}:${mm} ${ampm}`);
            }
          }
           setLoadingProfile(false); // Stop loading after fetching user data and reminder status
        })();
      } else {
        // Redirect if no user
        navigation.navigate("LogInPage"); // Use navigate for React Nav
        // router.replace('/logIn-page'); // Use replace for Expo Router
         setLoadingProfile(false); // Stop loading if redirecting
      }
    }, [navigation]) // Add navigation/router dependency
  );


  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        Alert.alert('Success', 'You have been signed out');
        navigation.navigate("LogInPage"); // Use navigate for React Nav
        // router.replace('/logIn-page'); // Use replace for Expo Router
      })
      .catch(error => {
        Alert.alert('Error', error.message);
      });
  };

  const handleEditProfile = () => {
    // Navigate based on your setup
    navigation.navigate("EditProfilePage"); // Example for React Nav
    // router.push('/edit-profile'); // Example for Expo Router
  };

  const handleGames = () => {
    // Navigate based on your setup
    navigation.navigate("GamePage"); // Example for React Nav
    // router.push('/game-page'); // Example for Expo Router
  };

  // --- Navigate to Chart Page ---
  const handleViewChart = () => {
      // *** IMPORTANT: Make sure "ProgressChart" is the correct name ***
      // *** You defined in your Stack Navigator or equivalent routing setup ***
      navigation.navigate("ProgressChart");
      // router.push('/ProgressChart'); // If using Expo Router file-based routing
  };

   if (loadingProfile) {
    return (
      <ImageBackground
        source={require('../assets/images/app-background.png')} // Make sure path is correct
        style={[styles.image, styles.loadingContainer]}>
         <ActivityIndicator size="large" color="#fff"/>
         <Text style={styles.loadingText}>Loading Profile...</Text>
      </ImageBackground>
    );
  }


  return (
    <ImageBackground
      source={require('../assets/images/app-background.png')} // Make sure path is correct
      style={styles.image}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Image
            source={{ uri: 'https://placehold.co/150x150/a2d2ff/333?text=User' }}
            style={styles.profileImage}
          />
          <Text style={styles.name}>{userData.name}</Text>
          <Text style={styles.email}>{userData.email}</Text>
          <Text style={styles.joinDate}>Member since {userData.joinDate}</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Lessons</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>85%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>3</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          {userData.achievements.map(achievement => (
            <View key={achievement.id} style={styles.achievementItem}>
              <View style={[styles.achievementStatus, achievement.completed ? styles.completed : styles.incomplete]} />
              <Text style={styles.achievementTitle}>{achievement.title}</Text>
            </View>
          ))}
        </View>
      
        <View style={styles.section}>
             <TouchableOpacity style={styles.chartButton} onPress={handleViewChart}>
                <Text style={styles.chartButtonText}>View Progress Chart</Text>
            </TouchableOpacity>
        </View>


        

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Games</Text>
          <TouchableOpacity
            style={styles.gamesButton}
            onPress={handleGames}
          >
            <Text style={styles.gamesButtonText}>Play Games</Text>
          </TouchableOpacity>
        </View>

         <View style={[styles.section, styles.reminderSection]}>
            <View style={styles.reminderHeader}>
                <Text style={styles.sectionTitle}>Daily Reminder</Text>
                <Switch
                    trackColor={{ false: "#767577", true: "#81b0ff" }}
                    thumbColor={reminderEnabled ? "#f5dd4b" : "#f4f3f4"}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={async (value) => {
                    setReminderEnabled(value);
                    if (value) {
                        const id = await scheduleDailyReminder(editHour, editMinute); // Use saved/edited time
                        if (id) {
                         // Optional: Notify user
                         // await scheduleLocalNotification('Reminder enabled', `You will receive daily reminders at ${reminderTimeLabel || 'the set time'}`);
                         const hh = ((editHour + 11) % 12) + 1;
                         const mm = editMinute.toString().padStart(2, '0');
                         const ampm = editHour >= 12 ? 'PM' : 'AM';
                         setReminderTimeLabel(`Daily at ${hh}:${mm} ${ampm}`);
                        }
                    } else {
                        await cancelDailyReminder();
                        // Optional: Notify user
                        // await scheduleLocalNotification('Reminder disabled', 'You will no longer receive daily reminders');
                        setReminderTimeLabel(null);
                        setIsEditingTime(false); // Hide editor if disabled
                    }
                    }}
                    value={reminderEnabled}
                />
            </View>
             {reminderEnabled && !isEditingTime && reminderTimeLabel && (
                <View style={styles.reminderTimeContainer}>
                    <Text style={styles.reminderLabel}>{reminderTimeLabel}</Text>
                    <TouchableOpacity style={styles.editTimeButton} onPress={() => setIsEditingTime(true)}>
                        <Text style={styles.editTimeButtonText}>Edit Time</Text>
                    </TouchableOpacity>
                </View>
             )}

            {reminderEnabled && isEditingTime && (
              <View style={styles.timeEditor}>
                 <Text style={styles.editingTimeLabel}>
                    Editing: {(((editHour + 11) % 12) + 1).toString().padStart(2, '0')}:{editMinute.toString().padStart(2, '0')} {editHour >= 12 ? 'PM' : 'AM'}
                  </Text>
                  <View style={styles.timeAdjustRow}>
                    <TouchableOpacity onPress={() => setEditHour(h => (h + 23) % 24)} style={[styles.smallButton]}>
                      <Text style={styles.smallButtonText}>H-</Text>
                    </TouchableOpacity>
                    <Text style={styles.timeValue}>{editHour.toString().padStart(2, '0')}</Text>
                    <TouchableOpacity onPress={() => setEditHour(h => (h + 1) % 24)} style={[styles.smallButton]}>
                      <Text style={styles.smallButtonText}>H+</Text>
                    </TouchableOpacity>

                    <View style={{ width: wp('4%') }} />

                    <TouchableOpacity onPress={() => setEditMinute(m => (m + 59) % 60)} style={[styles.smallButton]}>
                      <Text style={styles.smallButtonText}>M-</Text>
                    </TouchableOpacity>
                     <Text style={styles.timeValue}>{editMinute.toString().padStart(2, '0')}</Text>
                    <TouchableOpacity onPress={() => setEditMinute(m => (m + 1) % 60)} style={[styles.smallButton]}>
                      <Text style={styles.smallButtonText}>M+</Text>
                    </TouchableOpacity>
                  </View>

                <View style={styles.editorButtons}>
                  <TouchableOpacity
                    style={[styles.smallActionButton, { backgroundColor: '#4CD964' }]} // Green Save
                    onPress={async () => {
                      await cancelDailyReminder(); // Cancel old one first
                      const id = await scheduleDailyReminder(editHour, editMinute);
                      if (id) {
                        const hh = ((editHour + 11) % 12) + 1;
                        const mm = editMinute.toString().padStart(2, '0');
                        const ampm = editHour >= 12 ? 'PM' : 'AM';
                        setReminderTimeLabel(`Daily at ${hh}:${mm} ${ampm}`);
                        // Optional: Notify user
                        // await scheduleLocalNotification('Reminder Updated', `Daily reminder set for ${hh}:${mm} ${ampm}`);
                      } else {
                          // Handle error - maybe revert state?
                          Alert.alert("Error", "Could not save reminder time.");
                          setReminderEnabled(false); // Turn off if saving failed
                          setReminderTimeLabel(null);
                      }
                      setIsEditingTime(false);
                    }}
                  >
                    <Text style={styles.smallActionText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.smallActionButton, { backgroundColor: '#FF3B30' }]} onPress={() => { setIsEditingTime(false); }}>
                    <Text style={styles.smallActionText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {/* Dev Test Button */}
            {__DEV__ && (
              <TouchableOpacity
                style={[styles.testButton]}
                onPress={async () => {
                  try {
                    const id = await scheduleLocalNotification('Test Notification', 'This should appear in ~5s', 5);
                    console.log('Scheduled test notification id:', id);
                  } catch (e) {
                    console.error('Failed to schedule test notification:', e);
                  }
                }}
              >
                <Text style={styles.testButtonText}>Send test notification (5s)</Text>
              </TouchableOpacity>
            )}
        </View>


        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleEditProfile}>
            <Text style={styles.actionButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.signOutButton]} onPress={handleSignOut}>
            <Text style={styles.actionButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  image: {
    flex: 1,
  },
  loadingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
  },
  loadingText: {
      marginTop: hp('2%'),
      fontSize: wp('5%'),
      fontFamily: 'FredokaOne-Regular',
      color: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: hp('5%'),
  },
  header: {
    alignItems: 'center',
    paddingVertical: hp('3%'),
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#000',
    width: wp('90%'),
    marginTop: hp('5%'),
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
    elevation: 5,
  },
  profileImage: {
    width: PixelRatio.roundToNearestPixel(120),
    height: PixelRatio.roundToNearestPixel(120),
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#000',
    marginBottom: hp('1.5%'),
    backgroundColor: '#ccc',
  },
  name: {
    fontSize: wp('7%'),
    fontFamily: 'FredokaOne-Regular',
    color: '#1E1E1E',
    marginBottom: hp('0.5%'),
  },
  email: {
    fontSize: wp('4%'),
    fontFamily: 'FredokaOne-Regular',
    color: '#0A0A0A',
    marginBottom: hp('0.5%'),
  },
  joinDate: {
    fontSize: wp('3.5%'),
    fontFamily: 'FredokaOne-Regular',
    color: '#555',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: hp('2%'),
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#000',
    width: wp('90%'),
    marginTop: hp('2%'),
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
    elevation: 5,
  },
  statBox: {
    alignItems: 'center',
    paddingHorizontal: wp('4%'),
  },
  statNumber: {
    fontSize: wp('7%'),
    fontFamily: 'FredokaOne-Regular',
    color: '#1E1E1E',
  },
  statLabel: {
    fontSize: wp('4%'),
    fontFamily: 'FredokaOne-Regular',
    color: '#0A0A0A',
    marginTop: hp('0.5%'),
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#000',
    padding: wp('4%'),
    width: wp('90%'),
    marginTop: hp('2%'),
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
    elevation: 5,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: wp('5.5%'),
    fontFamily: 'FredokaOne-Regular',
    marginBottom: hp('1.5%'),
    color: '#1E1E1E',
    textAlign: 'center',
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp('1%'),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    width: '100%',
  },
  achievementStatus: {
    width: wp('4%'),
    height: wp('4%'),
    borderRadius: wp('2%'),
    marginRight: wp('3%'),
    borderWidth: 1,
    borderColor: '#555',
  },
  completed: {
    backgroundColor: '#4CD964',
  },
  incomplete: {
    backgroundColor: '#D9D9D9',
  },
  achievementTitle: {
    fontSize: wp('4.2%'),
    fontFamily: 'FredokaOne-Regular',
    color: '#0A0A0A',
  },
  gamesButton: {
    width: wp('80%'),
    height: hp('8%'),
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: '#A2D2FF',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 3,
    elevation: 4,
    marginTop: hp('1%'),
  },
  gamesButtonText: {
    color: '#1E1E1E',
    fontSize: wp('6%'),
    fontFamily: 'FredokaOne-Regular',
  },
   reminderSection: {
     paddingBottom: hp('2%'),
   },
   reminderHeader: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     marginBottom: hp('1%'),
     paddingHorizontal: wp('2%'),
     width: '100%',
   },
  reminderTimeContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: hp('1%'),
      paddingHorizontal: wp('2%'),
      width: '100%',
  },
  reminderLabel: {
    fontSize: wp('4%'),
    fontFamily: 'FredokaOne-Regular',
    color: '#1E1E1E',
  },
  editTimeButton: {
      backgroundColor: '#f0f0f0',
      paddingVertical: hp('0.8%'),
      paddingHorizontal: wp('3%'),
      borderRadius: 15,
      borderWidth: 1,
      borderColor: '#ccc',
  },
  editTimeButtonText: {
      fontSize: wp('3.5%'),
      color: '#333',
      fontFamily: 'FredokaOne-Regular',
  },
  timeEditor: {
      marginTop: hp('1.5%'),
      alignItems: 'center',
      padding: wp('3%'),
      backgroundColor: '#f8f9fa',
      borderRadius: 15,
      borderWidth: 1,
      borderColor: '#dee2e6',
      width: '100%',
  },
  editingTimeLabel: {
      fontSize: wp('4.5%'),
      fontFamily: 'FredokaOne-Regular',
      marginBottom: hp('1.5%'),
      color: '#495057'
  },
  timeAdjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp('2%'),
    width: '100%',
  },
  timeValue: {
     fontSize: wp('5%'),
     fontFamily: 'FredokaOne-Regular',
     marginHorizontal: wp('3%'),
     color: '#212529',
     minWidth: wp('12%'),
     textAlign: 'center',
  },
  smallButton: {
    width: wp('12%'),
    height: hp('5%'),
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#adb5bd',
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallButtonText: {
    color: '#495057',
    fontSize: wp('4.5%'),
    fontFamily: 'FredokaOne-Regular',
    fontWeight: 'bold',
  },
  editorButtons: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '80%',
      marginTop: hp('1%'),
  },
   smallActionButton: {
     paddingVertical: hp('1%'),
     paddingHorizontal: wp('6%'),
     borderRadius: 20,
     elevation: 2,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 1 },
     shadowOpacity: 0.2,
     shadowRadius: 1,
   },
   smallActionText: {
      color: '#fff',
      fontSize: wp('4%'),
      fontFamily: 'FredokaOne-Regular',
      fontWeight: 'bold',
   },
  testButton: {
    backgroundColor: '#6c757d',
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('4%'),
    borderRadius: 15,
    marginTop: hp('2%'),
    alignSelf: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: wp('3.5%'),
    fontFamily: 'FredokaOne-Regular',
  },
   bottomButtonContainer: {
     width: wp('90%'),
     alignItems: 'center',
     marginTop: hp('2%'),
     marginBottom: hp('3%'),
   },
   actionButton: {
     width: wp('70%'),
     height: hp('7%'),
     borderRadius: 30,
     borderWidth: 3,
     borderColor: '#000',
     backgroundColor: '#007AFF',
     justifyContent: 'center',
     alignItems: 'center',
     marginBottom: hp('2%'),
     shadowColor: '#000',
     shadowOpacity: 0.2,
     shadowOffset: { width: 0, height: 4 },
     shadowRadius: 4,
     elevation: 5,
   },
   signOutButton: {
     backgroundColor: '#FF3B30',
   },
   actionButtonText: {
     color: '#fff',
     fontSize: wp('5%'),
     fontFamily: 'FredokaOne-Regular',
   },
   chartButton: {
      width: wp('80%'),
      height: hp('8%'),
      borderRadius: 25,
      borderWidth: 3,
      borderColor: '#000',
      backgroundColor: '#5bc0de',
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowOffset: { width: 0, height: 3 },
      shadowRadius: 3,
      elevation: 4,
      marginTop: hp('1%'),
   },
   chartButtonText: {
      color: '#fff',
      fontSize: wp('5.5%'),
      fontFamily: 'FredokaOne-Regular',
   },
});

export default Profile;