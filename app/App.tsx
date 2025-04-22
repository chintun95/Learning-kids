//For snake
import React from 'react';
import "react-native-gesture-handler";
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SnakeGame from './SnakeGame';  
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import LogInPage from './logIn-page';
const Stack = createStackNavigator();

const App: React.FC = () => (
<GestureHandlerRootView style={{flex: 1}}>
    <NavigationContainer>
        <Stack.Navigator initialRouteName="LogInPage">
          <Stack.Screen name="LogInPage" component={LogInPage} /> 
          <Stack.Screen name="SnakeGame" component={SnakeGame} />
        </Stack.Navigator>
      </NavigationContainer>

</GestureHandlerRootView>);

export default App;
