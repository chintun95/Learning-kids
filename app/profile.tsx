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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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

const Profile: React.FC = () => {
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
  });

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTimeLabel, setReminderTimeLabel] = useState<string | null>(null);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editHour, setEditHour] = useState(9);
  const [editMinute, setEditMinute] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Predefined cute avatar options from local assets
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

  useFocusEffect(
    useCallback(() => {
      setLoadingProfile(true);

      const user = auth.currentUser;
      if (user) {
        const joinDate = user.metadata.creationTime
          ? new Date(user.metadata.creationTime).toLocaleDateString()
          : 'Unknown';

        setUserData(prev => ({
          ...prev,
          email: user.email || 'No email',
          name: user.displayName || 'User',
          joinDate,
        }));

        // Load profile picture
        if (user.photoURL) {
          setProfileImageUri(user.photoURL);
        }

        (async () => {
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
    }, [navigation])
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

  // ✅ UPDATED: Navigate to child selector instead of GamePage
  const handleGames = () => navigation.navigate('ChildSelectScreen');

  const handleViewChart = () => navigation.navigate('ProgressChart');

  const handlePickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload a profile picture.'
        );
        return;
      }

      // Launch image picker
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
            // Update Firebase user profile with photo URL
            await updateProfile(user, {
              photoURL: imageUri,
            });
            
            setProfileImageUri(imageUri);
            Alert.alert('Success', 'Profile picture updated successfully!');
          }
        } catch (error) {
          console.error('Error updating profile picture:', error);
          Alert.alert('Error', 'Failed to update profile picture. Please try again.');
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      setUploadingImage(false);
    }
  };

  const handleSelectPredefinedAvatar = async (avatarSource: any) => {
    try {
      setUploadingImage(true);
      const user = auth.currentUser;
      if (user) {
        // Store the avatar index as a string identifier in Firebase
        const avatarIndex = predefinedAvatars.indexOf(avatarSource);
        await updateProfile(user, {
          photoURL: `local_avatar_${avatarIndex}`,
        });
        
        setProfileImageUri(`local_avatar_${avatarIndex}`);
        setShowAvatarModal(false);
        Alert.alert('Success', 'Profile picture updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile picture:', error);
      Alert.alert('Error', 'Failed to update profile picture. Please try again.');
    } finally {
      setUploadingImage(false);
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
        
        {/* Header */}
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
            <TouchableOpacity
              style={styles.editImageButton}
              onPress={handlePickImage}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.editImageIcon}>📷</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.avatarSelectorButton}
              onPress={() => setShowAvatarModal(true)}
              disabled={uploadingImage}
            >
              <Text style={styles.editImageIcon}>🎨</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>{userData.name}</Text>
          <Text style={styles.email}>{userData.email}</Text>
          <Text style={styles.joinDate}>Member since {userData.joinDate}</Text>
        </View>

        {/* Stats */}
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

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          {userData.achievements.map(achievement => (
            <View key={achievement.id} style={styles.achievementItem}>
              <View
                style={[
                  styles.achievementStatus,
                  achievement.completed ? styles.completed : styles.incomplete,
                ]}
              />
              <Text style={styles.achievementTitle}>{achievement.title}</Text>
            </View>
          ))}
        </View>

        {/* Progress Chart */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.chartButton} onPress={handleViewChart}>
            <Text style={styles.chartButtonText}>View Progress Chart</Text>
          </TouchableOpacity>
        </View>

        {/* Games → now Child Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pick a child</Text>
          <TouchableOpacity style={styles.gamesButton} onPress={handleGames}>
            <Text style={styles.gamesButtonText}>Select Child</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Reminder */}
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
              <TouchableOpacity
                style={styles.editTimeButton}
                onPress={() => setIsEditingTime(true)}>
                <Text style={styles.editTimeButtonText}>Edit Time</Text>
              </TouchableOpacity>
            </View>
          )}

          {reminderEnabled && isEditingTime && (
            <View style={styles.timeEditor}>
              <Text style={styles.editingTimeLabel}>
                Editing:{' '}
                {(((editHour + 11) % 12) + 1)
                  .toString()
                  .padStart(2, '0')}
                :
                {editMinute.toString().padStart(2, '0')}{' '}
                {editHour >= 12 ? 'PM' : 'AM'}
              </Text>

              <View style={styles.timeAdjustRow}>
                <TouchableOpacity
                  onPress={() => setEditHour(h => (h + 23) % 24)}
                  style={styles.smallButton}>
                  <Text style={styles.smallButtonText}>H-</Text>
                </TouchableOpacity>

                <Text style={styles.timeValue}>{editHour.toString().padStart(2, '0')}</Text>

                <TouchableOpacity
                  onPress={() => setEditHour(h => (h + 1) % 24)}
                  style={styles.smallButton}>
                  <Text style={styles.smallButtonText}>H+</Text>
                </TouchableOpacity>

                <View style={{ width: wp('4%') }} />

                <TouchableOpacity
                  onPress={() => setEditMinute(m => (m + 59) % 60)}
                  style={styles.smallButton}>
                  <Text style={styles.smallButtonText}>M-</Text>
                </TouchableOpacity>

                <Text style={styles.timeValue}>{editMinute.toString().padStart(2, '0')}</Text>

                <TouchableOpacity
                  onPress={() => setEditMinute(m => (m + 1) % 60)}
                  style={styles.smallButton}>
                  <Text style={styles.smallButtonText}>M+</Text>
                </TouchableOpacity>
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
                    } else {
                      Alert.alert('Error', 'Could not save reminder time.');
                      setReminderEnabled(false);
                      setReminderTimeLabel(null);
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

        {/* Footer Buttons */}
        <View style={styles.bottomButtonContainer}>

          <TouchableOpacity style={styles.actionButton} onPress={handleEditProfile}>
            <Text style={styles.actionButtonText}>Info & Questions</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#34A853' }]} 
            onPress={() => navigation.navigate('AddChildScreen')}
          >
            <Text style={styles.actionButtonText}>+ Add Child</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.signOutButton]}
            onPress={handleSignOut}>
            <Text style={styles.actionButtonText}>Sign Out</Text>
          </TouchableOpacity>

        </View>

      </ScrollView>

      {/* Avatar Selection Modal */}
      <Modal
        visible={showAvatarModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.avatarModal}>
            <View style={styles.avatarModalHeader}>
              <Text style={styles.avatarModalTitle}>Choose an Avatar</Text>
              <TouchableOpacity
                onPress={() => setShowAvatarModal(false)}
                style={styles.closeModalButton}
              >
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={predefinedAvatars}
              keyExtractor={(item, index) => index.toString()}
              numColumns={3}
              contentContainerStyle={styles.avatarGrid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.avatarOption}
                  onPress={() => handleSelectPredefinedAvatar(item)}
                >
                  <Image source={item} style={styles.avatarImage} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  image: { flex: 1 },
  loadingContainer: { justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    marginTop: hp('2%'),
    fontSize: wp('5%'),
    fontFamily: 'FredokaOne-Regular',
    color: '#fff',
  },
  scrollContainer: { flexGrow: 1, alignItems: 'center', paddingBottom: hp('5%') },
  header: {
    alignItems: 'center',
    paddingVertical: hp('3%'),
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#000',
    width: wp('90%'),
    marginTop: hp('5%'),
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: hp('1.5%'),
    width: wp('35%'),
    marginLeft: wp('5%'),
  },
  profileImage: {
    width: PixelRatio.roundToNearestPixel(120),
    height: PixelRatio.roundToNearestPixel(120),
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#000',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    left: wp('-10%'),
    backgroundColor: '#4A90E2',
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('5%'),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatarSelectorButton: {
    position: 'absolute',
    bottom: 0,
    right: wp('-6%'),
    backgroundColor: '#FF6B9D',
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('5%'),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  editImageIcon: {
    fontSize: wp('5%'),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: wp('4%'),
    width: wp('90%'),
    maxHeight: hp('70%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('2%'),
    paddingBottom: hp('1%'),
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
  },
  avatarModalTitle: {
    fontSize: wp('6%'),
    fontFamily: 'FredokaOne-Regular',
    color: '#1E1E1E',
  },
  closeModalButton: {
    padding: wp('2%'),
  },
  closeModalText: {
    fontSize: wp('7%'),
    color: '#666',
    fontWeight: 'bold',
  },
  avatarGrid: {
    paddingVertical: hp('1%'),
  },
  avatarOption: {
    width: wp('25%'),
    height: wp('25%'),
    margin: wp('1.5%'),
    borderRadius: wp('12.5%'),
    borderWidth: 3,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: wp('7%'),
    fontFamily: 'FredokaOne-Regular',
    color: '#1E1E1E',
    marginBottom: hp('0.5%'),
  },
  email: { fontSize: wp('4%'), fontFamily: 'FredokaOne-Regular', color: '#0A0A0A' },
  joinDate: { fontSize: wp('3.5%'), fontFamily: 'FredokaOne-Regular', color: '#555' },
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
  },
  statBox: { alignItems: 'center' },
  statNumber: { fontSize: wp('7%'), fontFamily: 'FredokaOne-Regular' },
  statLabel: { fontSize: wp('4%'), fontFamily: 'FredokaOne-Regular' },
  section: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#000',
    padding: wp('4%'),
    width: wp('90%'),
    marginTop: hp('2%'),
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: wp('5.5%'),
    fontFamily: 'FredokaOne-Regular',
    marginBottom: hp('1.5%'),
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp('1%'),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
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
  completed: { backgroundColor: '#4CD964' },
  incomplete: { backgroundColor: '#D9D9D9' },
  achievementTitle: { fontSize: wp('4.2%'), fontFamily: 'FredokaOne-Regular' },
  gamesButton: {
    width: wp('80%'),
    height: hp('8%'),
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: '#A2D2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gamesButtonText: {
    color: '#1E1E1E',
    fontSize: wp('6%'),
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
  },
  chartButtonText: {
    color: '#fff',
    fontSize: wp('5.5%'),
    fontFamily: 'FredokaOne-Regular',
  },
  reminderSection: { paddingBottom: hp('2%') },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  reminderTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp('1%'),
    width: '100%',
  },
  reminderLabel: { fontSize: wp('4%'), fontFamily: 'FredokaOne-Regular' },
  editTimeButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: hp('0.8%'),
    paddingHorizontal: wp('3%'),
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  editTimeButtonText: { fontSize: wp('3.5%'), color: '#333', fontFamily: 'FredokaOne-Regular' },
  timeEditor: { alignItems: 'center', padding: wp('3%'), backgroundColor: '#f8f9fa', borderRadius: 15, width: '100%' },
  editingTimeLabel: { fontSize: wp('4.5%'), fontFamily: 'FredokaOne-Regular', marginBottom: hp('1.5%') },
  timeAdjustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  timeValue: { fontSize: wp('5%'), fontFamily: 'FredokaOne-Regular', marginHorizontal: wp('3%') },
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
  smallButtonText: { color: '#495057', fontSize: wp('4.5%'), fontWeight: 'bold' },
  editorButtons: { flexDirection: 'row', justifyContent: 'space-around', width: '80%', marginTop: hp('1%') },
  smallActionButton: { paddingVertical: hp('1%'), paddingHorizontal: wp('6%'), borderRadius: 20 },
  smallActionText: { color: '#fff', fontSize: wp('4%'), fontFamily: 'FredokaOne-Regular' },
  bottomButtonContainer: { width: wp('90%'), alignItems: 'center', marginTop: hp('2%'), marginBottom: hp('3%') },
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
  },
  signOutButton: { backgroundColor: '#FF3B30' },
  actionButtonText: { color: '#fff', fontSize: wp('5%'), fontFamily: 'FredokaOne-Regular' },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp('5%'),
  },
  authBox: {
    width: wp('90%'),
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#000',
    padding: wp('6%'),
    alignItems: 'center',
  },
  authTitle: {
    fontSize: wp('7%'),
    fontFamily: 'FredokaOne-Regular',
    color: '#1E1E1E',
    marginBottom: hp('1.5%'),
  },
  authSubtitle: {
    fontSize: wp('4%'),
    fontFamily: 'FredokaOne-Regular',
    color: '#555',
    textAlign: 'center',
    marginBottom: hp('3%'),
  },
  authInput: {
    width: wp('80%'),
    height: hp('7%'),
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 25,
    paddingHorizontal: wp('4%'),
    fontSize: wp('4.5%'),
    fontFamily: 'FredokaOne-Regular',
    backgroundColor: '#fff',
    marginBottom: hp('2%'),
    color: '#000',
  },
  authButton: {
    width: wp('80%'),
    marginBottom: 0,
  },
});

export default Profile;
