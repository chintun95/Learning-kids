import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  PixelRatio,
  ImageBackground
} from 'react-native';
import { auth } from '../firebase'; 
import { signOut } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { scheduleLocalNotification, scheduleDailyReminder, cancelDailyReminder, isDailyReminderScheduled } from './utils/notifications';
import { Switch } from 'react-native';

type ProfileScreenProps = {
  route: any;
};

const Profile: React.FC<ProfileScreenProps> = ({ route }) => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [userData, setUserData] = useState({
    name: 'User',
    email: auth.currentUser?.email || 'No email',
    joinDate: 'Loading...',
    achievements: [
      { id: 1, title: 'First Login', completed: true },
      { id: 2, title: 'Complete Profile', completed: false },
      { id: 3, title: 'Play First Game', completed: true },
    ],
    recentActivities: [
      { id: 1, title: 'Math Challenge', date: '2 days ago' },
      { id: 2, title: 'Spelling Quiz', date: '5 days ago' },
      { id: 3, title: 'Science Experiment', date: '1 week ago' },
    ]
  });

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTimeLabel, setReminderTimeLabel] = useState<string | null>(null);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editHour, setEditHour] = useState(9);
  const [editMinute, setEditMinute] = useState(0);

  useEffect(() => {
    if (auth.currentUser) {
      const user = auth.currentUser;
      const joinDate = user.metadata.creationTime 
        ? new Date(user.metadata.creationTime).toLocaleDateString() 
        : 'Unknown';
      
      setUserData(prev => ({
        ...prev,
        email: user.email || 'No email',
        name: user.displayName || 'User',
        joinDate
      }));
    }

 
    (async () => {
      const scheduled = await isDailyReminderScheduled();
      setReminderEnabled(!!scheduled);
      if (scheduled) {
        const time = await (await import("./utils/notifications")).getDailyReminderTime();
        if (time) {
          setEditHour(time.hour);
          setEditMinute(time.minute);
          const hh = ((time.hour + 11) % 12) + 1; 
          const mm = time.minute.toString().padStart(2, '0');
          const ampm = time.hour >= 12 ? 'PM' : 'AM';
          setReminderTimeLabel(`Daily at ${hh}:${mm} ${ampm}`);
        }
      }
    })();
  }, []);

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        Alert.alert('Success', 'You have been signed out');
        navigation.navigate("LogInPage");
      })
      .catch(error => {
        Alert.alert('Error', error.message);
      });
  };

  const handleEditProfile = () => {
    navigation.navigate("EditProfilePage");
  };
  
  const handleApproval = () => {
    navigation.navigate("ApprovalScreen");
  };

  const handleGames = () => {
    navigation.navigate("GamePage");
  };

  return (
    <ImageBackground 
      source={require('../assets/images/app-background.png')}
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
          <Text style={styles.sectionTitle}>Games</Text>
          <TouchableOpacity 
            style={styles.gamesButton} 
            onPress={handleGames}
          >
            <Text style={styles.gamesButtonText}>Play Games</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Text style={styles.buttonText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>

            <View style={{ marginTop: hp('2%'), alignItems: 'center' }}>
              <Text style={[styles.sectionTitle, { marginBottom: hp('1%') }]}>Daily Reminder</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Switch
                  value={reminderEnabled}
                  onValueChange={async (value) => {
                    setReminderEnabled(value);
                    if (value) {
                      const id = await scheduleDailyReminder(9, 0);
                      if (id) {
                        await scheduleLocalNotification('Reminder enabled', 'You will receive daily reminders at 9:00 AM');
                        setReminderTimeLabel('Daily at 9:00 AM');
                      }
                    } else {
                      await cancelDailyReminder();
                      await scheduleLocalNotification('Reminder disabled', 'You will no longer receive daily reminders');
                      setReminderTimeLabel(null);
                    }
                  }}
                />
              </View>
            </View>
            {reminderTimeLabel ? <Text style={[{ marginTop: hp('1%') }, styles.reminderLabel]}>{reminderTimeLabel}</Text> : null}
            {/* Development-only test button to quickly verify notifications */}
            {__DEV__ ? (
              <TouchableOpacity
                style={[styles.editButton, { marginTop: hp('1%') }]}
                onPress={async () => {
                  try {
                    const id = await scheduleLocalNotification('Test Notification', 'This should appear in ~5s', 5);
                    console.log('Scheduled test notification id:', id);
                  } catch (e) {
                    console.error('Failed to schedule test notification:', e);
                  }
                }}
              >
                <Text style={styles.buttonText}>Send test notification (5s)</Text>
              </TouchableOpacity>
            ) : null}
            {!isEditingTime ? (
              <TouchableOpacity style={[styles.editButton, { marginTop: hp('1%') }]} onPress={() => setIsEditingTime(true)}>
                <Text style={styles.buttonText}>Edit Time</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ marginTop: hp('1%'), alignItems: 'center' }}>
                <View style={{ alignItems: 'center', marginBottom: hp('1%') }}>
                  {/* live preview so user immediately sees the selected time */}
                  <Text style={{ fontSize: wp('5%'), marginBottom: hp('0.5%') }}>
                    Editing: {(((editHour + 11) % 12) + 1).toString().padStart(2, '0')}:{editMinute.toString().padStart(2, '0')} {editHour >= 12 ? 'PM' : 'AM'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setEditHour(h => (h + 23) % 24)} style={[styles.smallButton, { marginRight: 6 }]}>
                      <Text style={styles.smallButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: wp('5%'), marginHorizontal: wp('3%') }}>{editHour.toString().padStart(2, '0')}</Text>
                    <TouchableOpacity onPress={() => setEditHour(h => (h + 1) % 24)} style={[styles.smallButton, { marginLeft: 6 }]}>
                      <Text style={styles.smallButtonText}>+</Text>
                    </TouchableOpacity>

                    <View style={{ width: wp('6%') }} />

                    <TouchableOpacity onPress={() => setEditMinute(m => (m + 59) % 60)} style={[styles.smallButton, { marginRight: 6 }]}>
                      <Text style={styles.smallButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: wp('5%'), marginHorizontal: wp('3%') }}>{editMinute.toString().padStart(2, '0')}</Text>
                    <TouchableOpacity onPress={() => setEditMinute(m => (m + 1) % 60)} style={[styles.smallButton, { marginLeft: 6 }]}>
                      <Text style={styles.smallButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity
                    style={[styles.editButton, { marginRight: wp('3%') }]}
                    onPress={async () => {
                      // Save new time: if already enabled, cancel then reschedule with new time
                      if (reminderEnabled) {
                        await cancelDailyReminder();
                      }
                      const id = await scheduleDailyReminder(editHour, editMinute);
                      if (id) {
                        setReminderEnabled(true);
                        const hh = ((editHour + 11) % 12) + 1;
                        const mm = editMinute.toString().padStart(2, '0');
                        const ampm = editHour >= 12 ? 'PM' : 'AM';
                        setReminderTimeLabel(`Daily at ${hh}:${mm} ${ampm}`);
                        await scheduleLocalNotification('Reminder set', `Daily reminder set for ${hh}:${mm} ${ampm}`);
                      }
                      setIsEditingTime(false);
                    }}
                  >
                    <Text style={styles.buttonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.signOutButton} onPress={() => { setIsEditingTime(false); }}>
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
        </View>
      </ScrollView>
    </ImageBackground>
  );
};

