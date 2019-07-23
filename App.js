import React from 'react';
import {Text, View, YellowBox} from 'react-native';
import {createAppContainer, createBottomTabNavigator} from 'react-navigation';
import Broadcast from './Broadcast';
import Connect from './Connect';

class HomeScreen extends React.Component {

  constructor(props) {
    super(props);
    console.ignoredYellowBox = ['Remote debugger'];
    YellowBox.ignoreWarnings([
      'Unrecognized WebSocket connection option(s) `agent`, `perMessageDeflate`, `pfx`, `key`, `passphrase`, `cert`, `ca`, `ciphers`, `rejectUnauthorized`. Did you mean to put these under `headers`?'
    ]);
  }

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
