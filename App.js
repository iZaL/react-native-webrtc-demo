import React from 'react';
import {Text, View} from 'react-native';
import {createAppContainer, createBottomTabNavigator} from 'react-navigation';
import Broadcast from './Broadcast';
import Connect from './Connect';

class HomeScreen extends React.Component {

  render() {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text>Home!</Text>
      </View>
    );
  }
}

const TabNavigator = createBottomTabNavigator({
  Home: HomeScreen,
  Broadcast: Broadcast,
  Connect: Connect,
});

export default createAppContainer(TabNavigator);
