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
import { auth } from '../firebase'; // Adjust path to your firebase config
import { signOut } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

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
});

export default Profile;
