import React from 'react';
import SocketIO from 'socket.io-client'
import WebSocketClient from 'reconnecting-websocket'

import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

const HOST = process.env.HOST || 'ws://172.20.1.150:8000'

export default class App extends React.Component {

  constructor(props) {
    super(props)
    this.handleConnect = this.handleConnect.bind(this)
    this.state = {
      connected: false
    }
  }

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.video}>

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
    console.info('Create Offer')

  }

  componentDidMount() {
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
    flex: 0.9,
    position: 'relative',
    backgroundColor: '#eee',
    alignSelf: 'stretch'
  },
  onlineCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1e1'
  },
  offlineCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#333'
  }
});
