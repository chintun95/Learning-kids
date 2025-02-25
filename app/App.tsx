//For snake
import React from 'react';
import "react-native-gesture-handler";
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SnakeGame from './SnakeGame';  
import { GestureHandlerRootView } from 'react-native-gesture-handler';
const Stack = createStackNavigator();

const App: React.FC = () => (
<GestureHandlerRootView style={{flex: 1}}>
    {" "}
    <SnakeGame />

</GestureHandlerRootView>);{
  
};

export default App;
