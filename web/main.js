const SIGNAL_SERVER_URL = "52.58.218.62:56560"

let pc;
let dataChannel;
let signalingChannel;

let startSenderButton = document.querySelector('button#startSender');
let startReceiverButton = document.querySelector('button#startReceiver');
let sendTextButton = document.querySelector('button#sendButton');
const video = document.querySelector('#remoteVideo');
const audio = document.querySelector('#remoteAudio');
const messageArea = document.querySelector('#messageArea');

startReceiverButton.onclick = startReceiver;
startSenderButton.onclick = startSender;
sendTextButton.onclick = sendMessage;

const params = new URLSearchParams(window.location.search)
const peer_type = params.get('peer')

startSenderButton.hidden = !(peer_type === 'sender')
startReceiverButton.hidden = !(peer_type === 'receiver')

const screenSharingEnabled = params.has('screen_sharing')
video.hidden = !screenSharingEnabled;

const audioEnabled = params.has('audio');
const videoEnabled = false;
const mediaEnabled = audioEnabled || videoEnabled;

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
            onErrorHandle
        );
        return;
    } else if (message.ice_candidate) {
        icec = message.ice_candidate
        console.log(`remote ICE candidate: ${icec ? icec.candidate : '(null)'}`)
        pc.addIceCandidate(icec)
            .then(
                onAddIceCandidateSuccess,
                onAddIceCandidateError
            );
        return;
    }

    console.error(`Unhandled message: ${message}`)
}

const config = {
    iceServers: [
        {
	    urls: 'turn:openrelay.metered.ca:80?transport=tcp',
	    username: 'openrelayproject',
	    credential: 'openrelayproject'
	}
    ]
}

async function startSender() {
    pc = new RTCPeerConnection(config)
    pc.onicecandidate = onIceCandidate;

    if (screenSharingEnabled) {
	const stream = await navigator.mediaDevices.getDisplayMedia({
	    video: {
                cursor: "always"
	    },
	    audio: true
	});
	onReceivedDisplayStream(stream);
    }

    if (mediaEnabled) {
        const stream = await navigator.mediaDevices.getUserMedia(
            {audio: audioEnabled, video: videoEnabled}
        );
        onReceiveMediaStream(stream);
    }

    dataChannel = pc.createDataChannel('data-channel');
    dataChannel.onopen = onDataChannelStateChanged;
    dataChannel.onclose = onDataChannelStateChanged;

    signalingChannel = new SignalingChannel(SIGNAL_SERVER_URL)
    signalingChannel.addListener(listener);

    pc.createOffer().then(
        gotOffer,
        onErrorHandle
    )

    sendTextButton.hidden = false;
    startSenderButton.disabled = true;
    messageArea.disabled = false;
}

function onReceivedDisplayStream(stream) {
    video.srcObject = stream;
    addTracksToPeerConnection(stream, pc);
}

function onReceiveMediaStream(stream) {
    addTracksToPeerConnection(stream, pc);
}

function addTracksToPeerConnection(stream, peerConnection) {
    stream.getTracks().forEach(track => {
        console.log(`Add new track: ${track}`)
        peerConnection.addTrack(track, stream);
    });
}

function gotOffer(desc) {
  pc.setLocalDescription(desc);
  console.log(`Offer from pc\n${desc.sdp}`);
  signalingChannel.send({'offer' : desc});
}

function onErrorHandle(error) {
  console.log('Failed to create session description: ' + error.toString());
}

function startReceiver() {
    pc = new RTCPeerConnection(config)

    if (screenSharingEnabled || mediaEnabled) {
        pc.ontrack = onReceiveTrack;
    }

    pc.onicecandidate = onIceCandidate;
    pc.ondatachannel = onReceiveDataChannel;

    signalingChannel = new SignalingChannel(SIGNAL_SERVER_URL);
    signalingChannel.addListener(listener);

    startReceiverButton.disabled = true;
}

function sendMessage() {
    const data = messageArea.value;
    dataChannel.send(data);
    console.log(`Send message: ${data}`);
}

function onReceiveTrack(event) {
    const track_kind = event.track.kind;
    console.log(`Track of kind ${track_kind} received`);

    const [remoteStream] = event.streams;
    if (track_kind === 'video') {
        const remoteVideo = document.querySelector("#remoteVideo");
        remoteVideo.srcObject = remoteStream;
    }

    if (track_kind === 'audio') {
        audio.srcObject = remoteStream;
    }
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
    messageArea.value = event.data;
    console.log(`Received Message: ${event.data}`);
}

function onReceiveDataChannel(event) {
    console.log('onReceiveDataChannel');
    dataChannel = event.channel;
    dataChannel.onmessage = onReceiveMessage;
    dataChannel.onopen = onDataChannelStateChanged;
    dataChannel.onclose = onDataChannelStateChanged;
}
