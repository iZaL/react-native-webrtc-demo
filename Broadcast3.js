import React, {Component} from 'react';
import {StyleSheet, Text, TextInput, TouchableHighlight, View} from 'react-native';

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
    this.pc.onicecandidate = this.gotIceCandidate;
    this.pc.onaddstream = this.gotRemoteStream;
    this.pc.onnegotiationneeded = this.onNegotiationNeeded;
    this.streamMedia();
  }

  streamMedia = () => {
    mediaDevices
      .getUserMedia({
        audio: true,
        video: false,
      })
      .then(stream => {
        this.setState({
          stream: stream,
          initialized: true,
        });
      })
      .catch(e => {
        console.log('Error:could not stream media');
      });
  };

  onNegotiationNeeded = d => {
    console.log('on Negotiation Needed', d);
    // this.createOffer();
  };

  gotIceCandidate = event => {
    console.log('got ice candidate', event);
    this.pc.addIceCandidate(new RTCIceCandidate(event.candidate));
    // if (event && event.candidate) {
    //   const params = {
    //     id: 'onIceCandidate',
    //     candidate: {
    //       candidate: event.candidate.candidate,
    //       sdpMid: event.candidate.sdpMid,
    //       sdpMLineIndex: event.candidate.sdpMLineIndex,
    //     },
    //   };
    //   console.log('WebRTC: sending onIceCandidate:', JSON.stringify(params));
    //   // this.socket.send(JSON.stringify(params));
    // }
  };

  gotRemoteStream = event => {
    console.log('got remote stream');
    // debugger;
    this.setState({
      remoteStream: event.stream,
    });
  };

  // function start(isCaller) {
  //   peerConnection = new RTCPeerConnection(peerConnectionConfig);
  //   peerConnection.onicecandidate = gotIceCandidate;
  //   peerConnection.onaddstream = gotRemoteStream;
  //   peerConnection.addStream(localStream);
  //
  //   if(isCaller) {
  //     peerConnection.createOffer(gotDescription, createOfferError);
  //   }
  // }

  createOffer = (isCaller = true) => {
    console.log('create offer');
    if (isCaller) {
      console.log('creating offer');
      this.pc
        .createOffer()
        .then(offer => {
          this.pc.setLocalDescription(offer).then(() => {
            this.socket.emit('offer', {
              offer: offer,
              userID: this.state.userID,
              remoteUserID: this.state.userID === 1 ? 2 : 1,
            });
          });
        })
        .catch(error => {
          console.error('WebRTC: createOffer setLocalDescription error:', error);
        });
    }
  };

  loginUser = () => {
    this.socket.emit('login', {
      type: 'login',
      userID: this.state.userID,
      name: this.state.userID === 1 ? 'Sim7' : 'Sim8',
    });
  };

  gotDescription = description => {
    console.log('got description');
  };

  // function gotMessageFromServer(message) {
  //   if(!peerConnection) start(false);
  //
  //   var signal = JSON.parse(message.data);
  //   if(signal.sdp) {
  //     peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp), function() {
  //       if(signal.sdp.type == 'offer') {
  //         peerConnection.createAnswer(gotDescription, createAnswerError);
  //       }
  //     });
  //   } else if(signal.ice) {
  //     peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice));
  //   }
  // }

  handleOffer = data => {
    console.log('handleOffer data', data);
    // if not peerconnection, set peer connection
    let offer = data.offer;

    if (this.state.userID === data.userID) {
      console.log('same user');
    } else {
      if (offer.sdp) {
        console.log('yes it is sdp');
        this.pc
          .setRemoteDescription(new RTCSessionDescription(offer))
          .then(() => {
            console.log('setted remote description');
          })
          .catch(e => {
            console.log('Error setting remote description', e);
          });
        // this.pc
        //   .createAnswer()
        //   .then(answer => {
        //     this.pc.setLocalDescription(answer);
        //     this.socket.emit('answer', {
        //       answer: answer,
        //     });
        //   })
        //   .catch(e => {
        //     console.log('Error: createAnswer', e);
        //   });
        // this.pc.setRemoteDescription(offer, () => {
        //   if(offer.type === 'offer') {
        //     this.pc.createAnswer().then((description) => {
        //       this.pc.setLocalDescription(description,  () => {
        //         this.socket.emit('answer',{
        //           answer:description
        //         });
        //       }).catch((e)=>{
        //         console.log('Error: got description',e);
        //       });
        //     }).catch((e) => {
        //       console.log('Error: createAnswer',e);
        //     });
        //   }
        // }).catch((e)=>{
        //   console.log('Error: setRemoteDescription',e);
        // });
      } else if (offer.ice) {
        console.log('ice candidate');
        // this.pc.addIceCandidate(new RTCIceCandidate(offer.ice));
      }
    }
  };

  handleAnswer = answer => {
    console.log('handle answer', answer);
    this.pc.setRemoteDescription(new RTCSessionDescription(answer)).catch(e => {
      console.log('handle answer error', e);
    });
  };

  // connectSocket = () => {
  //   this.socket = new WebSocket('ws://localhost:9090');
  //
  //   this.socket.onopen = event => {
  //     this.loginUser();
  //   };
  //
  //   this.socket.onclose = event => {
  //     console.log('closing socket');
  //     // const viewIndex = peerConnection.viewIndex;
  //     // this.pc.close();
  //     if (this.pc !== null) {
  //       this.pc.close();
  //     }
  //   };
  //
  //   this.socket.onerror(event => {
  //     console.log('WebSocket error: ', event);
  //   });
  //
  //   this.socket.onmessage = message => {
  //     console.log('socket message received', message);
  //
  //     let data = JSON.parse(message.data);
  //     console.log('data', data.type);
  //
  //     switch (data.type) {
  //       case 'login':
  //         // handleLogin(data.success);
  //         break;
  //       //when somebody wants to call us
  //       case 'offer':
  //         this.handleOffer(data.offer, data.name);
  //         break;
  //       case 'answer':
  //         this.handleAnswer(data.answer);
  //         break;
  //       // when a remote peer sends an ice candidate to us
  //       case 'candidate':
  //         this.handleCandidate(data.candidate);
  //         break;
  //       case 'leave':
  //         console.log('candidate left');
  //         this.handleLeave();
  //         break;
  //       default:
  //         break;
  //     }
  //   };
  //
  //   this.socket.onerror = error => {
  //     console.log('WebSocket: error:', error);
  //     alert('websocket error');
  //   };
  // };

  connectSocket = () => {
    // this.socket = new WebSocket('ws://localhost:9090');
    this.socket = io.connect('http://192.168.8.103:3000', {transports: ['websocket']});

    this.socket.on('connect', () => {
      console.log('connected to server');

      this.loginUser();

      this.setState({
        socketConnected: true,
      });

      this.pc.addStream(this.state.stream);
    });

    this.socket.on('login', data => {
      console.log('logged in', data);
    });

    this.socket.on('offer', data => this.handleOffer(data));

    this.socket.on('answer', data => this.handleAnswer(data));

    this.socket.on('event', data => {
      console.log('event', data);
    });

    this.socket.on('disconnect', () => {
      console.log('disconnect');
    });

    //
    // this.socket.onopen = event => {
    //   this.loginUser();
    // };
    //
    // this.socket.onclose = event => {
    //   console.log('closing socket');
    //   // const viewIndex = peerConnection.viewIndex;
    //   // this.pc.close();
    //   if (this.pc !== null) {
    //     this.pc.close();
    //   }
    // };
    //
    // this.socket.onerror(event => {
    //   console.log('WebSocket error: ', event);
    // });
    //
    // this.socket.onmessage = message => {
    //   console.log('socket message received', message);
    //
    //   let data = JSON.parse(message.data);
    //   console.log('data', data.type);
    //
    //   switch (data.type) {
    //     case 'login':
    //       // handleLogin(data.success);
    //       break;
    //     //when somebody wants to call us
    //     case 'offer':
    //       this.handleOffer(data.offer, data.name);
    //       break;
    //     case 'answer':
    //       this.handleAnswer(data.answer);
    //       break;
    //     // when a remote peer sends an ice candidate to us
    //     case 'candidate':
    //       this.handleCandidate(data.candidate);
    //       break;
    //     case 'leave':
    //       console.log('candidate left');
    //       this.handleLeave();
    //       break;
    //     default:
    //       break;
    //   }
    // };
    //
    // this.socket.onerror = error => {
    //   console.log('WebSocket: error:', error);
    //   alert('websocket error');
    // };
  };

  // handleOffer = (offer, name) => {
  //   // connectedUser = name;
  //   this.pc.setRemoteDescription(new RTCSessionDescription(offer));
  //
  //   //create an answer to an offer
  //   this.pc
  //     .createAnswer(answer => {
  //       this.pc.setLocalDescription(answer);
  //       this.socket.send({
  //         type: 'answer',
  //         answer: answer,
  //       });
  //     })
  //     .then(err => console.log('err', err));
  // };

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
  // handleAnswer = answer => {
  //   console.log('handle answer',answer);
  //
  //   this.pc.setRemoteDescription(new RTCSessionDescription(answer)).catch(e => {
  //     console.log('handle answer error', e);
  //   });
  // };

  //when we got an ice candidate from a remote user
  handleCandidate = candidate => {
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
    this.captureMedia().then(stream => {
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
    console.log('this.state', this.state);
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
