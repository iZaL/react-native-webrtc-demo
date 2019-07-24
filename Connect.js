import React, {Component} from 'react';
import {StyleSheet, Text, TouchableHighlight, View} from 'react-native';
import io from 'socket.io-client';
import {
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCView
} from 'react-native-webrtc';

class Connect extends Component {
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
      socketURL: 'http://192.168.8.105:3000'
    };
  }

  componentDidMount(): void {
    this.connectSocket();
    this.fakeCaptureMedia();
  }

  connectSocket = () => {
    console.log('connectSocket');

    this.socket = io.connect(this.state.socketURL, {
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      this.joinRoom();
    });

    this.socket.on('created', room => {
      console.log('Created room ' + room);
      this.setState({
        isInitiator: true
      });
    });

    this.socket.on('full', room => {
      alert('Room ' + room + ' is full.');
    });

    this.socket.on('join', room => {
      console.log('Another peer made a request to join room ' + room);
      console.log('This peer is the initiator of room ' + room + '!');
      this.setState({
        isChannelReady: true
      });
    });

    this.socket.on('joined', room => {
      console.log('joined: ' + room);
      this.setState({
        isChannelReady: true
      });
      this.maybeStart();
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
          candidate: message.candidate
        });
        this.pc.addIceCandidate(candidate);
      } else if (message === 'bye' && isStarted) {
        this.handleRemoteHangup();
      }
    });
  };

  sendMessage = message => {
    console.log('Client sending message: ', message);
    this.socket.emit('message', message);
  };

  fakeCaptureMedia = () => {
    console.log('captureMedia');
    // do not capture as this is one way streaming. i.e only to watch the broadcast
    this.sendMessage('got_media');
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
      // this.pc.addStream(localStream);
      this.setState({
        isStarted: true
      });
      console.log('isInitiator', isInitiator);
      if (isInitiator) {
        this.doCall();
      }
    }
  };

  createPeerConnection = () => {
    try {
      const configuration = {
        iceServers: [{url: 'stun:stun.l.google.com:19302'}]
      };
      this.pc = new RTCPeerConnection(configuration);
      this.pc.onicecandidate = this.handleIceCandidate;
      this.pc.onaddstream = this.handleRemoteStreamAdded;
      this.pc.onremovestream = this.handleRemoteStreamRemoved;
      console.log('Created RTCPeerConnnection');
    } catch (e) {
      console.log('Failed to create PeerConnection, exception: ' + e.message);
      alert('Cannot create RTCPeerConnection object.');
    }
  };

  handleIceCandidate = event => {
    console.log('icecandidate event: ', event);
    if (event.candidate) {
      this.sendMessage({
        type: 'candidate',
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate
      });
    } else {
      console.log('End of candidates.');
    }
  };

  doCall = () => {
    console.log('Sending offer to peer');
    this.pc
      .createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      })
      .then(this.setLocalAndSendMessage)
      .catch(this.handleCreateOfferError);
  };

  doAnswer = () => {
    console.log('Sending answer to peer.');
    this.pc
      .createAnswer()
      .then(this.setLocalAndSendMessage)
      .catch(this.onCreateSessionDescriptionError);
  };

  setLocalAndSendMessage = sessionDescription => {
    this.pc.setLocalDescription(sessionDescription);
    console.log('setLocalAndSendMessage sending message', sessionDescription);
    this.sendMessage(sessionDescription);
  };

  handleCreateOfferError = event => {
    console.log('createOffer() error: ', event);
  };

  onCreateSessionDescriptionError = error => {
    console.log('Failed to create session description: ' + error.toString());
  };

  handleRemoteStreamAdded = event => {
    console.log('Remote stream added.');
    this.setState({
      remoteStream: event.stream
    });
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
    // this.stop();

    if (!this.state.isInitiator) {
      this.stop();
    }
    // if isinitator
    this.setState({
      remoteStream: null,
      isStarted: false
    });
  };

  stop = () => {
    this.setState({
      localStream: null,
      isStarted: false
    });
    this.pc.close();
    this.pc = null;
    alert('Session Terminated');
  };

  joinRoom = () => {
    let {room} = this.state;
    this.socket.emit('create_join', room);
    console.log('Attempted to create or  join room', room);
  };

  render() {
    console.log('this.state', this.state);
    return (
      <View style={styles.container}>
        {this.state.remoteStream !== null ? (
          <RTCView streamURL={this.state.remoteStream.toURL()} style={styles.selfView} />
        ) : (
          <Text style={styles.alertText}>Remote Video will appear here once ready</Text>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  selfView: {
    width: 400,
    height: 150
  },
  remoteView: {
    width: 200,
    height: 150
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#F5FCFF'
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10
  },
  listViewContainer: {
    height: 150
  },
  button: {
    padding: 10,
    backgroundColor: 'blue',
    margin: 5
  },
  videoContainer: {
    alignItems: 'center',
    backgroundColor: 'gray',
    margin: 5,
    padding: 5,
    borderWidth: 1,
    borderColor: 'gray'
  },
  buttonText: {
    textAlign: 'center'
  },
  toggleButton: {
    fontSize: 15
  },
  connectButtonContainer: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'gray',
    padding: 5,
    alignItems: 'center',
    marginVertical: 10
  },
  alertText: {
    fontSize: 20,
    textAlign: 'center',
    fontWeight: '500',
    padding: 5
  }
});

export default Connect;
