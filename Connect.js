import React, {Component} from 'react';
import {StyleSheet, Text, TextInput, TouchableHighlight, View} from 'react-native';
import { createBottomTabNavigator, createAppContainer } from 'react-navigation';

import io from 'socket.io-client';
import {
  mediaDevices,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCView,
} from 'react-native-webrtc';

const socket = io.connect('http://192.168.8.103:4443', {transports: ['websocket']});

class Connect extends Component {

  constructor(props) {
    super(props);
    this.state = {
      initialized:false,
      stream:null,
      uuid:this.createUniqueID(),
      selfCandidate:null
    };
    const configuration = {iceServers: [{url: 'stun:stun.l.google.com:19302'}]};
    this.pc = new RTCPeerConnection(configuration);
    this.pc.onicecandidate = this.gotIceCandidate;
    this.pc.onaddstream = this.gotRemoteStream;
  }

  connect = () => {
    console.log('pc',this.pc);
    socket.emit('join-server', {roomID: '123', displayName: 'user2'}, socketIds => {
      for (const i in socketIds) {
        const socketId = socketIds[i];
        createPC(socketId, true);
      }
    });
  };

  gotIceCandidate = (event) => {
    console.log('got ice candidate');
    if (event.candidate) {
      this.setState({
        selfCandidate:event.candidate
      });
      socket.emit('exchange-server', {uuid: this.state.uuid, candidate: event.candidate});
    }
  };

  gotRemoteStream = () => {
    console.log('got remote stream');
  };

  createUniqueID = () => {
    const s4 = () => {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    };
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
  };

  render() {
    console.log('this.state', this.state);

    return (
      <View style={styles.container}>
        <TouchableHighlight onPress={this.connect} style={styles.button}>
          <Text style={styles.buttonText}>Connect</Text>
        </TouchableHighlight>
      </View>
    );
  }
}


const styles = StyleSheet.create({
  selfView: {
    width: 400,
    height: 150,
  },
  remoteView: {
    width: 200,
    height: 150,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  listViewContainer: {
    height: 150,
  },
  button:{
    padding:10,
    backgroundColor: 'yellow',
    margin:5
  },
  videoContainer:{
    alignItems:'center',
    backgroundColor:'gray',
    margin:5,
    padding:5,
  },
  buttonText:{
    textAlign: 'center'
  }
});

export default Connect;
