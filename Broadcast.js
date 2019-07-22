import React, {Component} from 'react';
import {StyleSheet, Text, TouchableHighlight, View} from 'react-native';
import io from 'socket.io-client';
import {
  mediaDevices,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCView,
} from 'react-native-webrtc';

class Broadcast extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isChannelReady: false,
      isInitiator: false,
      isStarted: false,
      localStream: null,
      pc: null,
      remoteStream: null,
      turnReady: null,
      room: 'foo',
      socketURL:'http://192.168.8.102:3000'
    };
  }

  componentDidMount(): void {
    this.connectSocket();
  }

  connectSocket = () => {
    console.log('connectSocket');

    this.socket = io.connect(this.state.socketURL, {transports: ['websocket']});

    this.socket.on('connect', () => {
      // this.joinRoom();
    });

    this.socket.on('created', room => {
      console.log('Created room ' + room);
      this.setState({
        isInitiator: true,
      });
    });

    this.socket.on('full', room => {
      alert('Room ' + room + ' is full.');
    });

    this.socket.on('join', room => {
      console.log('Another peer made a request to join room ' + room);
      console.log('This peer is the initiator of room ' + room + '!');
      this.setState({
        isChannelReady: true,
      });
    });

    this.socket.on('joined', room => {
      console.log('joined: ' + room);
      this.setState({
        isChannelReady: true,
      });
    });

    this.socket.on('log', array => {
      console.log.apply(console, array);
    });

    this.socket.on('message', message => {
      console.log('Client received message:', message);

      let {isInitiator, isStarted} = this.state;

      if (message === 'got_media') {
        this.maybeStart();
      } else if (message.type === 'offer') {
        if (!isInitiator && !isStarted) {
          this.maybeStart();
        }
        this.pc.setRemoteDescription(new RTCSessionDescription(message));
        this.doAnswer();
      } else if (message.type === 'answer' && isStarted) {
        this.pc.setRemoteDescription(new RTCSessionDescription(message));
      } else if (message.type === 'candidate' && isStarted) {
        let candidate = new RTCIceCandidate({
          sdpMLineIndex: message.label,
          candidate: message.candidate,
        });
        this.pc.addIceCandidate(candidate);
      } else if (message === 'bye' && isStarted) {
        this.handleRemoteHangup();
      }
    });
  };

  ////////////////////////////////////////////////

  joinRoom = () => {
    let {room} = this.state;
    this.socket.emit('create_join', room);
    console.log('Attempted to create or  join room', room);
  };

  sendMessage = message => {
    console.log('Client sending message: ', message);
    this.socket.emit('message', message);
  };
  // miscellaneous

  gotStream = stream => {
    console.log('Adding local stream.', stream);
    // localStream = stream;
    // localVideo.srcObject = stream;
    this.setState({
      localStream: stream,
    });
    this.sendMessage('got user media');
    if (this.state.isInitiator) {
      this.maybeStart();
    }
  };

  maybeStart = () => {
    let {isStarted, localStream, isChannelReady, isInitiator} = this.state;

    console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
    if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
      console.log('>>>>>> creating peer connection');
      this.createPeerConnection();
      this.pc.addStream(localStream);
      this.setState({
        isStarted: true,
      });
      console.log('isInitiator', isInitiator);
      if (isInitiator) {
        this.doCall();
      }
    }
  };

  createPeerConnection = () => {
    try {
      this.pc = new RTCPeerConnection(null);
      this.pc.onicecandidate = this.handleIceCandidate;
      this.pc.onaddstream = this.handleRemoteStreamAdded;
      this.pc.onremovestream = this.handleRemoteStreamRemoved;
      console.log('Created RTCPeerConnnection');
    } catch (e) {
      console.log('Failed to create PeerConnection, exception: ' + e.message);
      alert('Cannot create RTCPeerConnection object.');
      return;
    }
  };

  handleIceCandidate = event => {
    console.log('icecandidate event: ', event);
    if (event.candidate) {
      this.sendMessage({
        type: 'candidate',
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate,
      });
    } else {
      console.log('End of candidates.');
    }
  };

  handleCreateOfferError = event => {
    console.log('createOffer() error: ', event);
  };

  doCall = () => {
    console.log('Sending offer to peer');
    this.pc.createOffer().then(this.setLocalAndSendMessage).catch(this.handleCreateOfferError);
  };

  doAnswer = () => {
    console.log('Sending answer to peer.');
    this.pc.createAnswer().then(this.setLocalAndSendMessage, this.onCreateSessionDescriptionError);
  };

  setLocalAndSendMessage = sessionDescription => {
    this.pc.setLocalDescription(sessionDescription);
    console.log('setLocalAndSendMessage sending message', sessionDescription);
    this.sendMessage(sessionDescription);
  };

  onCreateSessionDescriptionError = error => {
    console.log('Failed to create session description: ' + error.toString());
  };

  handleRemoteStreamAdded = event => {
    console.log('Remote stream added.');
    this.setState({
      remoteStream: event.stream,
    });
    // remoteStream = event.stream;
    // remoteVideo.srcObject = remoteStream;
  };

  handleRemoteStreamRemoved = event => {
    console.log('Remote stream removed. Event: ', event);
  };

  hangup = () => {
    console.log('Hanging up.');
    this.stop();
    this.sendMessage('bye');
  };

  handleRemoteHangup = () => {
    console.log('Session terminated.');
    this.stop();
    this.setState({
      isInitiator: false,
    });
  };

  stop = () => {
    this.setState({
      isStarted: false,
    });
    this.pc.close();
    this.pc = null;
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
          this.gotStream(stream);
          resolve(stream);
        })
        .catch(() => {
          reject(new Error('Failed to add ICE candidate'));
        });
    });
  };

  render() {
    console.log('this.state', this.state);

    if (this.state.localStream === null) {
      this.captureMedia();
    }

    // return null;
    // console.log('this.state', this.state);
    return (
      <View style={styles.container}>
        <View style={styles.videoContainer}>
          <RTCView streamURL={this.state.localStream} style={styles.selfView} />
        </View>

        {this.state.socketConnected && (
          <TouchableHighlight onPress={this.broadcast} style={styles.button}>
            <Text style={styles.buttonText}>Broadcast</Text>
          </TouchableHighlight>
        )}

        {this.state.remoteStream !== null && (
          <RTCView streamURL={this.state.remoteStream.toURL()} style={styles.selfView} />
        )}

        {/*<Text style={styles.toggleButton}> User : {this.state.userID}</Text>*/}

        {/*<View style={styles.connectButtonContainer}>*/}
        {/*  <Text onPress={this.toggleUsername} style={styles.toggleButton}>*/}
        {/*    Toggle user*/}
        {/*  </Text>*/}
        {/*</View>*/}

        <View style={styles.connectButtonContainer}>
          <Text style={styles.toggleButton} onPress={this.joinRoom}>
            Connect to socket{' '}
          </Text>
        </View>

        {/*<View style={styles.connectButtonContainer}>*/}
        {/*  <Text style={styles.toggleButton} onPress={this.joinRoom}>*/}
        {/*    Join Room*/}
        {/*  </Text>*/}
        {/*</View>*/}
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
