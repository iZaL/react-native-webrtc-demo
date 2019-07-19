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
const configuration = {iceServers: [{url: 'stun:stun.l.google.com:19302'}]};
const pcPeers = {};
let localStream;

function getLocalStream(isFront, callback) {
  mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .then(function(stream) {
      callback(stream);
    })
    .catch(logError);
}

function join(roomID) {
  socket.emit('join-server', {roomID: roomID, displayName: 'zal'}, socketIds => {
    for (const i in socketIds) {
      const socketId = socketIds[i];
      createPC(socketId, true);
    }
  });
}

function createPC(socketId, isOffer) {
  // console.log('isOffer', isOffer);

  const pc = new RTCPeerConnection(configuration);
  pcPeers[socketId] = pc;

  pc.onicecandidate = event => {
    console.log('onicecandidate');
    if (event.candidate) {
      socket.emit('exchange-server', {to: socketId, candidate: event.candidate});
    }
  };

  pc.onnegotiationneeded = () => {
    console.log('on negotiation needed');
    if (isOffer) {
      createOffer();
    }
  };

  pc.oniceconnectionstatechange = event => {
    // console.log('on ice connection state change', event.target.iceConnectionState);
    if (event.target.iceConnectionState === 'completed') {
      setTimeout(() => {
        getStats();
      }, 1000);
    }
    if (event.target.iceConnectionState === 'connected') {
      createDataChannel();
    }
  };
  pc.onsignalingstatechange = event => {
    console.log('on signaling state change',event.target.signalingState);
    // console.log('on signaling state change', event.target.signalingState);



  };

  pc.onaddstream = event => {
    console.log('on add stream');
    container.setState({info: 'One peer join!'});

    const remoteList = container.state.remoteList;
    remoteList[socketId] = event.stream.toURL();
    container.setState({remoteList: remoteList});
  };

  pc.onremovestream = event => {
    console.log('on remove stream');
  };

  pc.addStream(localStream);

  const createOffer = () => {
    // console.log('createOffer');
    pc.createOffer()
      .then(desc => {
        pc.setLocalDescription(desc)
          .then(() => {
            console.log('setLocalDescription');
            socket.emit('exchange-server', {to: socketId, sdp: pc.localDescription});
          })
          .catch(logError);
      })
      .catch(logError);
  };

  const createDataChannel = () => {
    if (pc.textDataChannel) {
      return;
    }
    const dataChannel = pc.createDataChannel('text');

    dataChannel.onerror = error => {
      console.log('dataChannel.onerror', error);
    };

    dataChannel.onmessage = event => {
      console.log('dataChannel.onmessage:', event.data);
      container.receiveTextData({user: socketId, message: event.data});
    };

    dataChannel.onopen = () => {
      console.log('dataChannel.onopen');
      container.setState({textRoomConnected: true});
    };

    dataChannel.onclose = () => {
      console.log('dataChannel.onclose');
    };

    pc.textDataChannel = dataChannel;
  };

  return pc;
}

function exchange(data) {
  const fromId = data.from;
  const toId = data.to.socketId;

  let pc;
  if (fromId in pcPeers) {
    pc = pcPeers[fromId];
  } else {
    pc = createPC(fromId, false);
  }
  console.log('exchange candidate from',data.from);
  console.log('exchange candidate to',data.to.socketId);

  if (data.sdp) {
    console.log('exchange sdp');
    pc.setRemoteDescription(new RTCSessionDescription(data.sdp), () => {
      if (pc.remoteDescription.type === 'offer') {
        pc.createAnswer(desc => {
          console.log('createAnswer');
          pc.setLocalDescription(desc, () => {
            console.log('setLocalDescription');
            socket.emit('exchange', {
              to: fromId,
              sdp: pc.localDescription,
            });
          }).catch(err => {
            console.log('error setLocalDescription', err);
          });
        }).catch(error => {
          console.log('error createAnswer', error);
        });
      }
    }).catch(error => {
      console.log('remoteDescriptionError', error);
    });
  } else {
    pc.addIceCandidate(new RTCIceCandidate(data.candidate));
  }


}

function leave(socketId) {
  console.log('leave', socketId);
  const pc = pcPeers[socketId];
  // const viewIndex = pc.viewIndex;
  if (pc) {
    pc.close();
  }

  delete pcPeers[socketId];

  const remoteList = container.state.remoteList;
  delete remoteList[socketId];
  container.setState({remoteList: remoteList});
  container.setState({info: 'One peer leave!'});
}

socket.on('exchange-client', function(data) {
  exchange(data);
});

socket.on('leave-client', function(socketId) {
  leave(socketId);
});

