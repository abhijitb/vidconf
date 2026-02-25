const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const participantsList = document.getElementById('participants-list')
const participantCount = document.getElementById('participant-count')
const chatMessages = document.getElementById('chat-messages')
const chatForm = document.getElementById('chat-form')
const chatInput = document.getElementById('chat-input')
// Get or create persistent user ID from cookie
function getUserId() {
  const match = document.cookie.match(/userId=([^;]+)/)
  if (match) return match[1]
  
  const newId = crypto.randomUUID()
  // Set cookie to expire in 1 day
  document.cookie = `userId=${newId}; path=/; max-age=86400`
  return newId
}

const userId = getUserId()

const myPeer = new Peer(userId, {
  host: PEER_HOST,
  port: PEER_PORT,
  secure: PEER_SECURE
})
const myVideo = document.createElement('video')
myVideo.muted = true
const peers = {}
const participants = new Set()
const userVideos = {}
let myStream = null

// Queue for users who connected before stream was ready
const pendingUsers = []

navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  myStream = stream
  addVideoStream(myVideo, stream)

  myPeer.on('call', call => {
    console.log('Receiving call from:', call.peer)
    call.answer(stream)
    const video = document.createElement('video')
    video.id = `video-${call.peer}`
    call.on('stream', userVideoStream => {
      console.log('Received stream from:', call.peer)
      addVideoStream(video, userVideoStream)
      userVideos[call.peer] = video
    })
    call.on('close', () => {
      video.remove()
      delete userVideos[call.peer]
    })
    call.on('error', err => {
      console.error('Receive call error from', call.peer, err)
    })
  })

  // Process any pending users who connected before stream was ready
  pendingUsers.forEach(userId => {
    connectToNewUser(userId, stream)
    addParticipant(userId)
  })
})

socket.on('user-connected', userId => {
  if (myStream) {
    connectToNewUser(userId, myStream)
    addParticipant(userId)
  } else {
    pendingUsers.push(userId)
  }
})

socket.on('room-users', users => {
  users.forEach(userId => {
    if (userId !== myPeer.id) {
      addParticipant(userId)
      if (myStream) {
        connectToNewUser(userId, myStream)
      } else {
        pendingUsers.push(userId)
      }
    }
  })
})

socket.on('user-disconnected', userId => {
  if (peers[userId]) {
    peers[userId].close()
    delete peers[userId]
  }
  removeParticipant(userId)
  removeVideo(userId)
})

myPeer.on('open', id => {
  socket.emit('join-room', ROOM_ID, id)
  addParticipant(id, true)
})

// Clear userId cookie when window is closed
window.addEventListener('beforeunload', () => {
  document.cookie = 'userId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
})

function addParticipant(userId, isYou = false) {
  if (participants.has(userId)) return
  participants.add(userId)
  
  const li = document.createElement('li')
  li.id = `participant-${userId}`
  li.textContent = isYou ? `${userId.substring(0, 8)}... (You)` : userId.substring(0, 8) + '...'
  if (isYou) li.classList.add('you')
  participantsList.appendChild(li)
  updateParticipantCount()
}

function removeParticipant(userId) {
  if (!participants.has(userId)) return
  participants.delete(userId)
  
  const li = document.getElementById(`participant-${userId}`)
  if (li) li.remove()
  updateParticipantCount()
}

function updateParticipantCount() {
  participantCount.textContent = participants.size
}

function connectToNewUser(userId, stream) {
  if (peers[userId]) return
  console.log('Calling user:', userId)
  const call = myPeer.call(userId, stream)
  const video = document.createElement('video')
  video.id = `video-${userId}`
  call.on('stream', userVideoStream => {
    console.log('Received stream from:', userId)
    addVideoStream(video, userVideoStream)
    userVideos[userId] = video
  })
  call.on('close', () => {
    video.remove()
    delete userVideos[userId]
  })
  call.on('error', err => {
    console.error('Call error with', userId, err)
  })

  peers[userId] = call
}

function addVideoStream(video, stream) {
  video.srcObject = stream
  video.addEventListener('loadedmetadata', () => {
    video.play()
  })
  videoGrid.append(video)
}

function removeVideo(userId) {
  const video = userVideos[userId]
  if (video) {
    video.remove()
    delete userVideos[userId]
  }
}

// Chat functionality
chatForm.addEventListener('submit', e => {
  e.preventDefault()
  const message = chatInput.value.trim()
  if (message) {
    socket.emit('chat-message', message)
    addChatMessage('You', message, true)
    chatInput.value = ''
  }
})

socket.on('chat-message', data => {
  const sender = data.sender.substring(0, 8) + '...'
  const isOwn = data.sender === userId
  addChatMessage(sender, data.text, isOwn)
})

socket.on('chat-history', messages => {
  chatMessages.innerHTML = ''
  messages.forEach(data => {
    const sender = data.sender.substring(0, 8) + '...'
    const isOwn = data.sender === userId
    addChatMessage(sender, data.text, isOwn)
  })
})

function addChatMessage(sender, text, isOwn) {
  const messageDiv = document.createElement('div')
  messageDiv.className = `chat-message ${isOwn ? 'own' : ''}`
  messageDiv.innerHTML = `
    <div class="sender">${sender}</div>
    <div class="text">${escapeHtml(text)}</div>
  `
  chatMessages.appendChild(messageDiv)
  chatMessages.scrollTop = chatMessages.scrollHeight
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
