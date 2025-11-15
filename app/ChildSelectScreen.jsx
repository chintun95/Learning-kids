import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useChild } from './ChildContext';
import { fetchUserProfile } from '../backend/fetchUserProfile';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

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
            const color = getRandomColor();
            return (
              <TouchableOpacity
                style={[styles.childCircle, { backgroundColor: color }]}
                onPress={() => handleSelectChild(item)}       // play
                onLongPress={() => handleEditChild(item)}      // edit/delete
              >
                <Text style={styles.childText}>{item.child_name}</Text>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <Text style={styles.emptyText}>No children found.</Text>
      )}

      {/* Profile Button */}
      <TouchableOpacity
        style={styles.profileButton}
        onPress={() => navigation.navigate('ProfilePage')}
      >
        <Text style={styles.profileEmoji}>👩‍👩‍👦‍👦</Text>
        <Text style={styles.profileText}>Profile</Text>
      </TouchableOpacity>
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
  childCircle: {
    width: wp('35%'),
    height: wp('35%'),
    borderRadius: wp('17.5%'),
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: wp('3%'),
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
});

export default ChildSelectScreen;