socket.on('connect', function(data) {
  console.log('connect');
  getLocalStream(true, function(stream) {
    localStream = stream;
    container.setState({selfViewSrc: stream.toURL()});
    container.setState({
      status: 'ready',
      info: 'Please enter or create room ID',
    });
  });
});

function logError(error) {
  console.log('logError', error);
}

function mapHash(hash, func) {
  const array = [];
  for (const key in hash) {
    const obj = hash[key];
    array.push(func(obj, key));
  }
  return array;
}

function getStats() {
  const pc = pcPeers[Object.keys(pcPeers)[0]];
  if (pc.getRemoteStreams()[0] && pc.getRemoteStreams()[0].getAudioTracks()[0]) {
    const track = pc.getRemoteStreams()[0].getAudioTracks()[0];
    console.log('track', track);
    pc.getStats(
      track,
      function(report) {
        console.log('getStats report', report);
      },
      logError,
    );
  }
}

let container;

class Broadcast extends Component {
  constructor(props) {
    super(props);
    this.state = {
      info: 'Initializing',
      status: 'init',
      roomID: '123',
      isFront: true,
      selfViewSrc: null,
      remoteList: {},
      textRoomConnected: false,
      textRoomData: [],
      textRoomValue: '',
      number: 1,
      localSocketID: null,
    };
  }

  componentDidMount = () => {
    container = this;
  };

  _press = event => {
    // this.refs.roomID.blur();
    this.setState({status: 'connect', info: 'Connecting'});
    join(this.state.roomID);
  };

  _switchVideoType = () => {
    const isFront = !this.state.isFront;
    this.setState({isFront});
    getLocalStream(isFront, function(stream) {
      if (localStream) {
        for (const id in pcPeers) {
          const pc = pcPeers[id];
          pc && pc.removeStream(localStream);
        }
        localStream.release();
      }
      localStream = stream;
      container.setState({selfViewSrc: stream.toURL()});

      for (const id in pcPeers) {
        const pc = pcPeers[id];
        pc && pc.addStream(localStream);
      }
    });
  };
  receiveTextData = data => {
    const textRoomData = this.state.textRoomData.slice();
    textRoomData.push(data);
    this.setState({textRoomData, textRoomValue: ''});
  };
  _textRoomPress = () => {
    if (!this.state.textRoomValue) {
      return;
    }
    const textRoomData = this.state.textRoomData.slice();
    textRoomData.push({user: 'Me', message: this.state.textRoomValue});
    for (const key in pcPeers) {
      const pc = pcPeers[key];
      pc.textDataChannel.send(this.state.textRoomValue);
    }
    this.setState({textRoomData, textRoomValue: ''});
  };

  _renderTextRoom = () => {
    return (
      <View style={styles.listViewContainer}>
        {/*<ListView*/}
        {/*    dataSource={this.ds.cloneWithRows(this.state.textRoomData)}*/}
        {/*    renderRow={rowData => (*/}
        {/*        <Text>{`${rowData.user}: ${rowData.message}`}</Text>*/}
        {/*    )}*/}
        {/*/>*/}
        <TextInput
          style={{
            width: 200,
            height: 30,
            borderColor: 'gray',
            borderWidth: 1,
          }}
          onChangeText={value => this.setState({textRoomValue: value})}
          value={this.state.textRoomValue}
        />
        <TouchableHighlight onPress={this._textRoomPress}>
          <Text>Send</Text>
        </TouchableHighlight>
      </View>
    );
  };

  render() {
    console.log('this.state', this.state);
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>{this.state.info}</Text>
        {this.state.textRoomConnected && this._renderTextRoom()}
        <View style={{flexDirection: 'row'}}>
          <Text>{this.state.isFront ? 'Use front camera' : 'Use back camera'}</Text>
          <TouchableHighlight
            style={{borderWidth: 1, borderColor: 'black'}}
            onPress={this._switchVideoType}>
            <Text>Switch camera</Text>
          </TouchableHighlight>
        </View>
        {this.state.status === 'ready' ? (
          <View>
            <TextInput
              ref="roomID"
              autoCorrect={false}
              style={{
                width: 200,
                height: 40,
                borderColor: 'gray',
                borderWidth: 1,
              }}
              onChangeText={text => this.setState({roomID: text})}
              value={this.state.roomID}
            />
            <TouchableHighlight onPress={this._press}>
              <Text>Enter room</Text>
            </TouchableHighlight>
          </View>
        ) : null}
        <RTCView streamURL={this.state.selfViewSrc} style={styles.selfView} />
        {mapHash(this.state.remoteList, function(remote, index) {
          console.log('remote',remote);
          return <RTCView key={index} streamURL={remote} style={styles.remoteView} />;
        })}

        <Text onPress={() => this.setState({number: this.state.number + 1})}>Increment Number</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  selfView: {
    width: 200,
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
});

export default Broadcast;
