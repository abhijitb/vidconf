require('dotenv').config()
const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')

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
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId)
    socket.userId = userId
    socket.roomId = roomId
    
    // Get all users in the room
    const room = io.sockets.adapter.rooms.get(roomId)
    const users = []
    if (room) {
      room.forEach(socketId => {
        const userSocket = io.sockets.sockets.get(socketId)
        if (userSocket && userSocket.userId) {
          users.push(userSocket.userId)
        }
      })
    }
    
    // Send existing users to the new user
    socket.emit('room-users', users)
    
    // Notify others about new user
    socket.to(roomId).emit('user-connected', userId)

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', userId)
    })
  })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
