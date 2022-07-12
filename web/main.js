const SIGNALING_SERVER_URL = 'your_url:11112'
let pc;
let signalingChannel;

class SignalingChannel {
    constructor(url) {
        this.socket = io(url, { autoConnect :  false });
        this.socket.connect()
    }

    addEventListener(event, eventHandler) {
        this.socket.on(event, eventHandler)
    }

    send(msg) {
        this.socket.emit('message', msg)
    }
}

function startSender() {
    const config = null
    pc = new RTCPeerConnection(config)

    signalingChannel = new SignalingChannel(SIGNALING_SERVER_URL)

    signalingChannel.addEventListener('message', async message => {
        if (message.answer) {
            pc.setRemoteDescription(new RTCSessionDescription(message.anwser));
        }
    });

    pc.createOffer().then(
        gotOffer,
        onCreateSessionDescriptionError
    )
}

function gotOffer(desc) {
  pc.setLocalDescription(desc);
  console.log(`Offer from pc\n${desc.sdp}`);
  signalingChannel.send({'offer' : desc});
}
        
function onCreateSessionDescriptionError(error) {
  console.log('Failed to create session description: ' + error.toString());
}

function startReceiver() {
    const config = null
    pc = new RTCPeerConnection(config)
    signalingChannel = new SignalingChannel(SIGNALING_SERVER_URL);
    signalingChannel.addEventListener('message', async message => {
        if (message.offer) {
            pc.setRemoteDescription(new RTCSessionDescription(message.offer));
            pc.createAnswer().then(
                gotAnswer,
                onCreateSessionDescriptionError
            );
        }
    });
}

function gotAnswer(desc) {
    pc.setLocalDescription(desc)
    console.log(`Answer from pc\n${desc.sdp}`);
    signalingChannel.send({'answer' : desc });
}
