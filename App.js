import React from 'react';
import SocketIO from 'socket.io-client'
import WebSocketClient from 'reconnecting-websocket'
import WebRTCLib from 'react-native-webrtc'
import UUID from 'react-native-device-uuid'

const {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  MediaStreamTrack,
  getUserMedia,
} = WebRTCLib;
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
    this.on_Add_Stream = this.on_Add_Stream.bind(this)
    this.on_ICE_Candiate = this.on_ICE_Candiate.bind(this)
    this.sendMessage = this.sendMessage.bind(this)
    this.on_Offer_Received = this.on_Offer_Received.bind(this)
    this.on_Answer_Received = this.on_Answer_Received.bind(this)
    this.setupWebRTC = this.setupWebRTC.bind(this)
    this.handleAnswer = this.handleAnswer.bind(this)
    this.state = {
      connected: false,
      ice_connection_state: '',

    }
  }

  render() {
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
            <View style={styles.videoWidget}>
              { this.state.remoteStreamURL && 
                <RTCView streamURL={this.state.remoteStreamURL} style={styles.rtcView}/> 
              }
            </View>
          </View>
        </View>
        <View style={ this.state.connected ? styles.onlineCircle : styles.offlineCircle}/>
        <View style={styles.bottomView}>
          <TouchableOpacity onPress={this.handleConnect} disabled={this.state.offer_received}>
            <Text style={styles.connect}>
              Connect
            </Text>
          </TouchableOpacity>
          { // Offer received and offer not answered
            (this.state.offer_received && !this.state.offer_answered) &&
            <TouchableOpacity onPress={this.handleAnswer}>
              <Text style={styles.connect}>
                Answer
              </Text>
            </TouchableOpacity>
          }
        </View>
      </View>
    );
  }

  async setupWebRTC() {
    const self = this
    const peer = new WebRTCLib.RTCPeerConnection(DEFAULT_ICE)
    peer.oniceconnectionstatechange = this.on_ICE_Connection_State_Change
    peer.onaddstream = this.on_Add_Stream
    peer.onicecandidate = this.on_ICE_Candiate

    console.info('localStream:', this.localStream)
    peer.addStream(this.localStream)
    this.peer = peer
  }

  async handleConnect(e) {
    await this.setupWebRTC()
    const { peer } = this

    try {
            // Create Offer
      const offer = await peer.createOffer()
      self.offer = offer
      console.info('offer:', offer)

      await peer.setLocalDescription(offer)
      console.info('localDescription set!')

      // TODO: should send localDescription or offer
      // For now send localDescription
      

    } catch (e) {
      console.error('Failed to setup local offer')
      console.error(e.message)
    }

    this.sendMessage({
      type: 'offer',
      payload: this.peer.localDescription
    })
  }

  on_ICE_Connection_State_Change(e) {
    console.info('ICE Connection State Changed:', e.target.iceConnectionState)
    this.setState({
      ice_connection_state: e.target.iceConnectionState
    })
  }

  on_ICE_Candiate(e) {
    console.info('ICE Candidate Found:', e)
    const { candidate } = e
    debugger
    this.sendMessage({
      type: 'remote_candidate',
      payload: candidate
    })
  }

  on_Remote_ICE_Candidate(data) {
    debugger
    if (data.payload) {
      this.peer.addIceCandidate(new RTCIceCandidate(data.payload))      
    } else {
      console.info('Remote ICE Candidates Gathered!')
    }
  }

  on_Add_Stream(e) {
    debugger
    console.info('Remote Stream Added:', e.stream)
    this.setState({
      remoteStreamURL: e.stream.toURL()
    })
    this.remoteStream = e.stream
  }

  on_Offer_Received(data) {
    debugger
    this.setState({
      offer_received: true,
      offer_answered: false,
      offer: data
    })
  }

  async on_Answer_Received(data) {
    const { payload } = data
    await this.peer.setRemoteDescription(new WebRTCLib.RTCSessionDescription(payload))
  }

  async handleAnswer() {
    try {
      const { payload } = this.state.offer
      await this.setupWebRTC()
      
      const { peer } = this
      
      await peer.setRemoteDescription(new WebRTCLib.RTCSessionDescription(payload))
      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)

      this.sendMessage({
        type: 'answer',
        payload: peer.localDescription
      })

      this.setState({
        offer_answered: true
      })
    } catch (e) {
      debugger
    }

  }

  sendMessage(msgObj) {
    const { ws } = this
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify(msgObj))
    } else {
      const e = {
        code: 'websocket_error',
        message: 'WebSocket state:' + ws.readyState
      }
      throw e
    }
  }

  componentDidMount() {

    // Setup Socket
    const ws = new WebSocketClient(HOST);
    const self = this
    self.ws = ws

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
      let msg = {}
      const { data } = e
      try { msg = JSON.parse(data)} catch(e) {
        console.error('Invalid message:', data)
      }
      console.info('New Message:', data)
      // a message was received
      if (msg) {
        if (msg.type === 'offer') {
          this.on_Offer_Received(msg)
        } else if (msg.type === 'remote_candidate') {
          this.on_Remote_ICE_Candidate(msg)
        } else if (msg.type === 'answer') {
          this.on_Answer_Received(msg)
        } else {
          console.error('Unknown message:', msg)
        }

      }
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
        self.localStream = stream
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
    bottom: 80,
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
