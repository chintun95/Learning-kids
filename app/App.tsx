import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SnakeGame from './SnakeGame';  
const Stack = createStackNavigator();

const App: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="SnakeGame" component={SnakeGame} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
