const SIGNAL_SERVER_URL = new URLSearchParams(window.location.search).get('signal_server')

let pc;
let dataChannel;
let signalingChannel;

class SignalingChannel {
    constructor(url) {
        this.socket = io(url, { autoConnect :  false });
        this.socket.connect()
    }

    static EVENT = 'message'

    addListener(listener) {
        this.socket.on(SignalingChannel.EVENT, listener)
    }

    send(msg) {
        this.socket.emit(SignalingChannel.EVENT, msg)
    }
}

function listener(message) {
    if (message.answer) {
        pc.setRemoteDescription(new RTCSessionDescription(message.answer));
        return;
    } else if (message.offer) {
        pc.setRemoteDescription(new RTCSessionDescription(message.offer));
        pc.createAnswer().then(
            gotAnswer,
            onCreateSessionDescriptionError
        );
        return;
    } else if (message.ice_candidate) {
        console.log(`remote ICE candidate: ${message.ice_candidate}`)
        pc.addIceCandidate(message.ice_candidate)
            .then(
                onAddIceCandidateSuccess,
                onAddIceCandidateError
            );
        return;
    }

    console.error(`Unhandled message: ${message}`)
}

const config = {'iceServers': [{'urls': 'stun:goma.avp.ru:3478'}]}

function startSender() {
    pc = new RTCPeerConnection(config)
    pc.onicecandidate = onIceCandidate;

    dataChannel = pc.createDataChannel('data-channel');
    dataChannel.onopen = onDataChannelStateChanged;
    dataChannel.onclose = onDataChannelStateChanged;

    signalingChannel = new SignalingChannel(SIGNAL_SERVER_URL)
    signalingChannel.addListener(listener);

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
    pc = new RTCPeerConnection(config)
    
    pc.onicecandidate = onIceCandidate;
    pc.ondatachannel = onReceiveDataChannel;

    signalingChannel = new SignalingChannel(SIGNAL_SERVER_URL);
    signalingChannel.addListener(listener);
}

function gotAnswer(desc) {
    pc.setLocalDescription(desc)
    console.log(`Answer from pc\n${desc.sdp}`);
    signalingChannel.send({'answer' : desc });
}

function onAddIceCandidateSuccess() {
    console.log('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
    console.log(`Failed to add Ice Candidate: ${error.toString()}`);
}

function onIceCandidate(e) {
    console.log(`my ICE candidate: ${e.candidate ? e.candidate.candidate : '(null)'}`)
    if (e.candidate) {
        signalingChannel.send({ 'ice_candidate' : e.candidate })
    }
}

function onConnectionStateChanged(e) {
    if (pc.connectionState === 'connected') {
        console.log('Peers connected!!!')
    }
}

function onDataChannelStateChanged() {
    const readyState = dataChannel.readyState;
    console.log(`data channel state: ${readyState}`)
}

function onReceiveMessage(event) {
    console.log(`Received Message: ${event.data}`);
}

function onReceiveDataChannel(event) {
    console.log('onReceiveDataChannel');
    dataChannel = event.channel;
    dataChannel.onmessage = onReceiveMessage;
    dataChannel.onopen = onDataChannelStateChanged;
    dataChannel.onclose = onDataChannelStateChanged;
}
