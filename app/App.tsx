// App.tsx
import React, { useEffect, useState } from "react";
import "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, View } from "react-native";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

import SnakeGame from "./SnakeGame";
import GamePage from "./game-page";
import LogInPage from "./logIn-page";
import ProfilePage from "./profile";
import SignInPage from "./signIn-page";
import EditProfilePage from "./edit-profile";
import ShopPage from "./shop";
import CreateQuestionsPage from "./CreateQuestions";
import QuizScreen from "./QuizScreen";
import ProgressChart from "./ProgressChart";
import ChildSelectScreen from "./ChildSelectScreen";
import AddChildScreen from "./AddChildScreen";

import { ChildProvider } from "./ChildContext";

import { initAnalyticsWeb } from "../firebase";
import {
  registerForPushNotificationsAsync,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  scheduleDailyReminder,
} from "./utils/notifications";

const Stack = createStackNavigator();

const App: React.FC = () => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (initializing) setInitializing(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    initAnalyticsWeb();

    (async () => {
      const token = await registerForPushNotificationsAsync();
      if (token) console.log("Push token:", token);

      const reminderId = await scheduleDailyReminder(9, 0);
      if (reminderId) console.log("Daily reminder scheduled, id:", reminderId);
    })();

    const receivedSub = addNotificationReceivedListener((notification: any) => {
      console.log("Notification received:", notification);
    });

    const responseSub = addNotificationResponseReceivedListener((response: any) => {
      console.log("Notification response:", response);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  // Show loading screen while checking authentication state
  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#A2D2FF' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ChildProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName={user ? "ChildSelectScreen" : "LogInPage"}>
            <Stack.Screen name="LogInPage" component={LogInPage} options={{ headerShown: false }} />
            <Stack.Screen name="SignInPage" component={SignInPage} options={{ headerShown: false }} />
            <Stack.Screen name="ProfilePage" component={ProfilePage} options={{ headerShown: false }} />
            <Stack.Screen name="GamePage" component={GamePage} options={{ headerShown: false }} />
            <Stack.Screen name="EditProfilePage" component={EditProfilePage} options={{ headerShown: false }} />
            <Stack.Screen name="ShopPage" component={ShopPage} options={{ headerShown: false }} />
            <Stack.Screen name="CreateQuestionsPage" component={CreateQuestionsPage} options={{ headerShown: false }} />
            <Stack.Screen name="QuizScreen" component={QuizScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SnakeGame" component={SnakeGame} options={{ headerShown: false }} />
            <Stack.Screen name="ChildSelectScreen" component={ChildSelectScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AddChildScreen" component={AddChildScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="ProgressChart"
              component={ProgressChart}
              options={{
                title: "Progress Chart",
                headerShown: true,
                headerStyle: { backgroundColor: "#A2D2FF" },
                headerTitleStyle: { fontFamily: "FredokaOne-Regular", color: "#000" },
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </ChildProvider>
    </GestureHandlerRootView>
  );
};

export default App;
