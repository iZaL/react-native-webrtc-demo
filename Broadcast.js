import React, {Component} from 'react';
import {StyleSheet, Text, TextInput, TouchableHighlight, View} from 'react-native';
import {createBottomTabNavigator, createAppContainer} from 'react-navigation';

import io from 'socket.io-client';
import {
  mediaDevices,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCView,
} from 'react-native-webrtc';

// const socket = io.connect('http://192.168.8.105:4443', {transports: ['websocket']});

class Broadcast extends Component {
  constructor(props) {
    super(props);
    this.state = {
      initialized: false,
      stream: null,
      connectionID: this.createUniqueID(),
      socketURL: 'wss://localhost:3000',
      remoteStream: null,
    };
  }

  componentDidMount(): void {
    const configuration = {iceServers: [{url: 'stun:stun.l.google.com:19302'}]};
    this.pc = new RTCPeerConnection(configuration);
    // this.pc.onicecandidate = this.gotIceCandidate;
    this.pc.onaddstream = this.gotRemoteStream;
    this.pc.onnegotiationneeded = this.onNegotiationNeeded;
    this.connectSocket();
  }

  onNegotiationNeeded = () => {
    console.log('onNegotiationNeeded');
    // this.createOffer();
  };

  // gotIceCandidate = event => {
  //   console.log('got ice candidate');
  //   if (event && event.candidate) {
  //     const params = {
  //       id: 'onIceCandidate',
  //       candidate: {
  //         candidate: event.candidate.candidate,
  //         sdpMid: event.candidate.sdpMid,
  //         sdpMLineIndex: event.candidate.sdpMLineIndex,
  //       },
  //     };
  //     console.log('WebRTC: sending onIceCandidate:', JSON.stringify(params));
  //     // this.socket.send(JSON.stringify(params));
  //   }
  // };

  gotRemoteStream = event => {
    console.log('gotRemoteStream');
    // debugger;
    this.setState({
      remoteStream: event.stream,
    });
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


  loginUser = () => {
    console.log('loginUser');

    let params = JSON.stringify({
      type: 'login',
      name: 'afzal',
    });
    // console.log('params', params);
    this.socket.send(params);
  };

  connectSocket = () => {
    console.log('connectSocket');

    this.socket = new WebSocket('ws://localhost:9090');

    this.socket.onopen = event => {
      this.loginUser();
    };

    this.socket.onclose = event => {
      console.log('closing socket');
      // const viewIndex = peerConnection.viewIndex;
      // this.pc.close();
      if (this.pc !== null) {
        this.pc.close();
      }
    };

    // this.socket.onerror(event => {
    //   console.log('WebSocket error: ', event);
    // });

    this.socket.onmessage = message => {
      // console.log('socket message received', message);

      let data = JSON.parse(message.data);
      // console.log('data', data.type);

      switch (data.type) {
        case 'login':
          // handleLogin(data.success);
          break;
        //when somebody wants to call us
        case 'offer':
          this.handleOffer(data.offer, data.name);
          break;
        case 'answer':
          this.handleAnswer(data.answer);
          break;
        // when a remote peer sends an ice candidate to us
        case 'candidate':
          this.handleCandidate(data.candidate);
          break;
        case 'leave':
          console.log('candidate left');
          this.handleLeave();
          break;
        default:
          break;
      }
    };

    this.socket.onerror = error => {
      console.log('WebSocket: error:', error);
      alert('websocket error');
    };
  };

  createOffer = () => {
    console.log('createOffer');
    this.pc
      .createOffer()
      .then(offer => {
        this.pc.setLocalDescription(offer).then(() => {
          let params = JSON.stringify({
            type: 'offer',
            offer: offer,
            name: '123',
          });
          this.socket.send(params);
        });
      })
      .catch(error => {
        console.error('WebRTC: error:', error);
      });
  };

  createAnswer = () => {
    console.log('createAnswer');
    this.pc
      .createAnswer(answer => {
        this.pc.setLocalDescription(answer);
        this.socket.send({
          type: 'answer',
          answer: answer,
        });
      })
      .catch(e => console.log('Error : createAnswer', e));
  };

  handleOffer = (offer, name) => {
    console.log('handleOffer',name);

    if(name == 'afzal') {
      console.log('same user');
      return;
    }
      // connectedUser = name;
    this.pc.setRemoteDescription(new RTCSessionDescription(offer))
      .then(()=>this.createAnswer())
      .catch((e) => console.log('Error : setRemoteDescription',e));
  };

  // handleOffer = (offer, name) =>{
  //   // connectedUser = name;
  //   this.pc.setRemoteDescription(new RTCSessionDescription(offer)).then(()=> {
  //     this.pc.createAnswer().then((desc) => this.pc.setLocalDescription(desc));
  //   }).catch((e)=>{
  //     console.log('handle offer error',e);
  //   });
  //   //create an answer to an offer
  // };

  //when we got an answer from a remote user
  handleAnswer = answer => {
    console.log('handleAnswer');
    this.pc.setRemoteDescription(new RTCSessionDescription(answer)).catch(e => {
      console.log('handle answer error', e);
    });
  };

  //when we got an ice candidate from a remote user
  handleCandidate = candidate => {
    console.log('handleCandidate');
    this.pc.addIceCandidate(new RTCIceCandidate(candidate));
  };

  handleLeave = () => {
    // connectedUser = null;
    this.setState({
      remoteStream: null,
    });
    this.pc.close();
    this.pc.onicecandidate = null;
    this.pc.onaddstream = null;
  };

  startPeerConnection = stream => {
    // socket.emit('join-server', {roomID: roomID, displayName: 'zal'}, socketIds => {
    //   for (const i in socketIds) {
    //     const socketId = socketIds[i];
    // createPC(socketId, true);
    // }
    // });
  };

  captureMedia = () => {
    return new Promise((resolve, reject) => {
      mediaDevices
        .getUserMedia({
          audio: true,
          video: true,
        })
        .then(stream => {
          resolve(stream);
        })
        .catch(() => {
          reject(new Error('Failed to add ICE candidate'));
        });
    });
  };

  broadcast = () => {
    console.log('broadcasting');
    // 1 - capture Media
    // 2 - add stream
    // 3 - create offer
    this.captureMedia().then(stream => {
      // this.connectSocket();
      this.createOffer();
      this.pc.addStream(stream);
      this.setState({
        initialized: true,
        stream: stream,
      });
      // this.createOffer();
      // this.startPeerConnection(stream);
    });
  };

  createUniqueID = () => {
    const s4 = () => {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    };
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
  };

  logError = e => {
    console.log('e', e);
  };

  render() {
    // console.log('this.state', this.state);
    return (
      <View style={styles.container}>
        {this.state.initialized && (
          <View style={styles.videoContainer}>
            <RTCView streamURL={this.state.stream.toURL()} style={styles.selfView} />
          </View>
        )}

        <TouchableHighlight onPress={this.broadcast} style={styles.button}>
          <Text style={styles.buttonText}>Broadcast</Text>
        </TouchableHighlight>

        {this.state.remoteStream !== null && (
          // console.log('remoteStream',this.state.remoteStream);
          // return (
          <RTCView streamURL={this.state.remoteStream.toURL()} style={styles.selfView} />
        )
          // );
          // })
        }
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
  button: {
    padding: 10,
    backgroundColor: 'blue',
    margin: 5,
  },
  videoContainer: {
    alignItems: 'center',
    backgroundColor: 'gray',
    margin: 5,
    padding: 5,
  },
  buttonText: {
    textAlign: 'center',
  },
});

export default Broadcast;
