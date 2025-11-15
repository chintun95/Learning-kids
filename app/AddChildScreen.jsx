import React, { useState, useEffect } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  View,
  FlatList,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { supabase } from '../backend/supabase';
import { useChild } from './ChildContext';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

const AddChildScreen = () => {
  const navigation = useNavigation();
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  const { setSelectedChild } = useChild();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [children, setChildren] = useState([]);
  const [childToEdit, setChildToEdit] = useState(null);

  // Load all children
  const loadChildren = async () => {
    const { data } = await supabase
      .from('child_profiles')
      .select('*')
      .eq('parent_user_id', uid);

    setChildren(data || []);
  };

  useEffect(() => {
    loadChildren();
  }, []);

  // Save child
  const handleSaveChild = async () => {
    if (!name.trim()) return Alert.alert("Please enter a name");

    if (childToEdit) {
      await supabase.from("child_profiles")
        .update({
          child_name: name,
          child_age: parseInt(age) || 0
        })
        .eq("id", childToEdit.id);

      Alert.alert("Child updated!");
    } else {
      const { data } = await supabase.from("child_profiles")
        .insert([{
          child_name: name,
          child_age: parseInt(age) || 0,
          parent_user_id: uid
        }])
        .select()
        .single();

      setSelectedChild(data);
      Alert.alert("Child added!");
    }

    setName("");
    setAge("");
    setChildToEdit(null);
    loadChildren();
  };

  // Delete
  const handleDelete = async (id) => {
    await supabase.from("child_profiles").delete().eq("id", id);
    Alert.alert("Child deleted!");
    loadChildren();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>
        {childToEdit ? "Edit Child" : "Add Child"}
      </Text>

      <TextInput
        placeholder="Child Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
        placeholderTextColor="#555"
      />

      <TextInput
        placeholder="Child Age"
        keyboardType="numeric"
        value={age}
        onChangeText={setAge}
        style={styles.input}
        placeholderTextColor="#555"
      />

      <TouchableOpacity style={styles.addButton} onPress={handleSaveChild}>
        <Text style={styles.addButtonText}>
          {childToEdit ? "💾 Save Changes" : "➕ Add Child"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.subtitle}>Your Children</Text>

      <FlatList
        data={children}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 50 }}
        renderItem={({ item }) => (
          <View style={styles.childCard}>
            <Text style={styles.childName}>{item.child_name}</Text>
            <Text style={styles.childAge}>Age: {item.child_age}</Text>

            <View style={styles.cardButtons}>
              <TouchableOpacity
                onPress={() => {
                  setChildToEdit(item);
                  setName(item.child_name);
                  setAge(item.child_age.toString());
                }}
                style={styles.editButton}
              >
                <Text style={styles.cardButtonText}>✏️ Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                style={styles.deleteButton}
              >
                <Text style={styles.cardButtonText}>🗑 Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate("ProfilePage")}
      >
        <Text style={styles.backButtonText}>⬅ Back to Profile</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default AddChildScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#F5F9FF",
    paddingTop: hp("5%"),
  },

  title: {
    fontFamily: "FredokaOne-Regular",
    fontSize: wp("10%"),
    color: "#333",
    marginBottom: hp("3%"),
  },

  input: {
    width: wp("80%"),
    height: hp("6%"),
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: wp("4%"),
    marginBottom: hp("2%"),
    borderWidth: 2,
    borderColor: "#000",
    fontFamily: "FredokaOne-Regular",
    fontSize: wp("4.5%"),
  },

  addButton: {
    width: wp("80%"),
    backgroundColor: "#34A853",
    paddingVertical: hp("1.8%"),
    borderRadius: 30,
    alignItems: "center",
    marginBottom: hp("3%"),
    borderWidth: 2,
    borderColor: "#000",
  },

  addButtonText: {
    fontFamily: "FredokaOne-Regular",
    color: "#fff",
    fontSize: wp("5%"),
  },

  subtitle: {
    fontFamily: "FredokaOne-Regular",
    fontSize: wp("7%"),
    marginBottom: hp("1%"),
    color: "#444",
  },

  childCard: {
    width: wp("80%"),
    backgroundColor: "#FFD966",
    borderRadius: 25,
    padding: wp("4%"),
    marginVertical: hp("1%"),
    borderWidth: 3,
    borderColor: "#000",
  },

  childName: {
    fontFamily: "FredokaOne-Regular",
    fontSize: wp("6%"),
    color: "#000",
  },

  childAge: {
    fontFamily: "FredokaOne-Regular",
    fontSize: wp("4.5%"),
    color: "#333",
    marginBottom: hp("1%"),
  },

  cardButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  editButton: {
    backgroundColor: "#4A90E2",
    padding: 10,
    borderRadius: 20,
    width: wp("30%"),
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
  },

  deleteButton: {
    backgroundColor: "#FF4C4C",
    padding: 10,
    borderRadius: 20,
    width: wp("30%"),
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
  },

  cardButtonText: {
    fontFamily: "FredokaOne-Regular",
    color: "#fff",
    fontSize: wp("4%"),
  },

  backButton: {
    marginTop: hp("2%"),
  },

  backButtonText: {
    fontFamily: "FredokaOne-Regular",
    fontSize: wp("5%"),
    color: "#4A90E2",
  },
});
