import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, Modal, View, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useChild } from './ChildContext';
import { fetchUserProfile } from '../backend/fetchUserProfile';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

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

const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

const ChildSelectScreen = () => {
  const navigation = useNavigation();
  const { setSelectedChild } = useChild();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Default PIN - in production, this should be stored securely
  const DEFAULT_PIN = '1234';

  const fetchChildren = useCallback(async () => {
    setLoading(true);
    try {
      const { children: childData } = await fetchUserProfile();
      setChildren(childData || []);
    } catch (error) {
      Alert.alert('Error', 'Could not fetch child profiles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchChildren();
    }, [fetchChildren])
  );

  const handleSelectChild = (child) => {
    setSelectedChild(child);
    navigation.replace('GamePage');
  };

  const handleEditChild = (child) => {
    navigation.navigate('AddChildScreen', {
      childToEdit: child,
      refreshParent: fetchChildren,
    });
  };

  const handleProfilePress = () => {
    setShowPinModal(true);
    setPinInput('');
    setPinError(false);
  };

  const handlePinSubmit = async () => {
    // Get stored PIN or use default
    const storedPin = await AsyncStorage.getItem('parentPin');
    const validPin = storedPin || DEFAULT_PIN;

    if (pinInput === validPin) {
      setShowPinModal(false);
      setPinInput('');
      setPinError(false);
      navigation.navigate('ProfilePage');
    } else {
      setPinError(true);
      setPinInput('');
      // Shake animation or feedback could be added here
    }
  };

  const handlePinCancel = () => {
    setShowPinModal(false);
    setPinInput('');
    setPinError(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Who's Playing?</Text>

      {children.length > 0 ? (
        <FlatList
          data={children}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => {
            const avatarSource = item.avatar 
              ? (item.avatar.startsWith('local_avatar_')
                  ? predefinedAvatars[parseInt(item.avatar.replace('local_avatar_', ''))]
                  : { uri: item.avatar })
              : null;

            return (
              <View style={styles.childContainer}>
                <TouchableOpacity
                  style={styles.childCircle}
                  onPress={() => handleSelectChild(item)}
                  onLongPress={() => handleEditChild(item)}
                >
                  {avatarSource ? (
                    <Image source={avatarSource} style={styles.childAvatar} />
                  ) : (
                    <View style={[styles.childCircle, { backgroundColor: getRandomColor() }]}>
                      <Text style={styles.childInitial}>
                        {item.child_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={styles.childName}>{item.child_name}</Text>
              </View>
            );
          }}
        />
      ) : (
        <Text style={styles.emptyText}>No children found.</Text>
      )}

      {/* Profile Button */}
      <TouchableOpacity
        style={styles.profileButton}
        onPress={handleProfilePress}
      >
        <Text style={styles.profileEmoji}>👩‍👩‍👦‍👦</Text>
        <Text style={styles.profileText}>Profile</Text>
      </TouchableOpacity>

      {/* PIN Verification Modal */}
      <Modal
        visible={showPinModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handlePinCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pinModal}>
            <Text style={styles.pinTitle}>🔒 Parent Access</Text>
            <Text style={styles.pinSubtitle}>Enter PIN to continue</Text>
            
            {pinError && (
              <Text style={styles.errorText}>Incorrect PIN. Try again.</Text>
            )}

            <TextInput
              style={[styles.pinInput, pinError && styles.pinInputError]}
              value={pinInput}
              onChangeText={setPinInput}
              keyboardType="number-pad"
              secureTextEntry={true}
              maxLength={4}
              placeholder="••••"
              placeholderTextColor="#ccc"
              autoFocus={true}
              onSubmitEditing={handlePinSubmit}
            />

            <View style={styles.pinButtons}>
              <TouchableOpacity
                style={[styles.pinButton, styles.cancelButton]}
                onPress={handlePinCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pinButton, styles.submitButton]}
                onPress={handlePinSubmit}
                disabled={pinInput.length !== 4}
              >
                <Text style={styles.submitButtonText}>Enter</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.hintText}>Default PIN: 1234</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
  },
  title: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('8%'),
    color: '#333',
    marginBottom: hp('5%'),
  },
  listContainer: {
    paddingHorizontal: wp('5%'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  childContainer: {
    alignItems: 'center',
    marginHorizontal: wp('3%'),
  },
  childCircle: {
    width: wp('35%'),
    height: wp('35%'),
    borderRadius: wp('17.5%'),
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  childAvatar: {
    width: '100%',
    height: '100%',
  },
  childInitial: {
    color: '#fff',
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('15%'),
  },
  childName: {
    color: '#333',
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('4.5%'),
    marginTop: hp('1%'),
  },
  childText: {
    color: '#fff',
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('5%'),
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('4%'),
    color: '#888',
    marginTop: hp('2%'),
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: hp('2%'),
    paddingHorizontal: wp('6%'),
    borderRadius: 30,
    marginTop: hp('4%'),
  },
  profileEmoji: {
    fontSize: wp('8%'),
    marginRight: wp('2%'),
  },
  profileText: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('5%'),
    color: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: wp('6%'),
    width: wp('80%'),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pinTitle: {
    fontSize: wp('7%'),
    fontFamily: 'FredokaOne-Regular',
    color: '#1E1E1E',
    marginBottom: hp('1%'),
  },
  pinSubtitle: {
    fontSize: wp('4%'),
    color: '#666',
    marginBottom: hp('3%'),
  },
  pinInput: {
    width: '80%',
    height: hp('7%'),
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderRadius: 10,
    fontSize: wp('8%'),
    textAlign: 'center',
    fontFamily: 'FredokaOne-Regular',
    backgroundColor: '#F5F5F5',
    marginBottom: hp('2%'),
  },
  pinInputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFE5E5',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: wp('3.5%'),
    fontFamily: 'FredokaOne-Regular',
    marginBottom: hp('1%'),
  },
  pinButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: hp('2%'),
    gap: wp('3%'),
  },
  pinButton: {
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
  submitButton: {
    backgroundColor: '#4A90E2',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: wp('4.5%'),
    fontFamily: 'FredokaOne-Regular',
  },
  hintText: {
    marginTop: hp('2%'),
    fontSize: wp('3%'),
    color: '#999',
    fontStyle: 'italic',
  },
});

export default ChildSelectScreen;
