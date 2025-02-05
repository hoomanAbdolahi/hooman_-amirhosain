const socket = io();

const welcomeScreen = document.getElementById('welcome-screen');
const chatContainer = document.getElementById('chat-container');
const startButton = document.getElementById('start-chat');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const nextButton = document.getElementById('next-button');
const messagesDiv = document.getElementById('messages');
const statusDiv = document.getElementById('status');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let currentPartner = null;
let localStream = null;
let peerConnection = null;
let isInitiator = false;
let currentChatSessionId = null;

const servers = {
    iceServers: [
        {
            urls: [
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302'
            ]
        }
    ]
};


async function initializeMedia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        localVideo.srcObject = localStream;
        await localVideo.play().catch(e => console.log('Play error:', e));
    } catch (err) {
        console.error('Error accessing media devices:', err);
        statusDiv.textContent = 'Error accessing camera/microphone';
    }
}

async function createPeerConnection() {
    try {
        if (peerConnection) {
            peerConnection.close();
        }
        
        peerConnection = new RTCPeerConnection(servers);
        console.log('Created new peer connection');

        // Add all local tracks to the peer connection
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
            console.log('Added local track:', track.kind);
        });

        // Handle incoming streams
        peerConnection.ontrack = (event) => {
            console.log('Received remote track:', event.track.kind);
            remoteVideo.srcObject = event.streams[0];
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Sending ICE candidate');
                socket.emit('iceCandidate', {
                    candidate: event.candidate
                });
            }
        };

        peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE Connection State:', peerConnection.iceConnectionState);
        };

        peerConnection.onsignalingstatechange = () => {
            console.log('Signaling State:', peerConnection.signalingState);
        };

    } catch (err) {
        console.error('Error creating peer connection:', err);
    }
}

async function createOffer() {
    try {
        console.log('Creating offer');
        const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });
        await peerConnection.setLocalDescription(offer);
        console.log('Sending offer');
        socket.emit('offer', { offer });
    } catch (err) {
        console.error('Error creating offer:', err);
    }
}

async function handleOffer(offer) {
    try {
        if (!peerConnection) {
            await createPeerConnection();
        }
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', { answer });
    } catch (err) {
        console.error('Error handling offer:', err);
    }
}

startButton.addEventListener('click', async () => {
    await initializeMedia();
    welcomeScreen.style.display = 'none';
    chatContainer.style.display = 'block';
    socket.emit('findChat');
});

sendButton.addEventListener('click', sendMessage);
nextButton.addEventListener('click', () => {
    socket.emit('next');
    clearChat();
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

async function sendMessage() {
    const message = messageInput.value.trim();
    if (message && currentPartner) {
        socket.emit('sendMessage', { message });
        addMessage(message, 'sent');
        
        try {
            const response = await fetch('/api/chat-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    senderId: socket.id,
                    receiverId: currentPartner,
                    message: message,
                    chatSessionId: currentChatSessionId
                })
            });

            const data = await response.json();
            if (!data.success) {
                console.error('Failed to log message:', data.error);
            }
        } catch (error) {
            console.error('Error logging message:', error);
        }

        messageInput.value = '';
    }
}

function addMessage(message, type) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', type);
    messageElement.textContent = message;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function clearChat() {
    messagesDiv.innerHTML = '';
    statusDiv.textContent = 'Looking for someone to chat with...';
    messageInput.disabled = true;
    sendButton.disabled = true;
    currentPartner = null;
    currentChatSessionId = null;
    isInitiator = false;
    
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (remoteVideo.srcObject) {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
    }
}

// Socket event handlers
socket.on('waiting', () => {
    statusDiv.textContent = 'Looking for someone to chat with...';
    isInitiator = true;
});

socket.on('chatStarted', async ({ partnerId, chatSessionId }) => {
    currentPartner = partnerId;
    currentChatSessionId = chatSessionId;
    statusDiv.textContent = 'Connected! Starting video chat...';
    messageInput.disabled = false;
    sendButton.disabled = false;

    try {
        await createPeerConnection();
        if (isInitiator) {
            console.log('Creating offer as initiator');
            await createOffer();
        }
    } catch (err) {
        console.error('Error in chat start:', err);
    }
});

socket.on('offer', async ({ offer }) => {
    console.log('Received offer');
    try {
        if (!peerConnection) {
            await createPeerConnection();
        }
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', { answer });
    } catch (err) {
        console.error('Error handling offer:', err);
    }
});

socket.on('answer', async ({ answer }) => {
    console.log('Received answer');
    try {
        if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
    } catch (err) {
        console.error('Error handling answer:', err);
    }
});

socket.on('iceCandidate', async ({ candidate }) => {
    console.log('Received ICE candidate');
    try {
        if (peerConnection) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    } catch (err) {
        console.error('Error adding ICE candidate:', err);
    }
});

socket.on('messageReceived', ({ message }) => {
    addMessage(message, 'received');
});

socket.on('chatEnded', () => {
    clearChat();
});

const toggleMicButton = document.getElementById("toggle-mic");
const toggleVideoButton = document.getElementById("toggle-video");

let isMicMuted = false;
let isVideoOff = false;

// مدیریت قطع و وصل میکروفون
toggleMicButton.addEventListener("click", () => {
    if (localStream) {
        localStream.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
        });

        isMicMuted = !isMicMuted;
        toggleMicButton.textContent = isMicMuted ? "🔇 Unmute" : "🎤 Mute";
        toggleMicButton.classList.toggle("muted", isMicMuted);
    }
});

// مدیریت قطع و وصل ویدیو
toggleVideoButton.addEventListener("click", () => {
    if (localStream) {
        localStream.getVideoTracks().forEach(track => {
            track.enabled = !track.enabled;
        });

        isVideoOff = !isVideoOff;
        toggleVideoButton.textContent = isVideoOff ? "📹 Start Video" : "📷 Stop Video";
        toggleVideoButton.classList.toggle("muted", isVideoOff);
    }
});


// Handle page unload
window.addEventListener('beforeunload', () => {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
        peerConnection.close();
    }
});