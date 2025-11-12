import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ImageBackground,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { responsive } from "@/utils/responsive";
import AddChildCard, { ChildDraft } from "@/components/AddChildCard";
import Button from "@/components/Button";
import { fetchParentByEmail } from "@/services/fetchParent";
import { useCreateChild } from "@/services/createChild";

const statusBarHeight =
  Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 40;

export default function AddChildScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const { mutate: createChild, isPending } = useCreateChild();

  const [cards, setCards] = useState<ChildDraft[]>([]);
  const [childrenUnderAccount, setChildrenUnderAccount] = useState<number>(0);

  // initialize one blank card
  useEffect(() => {
    setCards([
      {
        id: "",
        firstName: "",
        lastName: "",
        dobISO: null,
        dobDisplay: "",
        pin: "",
        emergencyContact: null,
        collapsed: false,
      },
    ]);
  }, []);

  const handleAddCard = () => {
    setCards((prev) => [
      ...prev,
      {
        id: "",
        firstName: "",
        lastName: "",
        dobISO: null,
        dobDisplay: "",
        pin: "",
        emergencyContact: null,
        collapsed: false,
      },
    ]);
  };

  const handleRemoveCard = (index: number) => {
    setCards((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCard = (updated: ChildDraft, index?: number) => {
    setCards((prev) => prev.map((c, i) => (i === index ? updated : c)));
  };

  const handleCollapseToggle = (index: number, collapsed: boolean) => {
    setCards((prev) =>
      prev.map((card, i) => (i === index ? { ...card, collapsed } : card))
    );
  };

  const handleCancel = () => {
    Alert.alert(
      "Discard Changes?",
      "Are you sure you want to go back? All entered information will be lost.",
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => router.back(),
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!user?.emailAddresses[0]?.emailAddress) return;
    const email = user.emailAddresses[0].emailAddress;

    // Fetch parent from DB
    const parent = await fetchParentByEmail(email);
    if (!parent) {
      Alert.alert("Error", "Parent record not found in database.");
      return;
    }

    // --- Validation ---
    const incomplete = cards.some(
      (c) =>
        !c.firstName ||
        !c.lastName ||
        !c.dobISO ||
        (c.pin && c.pin.length !== 4) // only validate if pin exists
    );
    if (incomplete) {
      Alert.alert(
        "Incomplete Fields",
        "Please fill out all required fields. Profile PIN is optional but must be 4 digits if entered."
      );
      return;
    }

    // --- Prepare payload ---
    const childrenPayload = cards.map((c) => ({
      firstname: c.firstName.trim(),
      lastname: c.lastName.trim(),
      dateofbirth: c.dobISO!,
      profilepin: c.pin ? c.pin : null, // allow null pins
      parent_id: parent.id,
      activitystatus: "inactive",
      emergencycontact_id: null,
      user_id: user.id,
    }));

    // --- Submit ---
    createChild(childrenPayload, {
      onSuccess: () => {
        Alert.alert("Success", "All children added successfully!");
        router.back();
      },
      onError: (error: unknown) => {
        //  Safely handle unknown error type
        let message = "Failed to add children.";
        if (error instanceof Error) {
          message = error.message;
        } else if (typeof error === "string") {
          message = error;
        }
        Alert.alert("Error", message);
      },
    });
  };

  const maxLimit = 12;
  const limitReached = childrenUnderAccount + cards.length >= maxLimit;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />

      {/* Header background extending into status bar */}
      <View style={styles.headerBackground} />

      <ImageBackground
        source={require("@/assets/images/app-background.png")}
        style={styles.background}
        imageStyle={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Header */}
        <View
          style={[
            styles.headerContainer,
            {
              paddingTop:
                Platform.OS === "android"
                  ? insets.top + responsive.screenHeight * 0.005
                  : insets.top + responsive.screenHeight * 0.01,
            },
          ]}
        >
          <Text style={styles.headerTitle}>Enter Child/Children Info</Text>
        </View>

        {/* Main Content */}
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
                canDelete={cards.length > 1}
                data={item}
                onChange={(updated) => handleUpdateCard(updated, index)}
                onDelete={() => handleRemoveCard(index)}
                onCollapseToggle={(_, collapsed) =>
                  handleCollapseToggle(index, collapsed)
                }
              />
            )}
            contentContainerStyle={[
              styles.listContent,
              {
                paddingBottom: insets.bottom + responsive.screenHeight * 0.08,
              },
            ]}
            ListFooterComponent={
              <View style={styles.footer}>
                {/* Add Another Child Button */}
                <TouchableOpacity
                  disabled={limitReached}
                  onPress={handleAddCard}
                >
                  <Text
                    style={[styles.addText, limitReached && { opacity: 0.5 }]}
                  >
                    {limitReached
                      ? "Limit Reached (12)"
                      : "+ Add another child"}
                  </Text>
                </TouchableOpacity>

                {/* Submit Button */}
                <Button
                  title={isPending ? "Submitting..." : "Submit"}
                  onPress={handleSubmit}
                  backgroundColor="#000"
                  marginTop={responsive.screenHeight * 0.02}
                  textColor="#fff"
                  disabled={isPending}
                />

                {/* Cancel Button */}
                <Button
                  title="Cancel"
                  onPress={handleCancel}
                  backgroundColor="#E5E7EB"
                  textColor="#000"
                  marginTop={responsive.screenHeight * 0.015}
                />
              </View>
            }
          />
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}

// ------------------
// Styles
// ------------------
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  backgroundImage: {
    transform: [{ scale: 1.25 }],
  },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: statusBarHeight + 60,
    backgroundColor: "rgba(217,217,217,0.85)",
    zIndex: 1,
  },
  headerContainer: {
    backgroundColor: "rgba(217,217,217,0.85)",
    borderBottomColor: "#999",
    borderBottomWidth: 2,
    paddingVertical: responsive.screenHeight * 0.018,
    paddingHorizontal: responsive.screenWidth * 0.06,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 2,
  },
  headerTitle: {
    fontFamily: "Fredoka-Bold",
    fontSize: responsive.buttonFontSize * 1.1,
    color: "#000",
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: responsive.screenWidth * 0.05,
    paddingTop: responsive.screenHeight * 0.015,
  },
  footer: {
    alignItems: "center",
    marginTop: responsive.screenHeight * 0.03,
  },
  addText: {
    fontSize: responsive.buttonFontSize * 0.95,
    fontFamily: "Fredoka-Medium",
    color: "#000",
    textDecorationLine: "underline",
    marginBottom: responsive.screenHeight * 0.02,
  },
});
