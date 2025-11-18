// app/profile.tsx

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
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase';
import { 
  signOut,
  updateProfile
} from 'firebase/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import {
  scheduleLocalNotification,
  scheduleDailyReminder,
  cancelDailyReminder,
  isDailyReminderScheduled,
  getDailyReminderTime,
} from './utils/notifications';

import { supabase } from '../backend/supabase';
import { ACHIEVEMENT_CODES } from './utils/achievements';

interface AchievementDisplay {
  key: string;
  title: string;
  completed: boolean;
}

// Helper to map achievement keys to display titles
const getAchievementTitle = (key: string): string => {
  switch (key) {
    case ACHIEVEMENT_CODES.SIGN_UP: return "Welcome to Learning Kids! (Sign Up)";
    case ACHIEVEMENT_CODES.FIRST_GAME: return "First Game Played";
    case ACHIEVEMENT_CODES.THREE_CORRECT: return "Quiz Master I (3 Correct)";
    case ACHIEVEMENT_CODES.FIVE_CORRECT: return "Quiz Master II (5 Correct)";
    default: return key.replace(/_/g, ' ');
  }
};

const Profile: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [userData, setUserData] = useState({
    name: 'User',
    email: auth.currentUser?.email || 'No email',
    joinDate: 'Loading...',
    stats: {
      lessons: 0, // Used for "Correct Qs"
      accuracy: '0%',
      badges: 0,
    }
  });

  const [earnedAchievements, setEarnedAchievements] = useState<AchievementDisplay[]>([]);
  
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTimeLabel, setReminderTimeLabel] = useState<string | null>(null);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editHour, setEditHour] = useState(9);
  const [editMinute, setEditMinute] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  const predefinedAvatars = [
    require('../assets/profile-pictures/Gemini_Generated_Image_ls633als633als63 (1).png'),
    require('../assets/profile-pictures/Gemini_Generated_Image_kj41a5kj41a5kj41.png'),
    require('../assets/profile-pictures/Gemini_Generated_Image_crzg05crzg05crzg.png'),
    require('../assets/profile-pictures/Gemini_Generated_Image_c6ow26c6ow26c6ow.png'),
    require('../assets/profile-pictures/Gemini_Generated_Image_v5ohovv5ohovv5oh.png'),
    require('../assets/profile-pictures/Gemini_Generated_Image_ls633als633als63.png'),
    require('../assets/profile-pictures/Gemini_Generated_Image_ohdroyohdroyohdr.png'),
    require('../assets/profile-pictures/Gemini_Generated_Image_p6j0hbp6j0hbp6j0.png'),
    require('../assets/profile-pictures/Gemini_Generated_Image_ls633als633als63 (4).png'),
    require('../assets/profile-pictures/Gemini_Generated_Image_ls633als633als63 (3).png'),
    require('../assets/profile-pictures/Gemini_Generated_Image_ls633als633als63 (2).png'),
    require('../assets/profile-pictures/Gemini_Generated_Image_kj41a5kj41a5kj41 (1).png'),
  ];

  // --- FETCH ACHIEVEMENTS ---
  const fetchUserAchievements = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('user_achievements') 
        .select('achievement_key') 
        .eq('user_id', uid);

      if (error) throw error;

      if (data) {
        const achievedKeys = data.map(item => item.achievement_key);
        const allAchievements = Object.values(ACHIEVEMENT_CODES);

        const displayAchievements: AchievementDisplay[] = allAchievements.map(key => ({
            key,
            title: getAchievementTitle(key),
            completed: achievedKeys.includes(key),
        }));

        setEarnedAchievements(displayAchievements);
        
        setUserData(prev => ({
          ...prev,
          stats: {
            ...prev.stats,
            badges: achievedKeys.length, // Update badge count
          }
        }));
      }
    } catch (e: any) {
      console.error('Error fetching achievements:', e.message || e);
    }
  }, []);

  // --- FETCH STATS (FIXED) ---
  const fetchStats = useCallback(async (uid: string) => {
    try {
        // Fetch correct answers AND total questions
        const { data, error } = await supabase
            .from('user_stats')
            .select('correct_answers, total_questions_answered')
            .eq('user_id', uid)
            .maybeSingle();
        
        if (error && error.code !== 'PGRST116') throw error;

        const correct = data?.correct_answers || 0;
        const total = data?.total_questions_answered || 0;
        
        // Calculate Accuracy
        const accuracyVal = total > 0 ? Math.round((correct / total) * 100) : 0;

        setUserData(prev => ({
          ...prev,
          stats: {
            ...prev.stats,
            lessons: correct, // Map "Correct Qs" to correct_answers
            accuracy: `${accuracyVal}%`,
          }
        }));

    } catch (e) {
        console.error('Error fetching stats:', e);
    }
  }, []);
  
  useFocusEffect(
    useCallback(() => {
      setLoadingProfile(true);

      const user = auth.currentUser;
      if (user) {
        const uid = user.uid;
        const joinDate = user.metadata.creationTime
          ? new Date(user.metadata.creationTime).toLocaleDateString()
          : 'Unknown';

        setUserData(prev => ({
          ...prev,
          email: user.email || 'No email',
          name: user.displayName || 'User',
          joinDate,
        }));

        if (user.photoURL) {
          setProfileImageUri(user.photoURL);
        }

        (async () => {
          await Promise.all([
            fetchUserAchievements(uid),
            fetchStats(uid)
          ]);

          const scheduled = await isDailyReminderScheduled();
          setReminderEnabled(!!scheduled);
          if (scheduled) {
            const time = await getDailyReminderTime();
            if (time) {
              setEditHour(time.hour);
              setEditMinute(time.minute);
              const hh = ((time.hour + 11) % 12) + 1;
              const mm = time.minute.toString().padStart(2, '0');
              const ampm = time.hour >= 12 ? 'PM' : 'AM';
              setReminderTimeLabel(`Daily at ${hh}:${mm} ${ampm}`);
            }
          }
          setLoadingProfile(false);
        })();
      } else {
        navigation.navigate('LogInPage');
        setLoadingProfile(false);
      }
    }, [navigation, fetchUserAchievements, fetchStats])
  );

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        Alert.alert('Success', 'You have been signed out');
        navigation.navigate('LogInPage');
      })
      .catch(error => {
        Alert.alert('Error', error.message);
      });
  };

  const handleEditProfile = () => navigation.navigate('EditProfilePage');
  const handleGames = () => navigation.navigate('ChildSelectScreen');
  const handleViewChart = () => navigation.navigate('ProgressChart');

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload a profile picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        const imageUri = result.assets[0].uri;
        try {
          const user = auth.currentUser;
          if (user) {
            await updateProfile(user, { photoURL: imageUri });
            setProfileImageUri(imageUri);
            Alert.alert('Success', 'Profile picture updated successfully!');
          }
        } catch (error) {
          Alert.alert('Error', 'Failed to update profile picture.');
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image.');
      setUploadingImage(false);
    }
  };

  const handleSelectPredefinedAvatar = async (avatarSource: any) => {
    try {
      setUploadingImage(true);
      const user = auth.currentUser;
      if (user) {
        const avatarIndex = predefinedAvatars.indexOf(avatarSource);
        await updateProfile(user, { photoURL: `local_avatar_${avatarIndex}` });
        setProfileImageUri(`local_avatar_${avatarIndex}`);
        setShowAvatarModal(false);
        Alert.alert('Success', 'Profile picture updated successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile picture.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleOpenPinModal = () => {
    setShowPinModal(true);
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setPinError('');
  };

  const handleChangePin = async () => {
    setPinError('');
    const storedPin = await AsyncStorage.getItem('parentPin');
    const validPin = storedPin || '1234';

    if (currentPin !== validPin) { setPinError('Current PIN is incorrect'); return; }
    if (newPin.length !== 4) { setPinError('New PIN must be 4 digits'); return; }
    if (!/^\d{4}$/.test(newPin)) { setPinError('PIN must contain only numbers'); return; }
    if (newPin !== confirmPin) { setPinError('New PINs do not match'); return; }

    try {
      await AsyncStorage.setItem('parentPin', newPin);
      Alert.alert('Success', 'PIN changed successfully!');
      setShowPinModal(false);
      setCurrentPin(''); setNewPin(''); setConfirmPin('');
    } catch (error) {
      setPinError('Failed to save PIN.');
    }
  };

  if (loadingProfile) {
    return (
      <ImageBackground
        source={require('../assets/images/app-background.png')}
        style={[styles.image, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../assets/images/app-background.png')}
      style={styles.image}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            <Image
              source={
                profileImageUri
                  ? profileImageUri.startsWith('local_avatar_')
                    ? predefinedAvatars[parseInt(profileImageUri.replace('local_avatar_', ''))]
                    : { uri: profileImageUri }
                  : { uri: 'https://placehold.co/150x150/a2d2ff/333?text=User' }
              }
              style={styles.profileImage}
            />
            <TouchableOpacity style={styles.editImageButton} onPress={handlePickImage} disabled={uploadingImage}>
              {uploadingImage ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.editImageIcon}>📷</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatarSelectorButton} onPress={() => setShowAvatarModal(true)} disabled={uploadingImage}>
              <Text style={styles.editImageIcon}>🎨</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>{userData.name}</Text>
          <Text style={styles.email}>{userData.email}</Text>
          <Text style={styles.joinDate}>Member since {userData.joinDate}</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{userData.stats.lessons}</Text>
            <Text style={styles.statLabel}>Correct Qs</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{userData.stats.accuracy}</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{userData.stats.badges}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          {earnedAchievements.length > 0 ? (
            earnedAchievements.map(achievement => (
              <View key={achievement.key} style={styles.achievementItem}>
                <View style={[styles.achievementStatus, achievement.completed ? styles.completed : styles.incomplete]}>
                   {achievement.completed && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.achievementTitle}>No achievements earned yet.</Text>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.chartButton} onPress={handleViewChart}>
            <Text style={styles.chartButtonText}>View Progress Chart</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pick a child</Text>
          <TouchableOpacity style={styles.gamesButton} onPress={handleGames}>
            <Text style={styles.gamesButtonText}>Select Child</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, styles.reminderSection]}>
          <View style={styles.reminderHeader}>
            <Text style={styles.sectionTitle}>Daily Reminder</Text>
            <Switch
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={reminderEnabled ? '#f5dd4b' : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              onValueChange={async value => {
                setReminderEnabled(value);
                if (value) {
                  const id = await scheduleDailyReminder(editHour, editMinute);
                  if (id) {
                    const hh = ((editHour + 11) % 12) + 1;
                    const mm = editMinute.toString().padStart(2, '0');
                    const ampm = editHour >= 12 ? 'PM' : 'AM';
                    setReminderTimeLabel(`Daily at ${hh}:${mm} ${ampm}`);
                  }
                } else {
                  await cancelDailyReminder();
                  setReminderTimeLabel(null);
                  setIsEditingTime(false);
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
                <TouchableOpacity onPress={() => setEditHour(h => (h + 23) % 24)} style={styles.smallButton}><Text style={styles.smallButtonText}>H-</Text></TouchableOpacity>
                <Text style={styles.timeValue}>{editHour.toString().padStart(2, '0')}</Text>
                <TouchableOpacity onPress={() => setEditHour(h => (h + 1) % 24)} style={styles.smallButton}><Text style={styles.smallButtonText}>H+</Text></TouchableOpacity>
                <View style={{ width: wp('4%') }} />
                <TouchableOpacity onPress={() => setEditMinute(m => (m + 59) % 60)} style={styles.smallButton}><Text style={styles.smallButtonText}>M-</Text></TouchableOpacity>
                <Text style={styles.timeValue}>{editMinute.toString().padStart(2, '0')}</Text>
                <TouchableOpacity onPress={() => setEditMinute(m => (m + 1) % 60)} style={styles.smallButton}><Text style={styles.smallButtonText}>M+</Text></TouchableOpacity>
              </View>
              <View style={styles.editorButtons}>
                <TouchableOpacity
                  style={[styles.smallActionButton, { backgroundColor: '#4CD964' }]}
                  onPress={async () => {
                    await cancelDailyReminder();
                    const id = await scheduleDailyReminder(editHour, editMinute);
                    if (id) {
                      const hh = ((editHour + 11) % 12) + 1;
                      const mm = editMinute.toString().padStart(2, '0');
                      const ampm = editHour >= 12 ? 'PM' : 'AM';
                      setReminderTimeLabel(`Daily at ${hh}:${mm} ${ampm}`);
                    }
                    setIsEditingTime(false);
                  }}>
                  <Text style={styles.smallActionText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallActionButton, { backgroundColor: '#FF3B30' }]}
                  onPress={() => setIsEditingTime(false)}>
                  <Text style={styles.smallActionText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleEditProfile}><Text style={styles.actionButtonText}>Info & Questions</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#34A853' }]} onPress={() => navigation.navigate('AddChildScreen')}><Text style={styles.actionButtonText}>+ Add Child</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#FF9500' }]} onPress={handleOpenPinModal}><Text style={styles.actionButtonText}>🔒 Change PIN</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.signOutButton]} onPress={handleSignOut}><Text style={styles.actionButtonText}>Sign Out</Text></TouchableOpacity>
        </View>

      </ScrollView>

      <Modal visible={showAvatarModal} animationType="slide" transparent onRequestClose={() => setShowAvatarModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.avatarModal}>
            <View style={styles.avatarModalHeader}>
              <Text style={styles.avatarModalTitle}>Choose an Avatar</Text>
              <TouchableOpacity onPress={() => setShowAvatarModal(false)} style={styles.closeModalButton}><Text style={styles.closeModalText}>✕</Text></TouchableOpacity>
            </View>
            <FlatList data={predefinedAvatars} keyExtractor={(item, index) => index.toString()} numColumns={3} contentContainerStyle={styles.avatarGrid} renderItem={({ item }) => (
                <TouchableOpacity style={styles.avatarOption} onPress={() => handleSelectPredefinedAvatar(item)}><Image source={item} style={styles.avatarImage} /></TouchableOpacity>
            )} />
          </View>
        </View>
      </Modal>

      <Modal visible={showPinModal} animationType="fade" transparent onRequestClose={() => setShowPinModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.pinChangeModal}>
            <Text style={styles.pinChangeTitle}>🔒 Change PIN</Text>
            <Text style={styles.pinChangeSubtitle}>Update your parental control PIN</Text>
            {pinError ? <Text style={styles.pinErrorText}>{pinError}</Text> : null}
            <View style={styles.pinInputContainer}><Text style={styles.pinInputLabel}>Current PIN</Text><TextInput style={styles.pinChangeInput} value={currentPin} onChangeText={setCurrentPin} keyboardType="number-pad" secureTextEntry maxLength={4} placeholder="••••" placeholderTextColor="#ccc" /></View>
            <View style={styles.pinInputContainer}><Text style={styles.pinInputLabel}>New PIN</Text><TextInput style={styles.pinChangeInput} value={newPin} onChangeText={setNewPin} keyboardType="number-pad" secureTextEntry maxLength={4} placeholder="••••" placeholderTextColor="#ccc" /></View>
            <View style={styles.pinInputContainer}><Text style={styles.pinInputLabel}>Confirm New PIN</Text><TextInput style={styles.pinChangeInput} value={confirmPin} onChangeText={setConfirmPin} keyboardType="number-pad" secureTextEntry maxLength={4} placeholder="••••" placeholderTextColor="#ccc" /></View>
            <View style={styles.pinChangeButtons}>
              <TouchableOpacity style={[styles.pinChangeButton, styles.pinCancelButton]} onPress={() => setShowPinModal(false)}><Text style={styles.pinCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.pinChangeButton, styles.pinSubmitButton]} onPress={handleChangePin} disabled={!currentPin || !newPin || !confirmPin}><Text style={styles.pinSubmitText}>Save</Text></TouchableOpacity>
            </View>
            <Text style={styles.pinHintText}>Current default PIN is 1234 if not changed</Text>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  image: { flex: 1 },
  loadingContainer: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: hp('2%'), fontSize: wp('5%'), fontFamily: 'FredokaOne-Regular', color: '#fff' },
  scrollContainer: { flexGrow: 1, alignItems: 'center', paddingBottom: hp('5%') },
  header: { alignItems: 'center', paddingVertical: hp('3%'), backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: 30, borderWidth: 3, borderColor: '#000', width: wp('90%'), marginTop: hp('5%') },
  profileImageContainer: { position: 'relative', marginBottom: hp('1.5%'), width: wp('35%'), marginLeft: wp('5%') },
  profileImage: { width: PixelRatio.roundToNearestPixel(120), height: PixelRatio.roundToNearestPixel(120), borderRadius: 60, borderWidth: 3, borderColor: '#000' },
  editImageButton: { position: 'absolute', bottom: 0, left: wp('-10%'), backgroundColor: '#4A90E2', width: wp('10%'), height: wp('10%'), borderRadius: wp('5%'), justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  avatarSelectorButton: { position: 'absolute', bottom: 0, right: wp('-6%'), backgroundColor: '#FF6B9D', width: wp('10%'), height: wp('10%'), borderRadius: wp('5%'), justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  editImageIcon: { fontSize: wp('5%') },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  avatarModal: { backgroundColor: '#fff', borderRadius: 20, padding: wp('4%'), width: wp('90%'), maxHeight: hp('70%'), shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  avatarModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: hp('2%'), paddingBottom: hp('1%'), borderBottomWidth: 2, borderBottomColor: '#E0E0E0' },
  avatarModalTitle: { fontSize: wp('6%'), fontFamily: 'FredokaOne-Regular', color: '#1E1E1E' },
  closeModalButton: { padding: wp('2%') },
  closeModalText: { fontSize: wp('7%'), color: '#666', fontWeight: 'bold' },
  avatarGrid: { paddingVertical: hp('1%') },
  avatarOption: { width: wp('25%'), height: wp('25%'), margin: wp('1.5%'), borderRadius: wp('12.5%'), borderWidth: 3, borderColor: '#E0E0E0', overflow: 'hidden', backgroundColor: '#F5F5F5' },
  avatarImage: { width: '100%', height: '100%' },
  name: { fontSize: wp('7%'), fontFamily: 'FredokaOne-Regular', color: '#1E1E1E', marginBottom: hp('0.5%') },
  email: { fontSize: wp('4%'), fontFamily: 'FredokaOne-Regular', color: '#0A0A0A' },
  joinDate: { fontSize: wp('3.5%'), fontFamily: 'FredokaOne-Regular', color: '#555' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: hp('2%'), backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: 30, borderWidth: 3, borderColor: '#000', width: wp('90%'), marginTop: hp('2%') },
  statBox: { alignItems: 'center' },
  statNumber: { fontSize: wp('7%'), fontFamily: 'FredokaOne-Regular' },
  statLabel: { fontSize: wp('4%'), fontFamily: 'FredokaOne-Regular' },
  section: { backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 30, borderWidth: 3, borderColor: '#000', padding: wp('4%'), width: wp('90%'), marginTop: hp('2%'), alignItems: 'center' },
  sectionTitle: { fontSize: wp('5.5%'), fontFamily: 'FredokaOne-Regular', marginBottom: hp('1.5%') },
  achievementItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: hp('1%'), borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)', width: '100%' },
  achievementStatus: { width: wp('6%'), height: wp('6%'), borderRadius: wp('3%'), marginRight: wp('3%'), borderWidth: 1, borderColor: '#555', justifyContent: 'center', alignItems: 'center' },
  checkmark: { color: '#fff', fontSize: wp('3.5%'), fontWeight: 'bold', textAlign: 'center', lineHeight: wp('5%') },
  completed: { backgroundColor: '#4CD964' },
  incomplete: { backgroundColor: '#D9D9D9' },
  achievementTitle: { fontSize: wp('4.2%'), fontFamily: 'FredokaOne-Regular' },
  gamesButton: { width: wp('80%'), height: hp('8%'), borderRadius: 25, borderWidth: 3, borderColor: '#000', backgroundColor: '#A2D2FF', justifyContent: 'center', alignItems: 'center' },
  gamesButtonText: { color: '#1E1E1E', fontSize: wp('6%'), fontFamily: 'FredokaOne-Regular' },
  chartButton: { width: wp('80%'), height: hp('8%'), borderRadius: 25, borderWidth: 3, borderColor: '#000', backgroundColor: '#5bc0de', justifyContent: 'center', alignItems: 'center' },
  chartButtonText: { color: '#fff', fontSize: wp('5.5%'), fontFamily: 'FredokaOne-Regular' },
  reminderSection: { paddingBottom: hp('2%') },
  reminderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  reminderTimeContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: hp('1%'), width: '100%' },
  reminderLabel: { fontSize: wp('4%'), fontFamily: 'FredokaOne-Regular' },
  editTimeButton: { backgroundColor: '#f0f0f0', paddingVertical: hp('0.8%'), paddingHorizontal: wp('3%'), borderRadius: 15, borderWidth: 1, borderColor: '#ccc' },
  editTimeButtonText: { fontSize: wp('3.5%'), color: '#333', fontFamily: 'FredokaOne-Regular' },
  timeEditor: { alignItems: 'center', padding: wp('3%'), backgroundColor: '#f8f9fa', borderRadius: 15, width: '100%' },
  editingTimeLabel: { fontSize: wp('4.5%'), fontFamily: 'FredokaOne-Regular', marginBottom: hp('1.5%') },
  timeAdjustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  timeValue: { fontSize: wp('5%'), fontFamily: 'FredokaOne-Regular', marginHorizontal: wp('3%') },
  smallButton: { width: wp('12%'), height: hp('5%'), borderRadius: 8, borderWidth: 1.5, borderColor: '#adb5bd', backgroundColor: '#e9ecef', justifyContent: 'center', alignItems: 'center' },
  smallButtonText: { color: '#495057', fontSize: wp('4.5%'), fontWeight: 'bold' },
  editorButtons: { flexDirection: 'row', justifyContent: 'space-around', width: '80%', marginTop: hp('1%') },
  smallActionButton: { paddingVertical: hp('1%'), paddingHorizontal: wp('6%'), borderRadius: 20 },
  smallActionText: { color: '#fff', fontSize: wp('4%'), fontFamily: 'FredokaOne-Regular' },
  bottomButtonContainer: { width: wp('90%'), alignItems: 'center', marginTop: hp('2%'), marginBottom: hp('3%') },
  actionButton: { width: wp('70%'), height: hp('7%'), borderRadius: 30, borderWidth: 3, borderColor: '#000', backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginBottom: hp('2%') },
  signOutButton: { backgroundColor: '#FF3B30' },
  actionButtonText: { color: '#fff', fontSize: wp('5%'), fontFamily: 'FredokaOne-Regular' },
  authContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: wp('5%') },
  authBox: { width: wp('90%'), backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 30, borderWidth: 3, borderColor: '#000', padding: wp('6%'), alignItems: 'center' },
  authTitle: { fontSize: wp('7%'), fontFamily: 'FredokaOne-Regular', color: '#1E1E1E', marginBottom: hp('1.5%') },
  authSubtitle: { fontSize: wp('4%'), fontFamily: 'FredokaOne-Regular', color: '#555', textAlign: 'center', marginBottom: hp('3%') },
  authInput: { width: wp('80%'), height: hp('7%'), borderWidth: 2, borderColor: '#000', borderRadius: 25, paddingHorizontal: wp('4%'), fontSize: wp('4.5%'), fontFamily: 'FredokaOne-Regular', backgroundColor: '#fff', marginBottom: hp('2%'), color: '#000' },
  authButton: { width: wp('80%'), marginBottom: 0 },
  pinChangeModal: { backgroundColor: '#fff', borderRadius: 25, padding: wp('6%'), width: wp('85%'), maxHeight: hp('80%'), shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  pinChangeTitle: { fontSize: wp('7%'), fontFamily: 'FredokaOne-Regular', color: '#1E1E1E', marginBottom: hp('1%'), textAlign: 'center' },
  pinChangeSubtitle: { fontSize: wp('4%'), color: '#666', marginBottom: hp('3%'), textAlign: 'center' },
  pinErrorText: { color: '#FF3B30', fontSize: wp('3.5%'), fontFamily: 'FredokaOne-Regular', marginBottom: hp('1%'), textAlign: 'center', backgroundColor: '#FFE5E5', padding: wp('2%'), borderRadius: 10, width: '100%' },
  pinInputContainer: { width: '100%', marginBottom: hp('2%') },
  pinInputLabel: { fontSize: wp('4%'), fontFamily: 'FredokaOne-Regular', color: '#333', marginBottom: hp('0.5%') },
  pinChangeInput: { width: '100%', height: hp('6.5%'), borderWidth: 2, borderColor: '#4A90E2', borderRadius: 15, fontSize: wp('6%'), textAlign: 'center', fontFamily: 'FredokaOne-Regular', backgroundColor: '#F5F5F5', color: '#000' },
  pinChangeButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: hp('2%'), gap: wp('3%') },
  pinChangeButton: { flex: 1, height: hp('6%'), borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  pinCancelButton: { backgroundColor: '#E0E0E0', borderColor: '#999' },
  pinCancelText: { color: '#333', fontSize: wp('4.5%'), fontFamily: 'FredokaOne-Regular' },
  pinSubmitButton: { backgroundColor: '#FF9500', borderColor: '#E68A00' },
  pinSubmitText: { color: '#fff', fontSize: wp('4.5%'), fontFamily: 'FredokaOne-Regular' },
  pinHintText: { marginTop: hp('2%'), fontSize: wp('3%'), color: '#999', fontStyle: 'italic', textAlign: 'center' },
});

export default Profile;