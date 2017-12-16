import React from 'react';
import SocketIO from 'socket.io-client'
import WebSocketClient from 'reconnecting-websocket'
import WebRTC from 'react-native-webrtc'
const {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  MediaStreamTrack,
  getUserMedia,
} = WebRTC;
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';

const dimensions = Dimensions.get('window')

const HOST = process.env.HOST || 'ws://172.20.1.150:8000'
const isFront = true // Use Front camera?
const DEFAULT_ICE = {
// we need to fork react-native-webrtc for relay-only to work.
//  iceTransportPolicy: "relay",
  iceServers: [
    {
      urls: ['turn:s2.xirsys.com:80?transport=tcp'],
      username: '8a63bcac-e16a-11e7-a86e-a62bc0457e71',
      credential: '8a63bdd8-e16a-11e7-b7e2-48f12b7ac2d8'
    },
    // {
    //   urls: 'turn:turn.msgsafe.io:443?transport=tcp',
    //   username: 'a9a2b514',
    //   credential: '00163e7826d6'
    // },
    /* Native libraries DO NOT fail over correctly.
    {
      urls: 'turn:turn.msgsafe.io:443',
      username: 'a9a2b514',
      credential: '00163e7826d6'
    }
    */
  ]
}

export default class App extends React.Component {

  constructor(props) {
    super(props)
    this.handleConnect = this.handleConnect.bind(this)
    this.on_ICE_Connection_State_Change = this.on_ICE_Connection_State_Change.bind(this)
    this.state = {
      connected: false,
      ice_connection_state: '',

    }
  }

  render() {
    console.info(this.state.localStreamURL)
    return (
      <View style={styles.container}>
        <View style={styles.video}>
          <View style={styles.callerVideo}>
            <View style={styles.videoWidget}>
              { this.state.localStreamURL && 
                <RTCView streamURL={this.state.localStreamURL} style={styles.rtcView}/> 
              }
            </View>
          </View>
          <View style={styles.calleeVideo}>
            <View style={styles.videoWidget}/>
          </View>
        </View>
        <View style={ this.state.connected ? styles.onlineCircle : styles.offlineCircle}/>
        <View style={styles.bottomView}>
          <TouchableOpacity onPress={this.handleConnect}>
            <Text style={styles.connect}>
              Connect
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  handleConnect(e) {
    console.info('Create Peer')
    const peer = new WebRTCLib.RTCPeerConnection(DEFAULT_ICE)
    peer.oniceconnectionstatechange = this.on_ICE_Connection_State_Change

  }

  on_ICE_Connection_State_Change(e) {
    this.setState({
      ice_connection_state: e.target.iceConnectionState
    })
  }

  componentDidMount() {

    // Setup Socket
    const ws = new WebSocketClient(HOST);
    const self = this

    ws.onopen = () => {
      console.info('Socket Connected!')
      self.setState({
        connected: true
      })
    };

    ws.onmessage = e => {
      self.setState({
        connected: true
      })
      // a message was received
      console.log('Socket:', e.data);
    };

    ws.onerror = e => {
      // an error occurred
      console.info(e.message);
      self.setState({
        connected: false
      })
    };

    ws.onclose = e => {
      // connection closed
      console.log(e.code, e.reason);
      self.setState({
        connected: false
      })
    };

    // Setup Camera & Audio
    MediaStreamTrack
      .getSources()
      .then(sourceInfos => {
        console.log(sourceInfos);
        let videoSourceId;
        for (let i = 0; i < sourceInfos.length; i++) {
          const sourceInfo = sourceInfos[i];
          if(sourceInfo.kind == "video" && sourceInfo.facing == (isFront ? "front" : "back")) {
            videoSourceId = sourceInfo.id;
          }
        }
        return getUserMedia({
          audio: true,
          video: {
            mandatory: {
              minWidth: 500, // Provide your own width, height and frame rate here
              minHeight: 300,
              minFrameRate: 30
            },
            facingMode: (isFront ? "user" : "environment"),
            optional: (videoSourceId ? [{sourceId: videoSourceId}] : [])
          }
        });
      })
      .then(stream => {
        self.setState({
          localStreamURL: stream.toURL()
        })
        self.stream = stream
      })
      .catch(e => {
        console.error('Failed to setup stream:', e.message)
      })
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'flex-start'
  },
  bottomView: {
    height: 20,
    flex: 1,
    bottom: 40,
    position: 'absolute',
    alignItems: 'center'
  },
  connect: {
    fontSize: 30
  },
  video: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
    backgroundColor: '#eee',
    alignSelf: 'stretch'
  },
  onlineCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1e1',
    position: 'absolute',
    top: 10,
    left: 10
  },
  offlineCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#333'
  },
  callerVideo: {
    flex: 0.5,
    backgroundColor: '#faa',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column'
  },
  calleeVideo: {
    flex: 0.5,
    backgroundColor: '#aaf',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column'
  },
  videoWidget: {
    position: 'relative',
    flex: 0.5,
    backgroundColor: '#fff',
    width: dimensions.width / 2,
    borderWidth: 1,
    borderColor: '#eee'
  },
  rtcView: {
    flex: 1,
    width: dimensions.width / 2,
    backgroundColor: '#f00',
    position: 'relative'
  }
});
