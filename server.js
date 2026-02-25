require('dotenv').config()
const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')

// Store chat messages per room (in-memory, limited to last 100 messages)
const roomChats = new Map()
const MAX_MESSAGES = 100

app.set('view engine', 'ejs')
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.redirect(`/${uuidV4()}`)
})

app.get('/:room', (req, res) => {
  res.render('room', { 
    roomId: req.params.room,
    peerHost: process.env.PEER_HOST || '/',
    peerPort: process.env.PEER_PORT || 3001,
    peerSecure: process.env.PEER_SECURE === 'true'
  })
})

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId, userName) => {
    socket.join(roomId)
    socket.userId = userId
    socket.userName = userName || userId.substring(0, 8)
    socket.roomId = roomId
    
    // Get all users in the room (excluding this socket)
    const room = io.sockets.adapter.rooms.get(roomId)
    const users = []
    let isDuplicate = false
    
    if (room) {
      room.forEach(socketId => {
        if (socketId === socket.id) return
        const userSocket = io.sockets.sockets.get(socketId)
        if (userSocket && userSocket.userId) {
          users.push({
            id: userSocket.userId,
            name: userSocket.userName
          })
          // Check if this user ID already exists in the room
          if (userSocket.userId === userId) {
            isDuplicate = true
          }
        }
      })
    }
    
    // Send existing users to the new user
    socket.emit('room-users', users, socket.userName)
    
    // Send chat history to the new user
    const chatHistory = roomChats.get(roomId) || []
    socket.emit('chat-history', chatHistory)
    
    // Only notify others if this is a new user (not a reconnect)
    if (!isDuplicate) {
      socket.to(roomId).emit('user-connected', userId, socket.userName)
    }

    socket.on('disconnect', () => {
      // Check if this user has another active connection in the room
      const currentRoom = io.sockets.adapter.rooms.get(roomId)
      let hasOtherConnection = false
      if (currentRoom) {
        currentRoom.forEach(socketId => {
          const userSocket = io.sockets.sockets.get(socketId)
          if (userSocket && userSocket.userId === userId) {
            hasOtherConnection = true
          }
        })
      }
      // Only emit disconnect if no other connections exist
      if (!hasOtherConnection) {
        socket.to(roomId).emit('user-disconnected', userId)
      }
    })
    
    socket.on('chat-message', message => {
      const messageData = {
        sender: userId,
        senderName: socket.userName,
        text: message,
        timestamp: new Date().toISOString()
      }
      
      // Store message in room history
      if (!roomChats.has(roomId)) {
        roomChats.set(roomId, [])
      }
      const roomMessages = roomChats.get(roomId)
      roomMessages.push(messageData)
      
      // Keep only last MAX_MESSAGES
      if (roomMessages.length > MAX_MESSAGES) {
        roomMessages.shift()
      }
      
      socket.to(roomId).emit('chat-message', messageData)
    })
  })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
