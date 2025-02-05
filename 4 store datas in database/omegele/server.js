const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { pool, dbOperations } = require('./db');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Add express JSON middleware
app.use(express.json());

// Queue to store waiting users
let waitingUsers = [];
// Store active chats
let activeChats = new Map();

async function findNewMatch(socket) {
    // Clean up any existing chat
    if (activeChats.has(socket.id)) {
        const oldPartnerId = activeChats.get(socket.id);
        io.to(oldPartnerId).emit('chatEnded');
        activeChats.delete(oldPartnerId);
        activeChats.delete(socket.id);
    }

    // Remove user from waiting list if they're there
    waitingUsers = waitingUsers.filter(id => id !== socket.id);

    // Find a new partner
    let matched = false;
    for (let i = 0; i < waitingUsers.length; i++) {
        const potentialPartner = waitingUsers[i];
        const partnerSocket = io.sockets.sockets.get(potentialPartner);
        
        if (partnerSocket && !activeChats.has(potentialPartner)) {
            // Remove the partner from waiting list
            waitingUsers.splice(i, 1);
            
            // Create new chat connection
            activeChats.set(socket.id, potentialPartner);
            activeChats.set(potentialPartner, socket.id);

            // Log the chat session in database
            try {
                const chatSession = await dbOperations.logChatSession(socket.id, potentialPartner);
                console.log('Chat session created:', chatSession.id);
            } catch (error) {
                console.error('Failed to log chat session:', error);
            }

            // Notify both users
            socket.emit('chatStarted', { partnerId: potentialPartner });
            io.to(potentialPartner).emit('chatStarted', { partnerId: socket.id });
            
            console.log('Matched:', socket.id, 'with', potentialPartner);
            matched = true;
            break;
        }
    }

    if (!matched) {
        // No match found, add to waiting list
        waitingUsers.push(socket.id);
        socket.emit('waiting');
        console.log('User waiting:', socket.id);
    }

    // Log current state
    console.log('Waiting Users:', waitingUsers);
    console.log('Active Chats:', Array.from(activeChats.entries()));
}

io.on('connection', async (socket) => {
    // Get the client's IP address
    const clientIp = socket.handshake.address;
    
    try {
        // Log the user connection
        const connectionLog = await dbOperations.logUserConnection(socket.id, clientIp);
        console.log('User connection logged with ID:', connectionLog.id);
    } catch (error) {
        console.error('Failed to log user connection:', error);
    }

    console.log('New user connected:', socket.id);

    socket.on('findChat', () => {
        console.log('Find chat request from:', socket.id);
        findNewMatch(socket);
    });

    socket.on('next', () => {
        console.log('Next request from:', socket.id);
        // Notify current partner that chat has ended
        const currentPartner = activeChats.get(socket.id);
        if (currentPartner) {
            io.to(currentPartner).emit('chatEnded');
        }
        
        // Find new match
        findNewMatch(socket);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Notify partner if in chat
        const partnerId = activeChats.get(socket.id);
        if (partnerId) {
            io.to(partnerId).emit('chatEnded');
            activeChats.delete(partnerId);
            activeChats.delete(socket.id);
        }
        
        // Remove from waiting list
        waitingUsers = waitingUsers.filter(id => id !== socket.id);
        
        console.log('Updated waiting users:', waitingUsers);
        console.log('Updated active chats:', Array.from(activeChats.entries()));
    });

    // WebRTC Signaling
    socket.on('offer', (data) => {
        const partnerId = activeChats.get(socket.id);
        if (partnerId) {
            io.to(partnerId).emit('offer', {
                offer: data.offer,
                from: socket.id
            });
        }
    });

    socket.on('answer', (data) => {
        const partnerId = activeChats.get(socket.id);
        if (partnerId) {
            io.to(partnerId).emit('answer', {
                answer: data.answer,
                from: socket.id
            });
        }
    });

    socket.on('iceCandidate', (data) => {
        const partnerId = activeChats.get(socket.id);
        if (partnerId) {
            io.to(partnerId).emit('iceCandidate', {
                candidate: data.candidate,
                from: socket.id
            });
        }
    });

    socket.on('sendMessage', (data) => {
        const partnerId = activeChats.get(socket.id);
        if (partnerId) {
            // Send message to partner
            io.to(partnerId).emit('messageReceived', {
                message: data.message
            });
        }
    });
});

// Debug logging every 5 seconds
setInterval(() => {
    console.log('Current state:');
    console.log('Waiting users:', waitingUsers);
    console.log('Active chats:', Array.from(activeChats.entries()));
}, 5000);

// Add POST endpoint for chat messages
app.post('/api/chat-message', async (req, res) => {
    const { senderId, receiverId, message, chatSessionId } = req.body;
    
    try {
        const result = await dbOperations.logChatMessage(senderId, receiverId, message, chatSessionId);
        res.json({ success: true, messageId: result.id });
    } catch (error) {
        console.error('Failed to log chat message:', error);
        res.status(500).json({ success: false, error: 'Failed to log message' });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 