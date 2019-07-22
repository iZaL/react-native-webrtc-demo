import React, {Component} from 'react';
import {StyleSheet, Text, TextInput, TouchableHighlight, View} from 'react-native';

import io from 'socket.io-client';
import {
  mediaDevices,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  MediaStreamTrack,
} from 'react-native-webrtc';

class Broadcast extends Component {
  constructor(props) {
    super(props);
    this.state = {
      initialized: false,
      stream: null,
      connectionID: this.createUniqueID(),
      socketURL: 'wss://localhost:3000',
      remoteStream: null,
      userID: 1,
      socketConnected: false,
    };
  }

  componentDidMount(): void {
    const configuration = {iceServers: [{url: 'stun:stun.l.google.com:19302'}]};
    this.pc = new RTCPeerConnection(configuration);
    this.pc.onicecandidate = this.onIceCandidate;
    this.pc.onaddstream = this.gotRemoteStream;
    this.pc.onnegotiationneeded = this.onNegotiationNeeded;
    // this.streamMedia();
  }

  onNegotiationNeeded = () => {
    console.log('onNegotiationNeeded');
  };

  onIceCandidate = event => {
    this.pc.addIceCandidate(new RTCIceCandidate(event.candidate));
    this.socket.send('candidate', {
      candidate: event.candidate,
    });
  };

  gotRemoteStream = event => {
    console.log('got remote stream');
    // debugger;
    this.setState({
      remoteStream: event.stream,
    });
  };

  createOffer = (isCaller = true) => {
    console.log('createOffer');
    if (isCaller) {
      this.pc
        .createOffer()
        .then(offer => {
          this.pc.setLocalDescription(offer);
          this.socket.emit('offer', {
            offer: offer,
            userID: this.state.userID,
            remoteUserID: this.state.userID === 1 ? 2 : 1,
          });
        })
        .catch(error => {
          console.error('WebRTC: createOffer setLocalDescription error:', error);
        });
    } else {
      console.log('did not run createOffer');
    }
  };

  handleOffer = data => {
    console.log('handleOffer');
    let offer = data.offer;
    if (this.state.userID !== data.userID) {
      console.log('same user');
    } else {
      if (offer.sdp) {
        // console.log('yes it is sdp');
        this.pc.setRemoteDescription(offer);
        if (offer.type === 'offer') {
          this.createAnswer();
        }
      } else if (offer.ice) {
        console.log('yes it is ice');
        this.pc.addIceCandidate(new RTCIceCandidate(offer.ice));
      }
    }
  };

  createAnswer = () => {
    console.log('createAnswer');
    this.pc
      .createAnswer()
      .then(answer => {
        // this.pc.setLocalDescription(answer);
        this.pc.setLocalDescription(answer);
        this.socket.emit('answer', {
          answer: answer,
          userID: this.state.userID,
          remoteUserID: this.state.userID === 1 ? 2 : 1,
        });
      })
      .catch(e => {
        console.log('Error: createAnswer', e);
      });
  };

  handleAnswer = answer => {
    console.log('handleAnswer');
    this.pc.setRemoteDescription(new RTCSessionDescription(answer)).catch(e => {
      console.log('handle answer error', e);
    });
  };

  gotIceCandidate = candidate => {
    console.log('gotIceCandidate');
    this.pc.addIceCandidate(new RTCIceCandidate(candidate));
  };

  closeSocket = () => {
    console.log('closeSocket');
    this.setState({
      remoteStream: null,
    });
    this.pc.close();
    this.pc.onicecandidate = null;
    this.pc.onaddstream = null;
  };

  connectSocket = () => {
    console.log('connectSocket');
    this.socket = io.connect('http://192.168.8.103:3000', {transports: ['websocket']});
    this.socket.on('connect', () => {
      this.loginUser();
      this.setState({
        socketConnected: true,
      });
    });
    this.socket.on('login', () => this.loginUser());
    this.socket.on('offer', data => this.handleOffer(data));
    this.socket.on('answer', data => this.handleAnswer(data));
    this.socket.on('disconnect', () => this.closeSocket());
  };

  // miscellaneous

  loginUser = () => {
    console.log('loginUser');
    this.socket.emit('login', {
      type: 'login',
      userID: this.state.userID,
      name: this.state.userID === 1 ? 'Sim7' : 'Sim8',
    });
  };

  captureMedia = () => {
    // console.log('captureMedia');
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
    console.log('broadcast');
    // 1 - capture Media
    // 2 - add stream
    // 3 - create offer
    this.captureMedia().then(stream => {
      // this.connectSocket();
      this.pc.addStream(stream);
      this.setState(
        {
          initialized: true,
          stream: stream,
        },
        () => {
          this.createOffer();
        },
      );
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

  toggleUsername = () => {
    this.setState({
      userID: this.state.userID === 1 ? 2 : 1,
    });
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

        {this.state.socketConnected && (
          <TouchableHighlight onPress={this.broadcast} style={styles.button}>
            <Text style={styles.buttonText}>Broadcast</Text>
          </TouchableHighlight>
        )}

        {this.state.remoteStream !== null && (
          <RTCView streamURL={this.state.remoteStream.toURL()} style={styles.selfView} />
        )}

        <Text style={styles.toggleButton}> User : {this.state.userID}</Text>

        <View style={styles.connectButtonContainer}>
          <Text onPress={this.toggleUsername} style={styles.toggleButton}>
            Toggle user
          </Text>
        </View>

        <View style={styles.connectButtonContainer}>
          <Text style={styles.toggleButton} onPress={this.connectSocket}>
            Connect to socket{' '}
          </Text>
        </View>
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
    borderWidth: 1,
    borderColor: 'gray',
  },
  buttonText: {
    textAlign: 'center',
  },
  toggleButton: {
    fontSize: 15,
  },
  connectButtonContainer: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'gray',
    padding: 5,
    alignItems: 'center',
    marginVertical: 10,
  },
});

export default Broadcast;
