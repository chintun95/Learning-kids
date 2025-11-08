import React, { useState } from "react";
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { responsive } from "@/utils/responsive";
import AddChildCard, { AddChildForm } from "@/components/AddChildCard";
import Button from "@/components/Button";
import { fetchParentByEmail } from "@/services/fetchParent";
import { createChild } from "@/services/createChild";
import { useUser } from "@clerk/clerk-expo";

export default function AddChildScreen() {
  const { user } = useUser();
  const [cards, setCards] = useState<AddChildForm[]>([{} as AddChildForm]);
  const [childrenUnderAccount, setChildrenUnderAccount] = useState<number>(0);

  const handleAddCard = () => {
    setCards((prev) => {
      const updated = prev.map((c, i) =>
        i === prev.length - 1 ? { ...c } : c
      );
      return [...updated, {} as AddChildForm];
    });
  };

  const handleRemoveCard = (index: number) => {
    setCards((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCard = (index: number, data: AddChildForm) => {
    setCards((prev) => prev.map((item, i) => (i === index ? data : item)));
  };

  const handleSubmit = async () => {
    if (!user?.emailAddresses[0]?.emailAddress) return;
    const email = user.emailAddresses[0].emailAddress;

    const parent = await fetchParentByEmail(email);
    if (!parent) {
      console.error("Parent not found.");
      return;
    }

    for (const card of cards) {
      await createChild({
        firstname: card.firstName,
        lastname: card.lastName,
        dateofbirth: card.dateOfBirth,
        profilepin: card.profilePin,
        parent_id: parent.id,
        activitystatus: "pending",
      });
    }

    console.log("✅ All children added!");
  };

  const maxLimit = 12;
  const limitReached = childrenUnderAccount + cards.length > maxLimit;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          data={cards}
          keyExtractor={(_, index) => `child-${index}`}
          renderItem={({ item, index }) => (
            <AddChildCard
              index={index}
              isRemovable={index > 0}
              onRemove={() => handleRemoveCard(index)}
              onUpdate={(data) => handleUpdateCard(index, data)}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            <View style={styles.footer}>
              <TouchableOpacity disabled={limitReached} onPress={handleAddCard}>
                <Text style={styles.addText}>
                  {limitReached ? "Limit Reached" : "+ Add another"}
                </Text>
              </TouchableOpacity>

              <Button
                title="Submit"
                onPress={handleSubmit}
                backgroundColor="#000"
                marginTop={responsive.screenHeight * 0.02}
              />
            </View>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingBottom:
      Platform.OS === "android" ? responsive.screenHeight * 0.03 : 0,
  },
  listContent: {
    padding: responsive.screenWidth * 0.04,
    paddingBottom: responsive.screenHeight * 0.1,
  },
  footer: { alignItems: "center", marginTop: responsive.screenHeight * 0.02 },
  addText: {
    fontSize: responsive.buttonFontSize,
    fontFamily: "Fredoka-Medium",
    color: "#4F46E5",
    marginBottom: responsive.screenHeight * 0.01,
  },
});
