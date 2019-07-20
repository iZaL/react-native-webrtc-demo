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

// const socket = io.connect('http://192.168.8.103:4443', {transports: ['websocket']});

let localStream;
let peerConnection;
let uuid;

let peerConnectionConfig = {
  'iceServers': [
    {'urls': 'stun:stun.stunprotocol.org:3478'},
    {'urls': 'stun:stun.l.google.com:19302'},
  ]
};

class Broadcast extends Component {

  constructor(props) {
    super(props);
    this.state = {
      initialized:false,
      stream:null,
      uuid:this.createUniqueID(),
      selfCandidate:null
    };
    // const configuration = {iceServers: [{url: 'stun:stun.l.google.com:19302'}]};
    // this.pc = new RTCPeerConnection(configuration);
    // this.pc.onicecandidate = this.gotIceCandidate;
    // this.pc.onaddstream = this.gotRemoteStream;
    this.serverConnection = new WebSocket('wss://' + window.location.hostname + ':8443');
    this.serverConnection.onmessage = this.gotMessageFromServer;

  }

  start = (isCaller) => {
    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    peerConnection.onicecandidate = this.gotIceCandidate;
    peerConnection.ontrack = this.gotRemoteStream;
    peerConnection.addStream(localStream);

    if(isCaller) {
      peerConnection.createOffer().then(this.createdDescription).catch((e)=>console.log('e',e));
    }
  };

  createdDescription = (description) => {
    console.log('got description');
    peerConnection.setLocalDescription(description).then(function() {
      this.serverConnection.send(JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid}));
    }).catch((e)=>console.log('e',e));
  };

  gotMessageFromServer = (message)  => {
    if(!this.pc) start(false);

    let signal = JSON.parse(message.data);

    // Ignore messages from ourself
    if(signal.uuid === this.state.uuid) return;

    if(signal.sdp) {
      peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {
        // Only create answers in response to offers
        if(signal.sdp.type == 'offer') {
          peerConnection.createAnswer().then(this.createdDescription).catch((e)=>console.log('e',e));
        }
      }).catch((e)=>console.log('e',e));
    } else if(signal.ice) {
      peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch((e)=>console.log('e',e));
    }
  };


  gotIceCandidate = (event) => {
    // console.log('got ice candidate');
    // if (event.candidate) {
    //   this.setState({
    //     selfCandidate:event.candidate
    //   });
    //   socket.emit('exchange-server', {uuid: this.state.uuid, ice: event.candidate});
    // }

    if(event.candidate != null) {
      this.serverConnection.send(JSON.stringify({'ice': event.candidate, 'uuid': uuid}));
    }
  };

  gotRemoteStream = (stream) => {
    console.log('got remove stream',stream);
  };

  // gotDescription = (description) => {
  //   console.log('got description');
  //   this.pc.setLocalDescription(description).then((desc) => {
  //     console.log('desc',desc);
  //     // serverConnection.send(JSON.stringify({'sdp': desc}));
  //   }).catch((e)=>{
  //     console.log('got description error',e);
  //   });
  // };
  startPeerConnection = (stream) => {
    this.pc.addStream(stream);
    // this.pc.createOffer(this.gotDescription);
    this.pc.createOffer()
      .then(desc => {
        this.pc.setLocalDescription(desc,(desc)=>{
          console.log('setLocalDescription',desc);
        })
          .then((desc) => {
            // socket.emit('exchange-server', {to: socketId, sdp: pc.localDescription});
          })
          .catch(this.logError);
      })
      .catch(this.logError);
  };

  captureMedia = () => {
    return new Promise((resolve, reject) => {
      mediaDevices
        .getUserMedia({
          audio: true,
          video: true,
        })
        .then((stream) => {
          this.setState({
            initialized:true,
            stream:stream
          });
          resolve(stream);
        })
        .catch(() => {
            reject(new Error('Failed to add ICE candidate'));
        });
    });
  };

  logError = (e) => {
    console.log('e',e);
  };

  broadcast = () => {
    console.log('broadcasting');
    // 1 - capture Media
    // 2 - start peer connections
    this.captureMedia().then((stream) => {
      this.startPeerConnection(stream);
    });
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
        {
          this.state.initialized &&
          <View style={styles.videoContainer}>
            <RTCView streamURL={this.state.stream.toURL()} style={styles.selfView} />
          </View>
        }

        <TouchableHighlight onPress={this.broadcast} style={styles.button}>
          <Text style={styles.buttonText}>Broadcast</Text>
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
    backgroundColor: 'blue',
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

export default Broadcast;
