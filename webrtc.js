import WebRTCLib from 'react-native-webrtc'
export async function scanDevices () {
  const devices = await WebRTCLib.MediaStreamTrack.getSources()
  if (Platform.OS === 'ios') {
    return devices[0]
  }
  return devices
}

export async function getNativeConstraints ({ video, audio }) {
  const constraints = {}

  if (audio) {
    constraints.audio = true
  }

  if (video) {
    const direction = 'front'

    constraints.video = {
      optional: [{ sourceId: null, facingMode: direction }]
    }

    const devices = await scanDevices()
    for (let d of devices) {
      if (d.kind.startsWith('video') && d.facing === direction) {
        constraints.video.optional.push({ sourceId: d.id, facingMode: d.facing })
      }
    }

    if (Platform.OS === 'android') {
      constraints.video.mandatory = {
        minWidth: 500,
        minHeight: 300,
        minFrameRate: 30
      }
    }

  }

  return constraints
}
