// app/AddChildScreen.jsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { supabase } from '../backend/supabase';
import { useChild } from './ChildContext';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

const AddChildScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { refreshParent, childToEdit } = route.params || {};
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  const { setSelectedChild } = useChild();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (childToEdit) {
      setName(childToEdit.child_name);
      setAge(childToEdit.child_age?.toString() || '');
    }
  }, [childToEdit]);

  const handleSaveChild = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name.');
      return;
    }
    if (!uid) {
      Alert.alert('Error', 'You are not logged in.');
      return;
    }

    setLoading(true);
    try {
      let data, error;

      if (childToEdit) {
        // Edit existing child
        const { data: updatedData, error: updateError } = await supabase
          .from('child_profiles')
          .update({ child_name: name.trim(), child_age: age ? parseInt(age, 10) : 0 })
          .eq('id', childToEdit.id)
          .select()
          .single();

        data = updatedData;
        error = updateError;
      } else {
        // Add new child
        const { data: newData, error: insertError } = await supabase
          .from('child_profiles')
          .insert([{ child_name: name.trim(), parent_user_id: uid, child_age: age ? parseInt(age, 10) : 0 }])
          .select()
          .single();

        data = newData;
        error = insertError;
      }

      if (error) throw error;

      setSelectedChild(data);
      if (refreshParent) refreshParent();

      Alert.alert('Success', childToEdit ? 'Child updated!' : 'Child added!');
      navigation.replace('ChildSelectScreen'); 
    } catch (err) {
      console.error('Error saving child:', err.message);
      Alert.alert('Error', 'Could not save child.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChild = async () => {
    if (!childToEdit) return;

    Alert.alert(
      'Delete Child',
      'Are you sure you want to delete this child?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('child_profiles')
                .delete()
                .eq('id', childToEdit.id);

              if (error) throw error;

              Alert.alert('Deleted', 'Child has been deleted.');
              if (refreshParent) refreshParent();
              navigation.goBack();
            } catch (err) {
              console.error('Error deleting child:', err.message);
              Alert.alert('Error', 'Could not delete child.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{childToEdit ? 'Edit Child' : 'Add Child'}</Text>

      <TextInput
        style={styles.input}
        placeholder="Child's Name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />

      <TextInput
        style={styles.input}
        placeholder="Child's Age"
        value={age}
        onChangeText={setAge}
        keyboardType="numeric"
      />

      <TouchableOpacity style={styles.button} onPress={handleSaveChild} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Saving...' : childToEdit ? 'Save Changes' : 'Add Child'}</Text>
      </TouchableOpacity>

      {childToEdit && (
        <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDeleteChild}>
          <Text style={styles.buttonText}>Delete Child</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[styles.button, styles.profileButton]} onPress={() => navigation.navigate('ProfilePage')}>
        <Text style={styles.buttonText}>Back to Profile</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f4f8', paddingTop: hp('10%') },
  title: { fontFamily: 'FredokaOne-Regular', fontSize: wp('8%'), color: '#333', marginBottom: hp('5%') },
  input: {
    width: wp('80%'),
    height: hp('6%'),
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: wp('4%'),
    fontSize: wp('4%'),
    marginBottom: hp('3%'),
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#34A853',
    paddingVertical: hp('2%'),
    paddingHorizontal: wp('8%'),
    borderRadius: 30,
    width: wp('80%'),
    alignItems: 'center',
    marginTop: hp('2%'),
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 2, height: 4 },
    shadowRadius: 5,
    elevation: 3,
  },
  deleteButton: { backgroundColor: '#FF4C4C' },
  profileButton: { backgroundColor: '#4A90E2' },
  buttonText: { color: '#fff', fontFamily: 'FredokaOne-Regular', fontSize: wp('5%') },
});

export default AddChildScreen;