const BOX_WIDTH = PixelRatio.roundToNearestPixel(332);
const BOX_HEIGHT = PixelRatio.roundToNearestPixel(50);

const styles = StyleSheet.create({
  image: {
    width: wp('100%'),
    height: hp('100%'),
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: hp('3%'),
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
    shadowOffset: { width: 2, height: 4 },
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
    color: '#0A0A0A',
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
    shadowOffset: { width: 2, height: 4 },
    shadowRadius: 4,
    elevation: 5,
  },
  statBox: {
    alignItems: 'center',
    paddingHorizontal: wp('5%'),
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
    shadowOffset: { width: 2, height: 4 },
    shadowRadius: 4,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: wp('5.5%'),
    fontFamily: 'FredokaOne-Regular',
    marginBottom: hp('1.5%'),
    color: '#1E1E1E',
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp('1%'),
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
  },
  achievementStatus: {
    width: wp('4%'),
    height: wp('4%'),
    borderRadius: wp('2%'),
    marginRight: wp('2.5%'),
    borderWidth: 1,
    borderColor: '#000',
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
    height: hp('10%'),
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
  gamesButtonText: {
    color: '#000',
    fontSize: wp('7%'),
    fontFamily: 'FredokaOne-Regular',
  },
  buttonContainer: {
    width: wp('90%'),
    alignItems: 'center',
    marginTop: hp('2%'),
    marginBottom: hp('3%'),
  },
  editButton: {
    width: wp('70%'),
    height: hp('7%'),
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: '#D9D9D9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp('2%'),
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 2, height: 4 },
    shadowRadius: 4,
    elevation: 5,
  },
  signOutButton: {
    width: wp('70%'),
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
    fontSize: wp('5%'),
    fontFamily: 'FredokaOne-Regular',
  },
  smallButton: {
    width: wp('10%'),
    height: hp('5%'),
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#D9D9D9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallButtonText: {
    color: '#000',
    fontSize: wp('4%'),
    fontFamily: 'FredokaOne-Regular',
  },
  reminderLabel: {
    fontSize: wp('4%'),
    fontFamily: 'FredokaOne-Regular',
    color: '#1E1E1E',
  },
});

export default Profile;
