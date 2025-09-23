// App.tsx
import React, { useEffect } from "react";
import "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import SnakeGame from "./SnakeGame";
import GamePage from "./game-page";
import LogInPage from "./logIn-page";
import ProfilePage from "./edit-profile";
import SignInPage from "./signIn-page";

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
          <Stack.Screen name="GamePage" component={GamePage} />
          <Stack.Screen name="SnakeGame" component={SnakeGame} />
          <Stack.Screen name="ProfilePage" component={ProfilePage} />
          <Stack.Screen name="SignInPage" component={SignInPage} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
};

export default App;
