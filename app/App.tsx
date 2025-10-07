// App.tsx
import React, { useEffect } from "react";
import "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import SnakeGame from "./SnakeGame";
import GamePage from "./game-page";
import LogInPage from "./logIn-page";
import ProfilePage from "./profile";
import SignInPage from "./signIn-page";
import EditProfilePage from "./edit-profile"
import ShopPage from "./shop"
import CreateQuestionsPage from "./CreateQuestions"
import QuizScreen from "./QuizScreen";

import { initAnalyticsWeb } from "../firebase";


const Stack = createStackNavigator();

const App: React.FC = () => {
  useEffect(() => {
    // safe on web only; no crash on iOS/Android
    initAnalyticsWeb();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="LogInPage">
          <Stack.Screen name="LogInPage" component={LogInPage} options={{ headerShown: false }} />
          <Stack.Screen name="SignInPage" component={SignInPage} options={{ headerShown: false }} />
          <Stack.Screen name="ProfilePage" component={ProfilePage} options={{ headerShown: false }} />
          <Stack.Screen name="GamePage" component={GamePage} options={{ headerShown: false }} />
          <Stack.Screen name="EditProfilePage" component={EditProfilePage} options={{ headerShown: false }} />
          <Stack.Screen name="ShopPage" component={ShopPage} options={{ headerShown: false }} />
          <Stack.Screen name="CreateQuestionsPage" component={CreateQuestionsPage} options={{ headerShown: false }} />
          <Stack.Screen name="QuizScreen" component={QuizScreen} options={{ headerShown: false }} />
          
          <Stack.Screen name="SnakeGame" component={SnakeGame} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
};

export default App;