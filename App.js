import React, {Component} from 'react';
import {StyleSheet, Text, TextInput, TouchableHighlight, View} from 'react-native';
import { createBottomTabNavigator, createAppContainer } from 'react-navigation';
import Broadcast from './Broadcast';
// import Connect from './Connect';

class HomeScreen extends React.Component {
  render() {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Home!</Text>
      </View>
    );
  }
}

const TabNavigator = createBottomTabNavigator({
  Home: HomeScreen,
  Broadcast: Broadcast,
  // Connect: Connect,
});

export default createAppContainer(TabNavigator);
