const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const participantsList = document.getElementById('participants-list')
const participantCount = document.getElementById('participant-count')
const chatMessages = document.getElementById('chat-messages')
const chatForm = document.getElementById('chat-form')
const chatInput = document.getElementById('chat-input')
const muteBtn = document.getElementById('mute-btn')
const videoBtn = document.getElementById('video-btn')
const welcomeModal = document.getElementById('welcome-modal')
const usernameInput = document.getElementById('username-input')
const joinBtn = document.getElementById('join-btn')
const mainContainer = document.getElementById('main-container')
const userNameDisplay = document.getElementById('user-name-display')
// Get or create persistent user ID from cookie
function getUserId() {
  const match = document.cookie.match(/userId=([^;]+)/)
  if (match) return match[1]
  
  const newId = crypto.randomUUID()
  // Set cookie to expire in 1 day
  document.cookie = `userId=${newId}; path=/; max-age=86400`
  return newId
}

// Get or set username from sessionStorage (persists across refreshes, clears on tab close)
function getUserName() {
  return sessionStorage.getItem('userName') || ''
}

function setUserName(name) {
  sessionStorage.setItem('userName', name)
}

const userId = getUserId()
let userName = getUserName()

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

// Handle welcome screen
joinBtn.addEventListener('click', () => {
  userName = usernameInput.value.trim() || 'Anonymous'
  setUserName(userName)
  startApp()
})

usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    joinBtn.click()
  }
})

function startApp() {
  welcomeModal.style.display = 'none'
  mainContainer.style.display = 'flex'
  userNameDisplay.textContent = userName
  initializeApp()
}

// Auto-start if username exists
if (userName) {
  usernameInput.value = userName
  startApp()
}

function initializeApp() {
  // Clear existing videos and participants (for refresh case)
  videoGrid.innerHTML = ''
  participantsList.innerHTML = ''
  participants.clear()
  Object.keys(userVideos).forEach(id => delete userVideos[id])
  Object.keys(peers).forEach(id => delete peers[id])
  
  // Add my video back
  if (myStream) {
    addVideoStream(myVideo, myStream)
  }
  
  // Set up peer call handler first
  myPeer.on('call', call => {
    console.log('Receiving call from:', call.peer)
    const video = document.createElement('video')
    video.id = `video-${call.peer}`
    
    call.on('stream', userVideoStream => {
      console.log('Received stream from:', call.peer)
      // Only add video if not already present
      if (!userVideos[call.peer]) {
        addVideoStream(video, userVideoStream)
        userVideos[call.peer] = video
      }
    })
    
    call.on('close', () => {
      video.remove()
      delete userVideos[call.peer]
    })
    
    call.on('error', err => {
      console.error('Receive call error from', call.peer, err)
    })
    
    // Answer with our stream once ready
    if (myStream) {
      call.answer(myStream)
    } else {
      // Wait for stream to be ready
      const checkStream = setInterval(() => {
        if (myStream) {
          call.answer(myStream)
          clearInterval(checkStream)
        }
      }, 100)
    }
  })

  navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  }).then(stream => {
    myStream = stream
    addVideoStream(myVideo, stream)

    // Process any pending users who connected before stream was ready
    pendingUsers.forEach(user => {
      connectToNewUser(user.id || user, stream)
      addParticipant(user.id || user, user.name)
    })
  })
}

socket.on('user-connected', (userId, userName) => {
  // Immediately remove any existing video/peer for this user (in case of reconnect)
  if (peers[userId]) {
    try {
      peers[userId].close()
    } catch (e) {}
    delete peers[userId]
  }
  removeVideo(userId)
  removeParticipant(userId)
  
  if (myStream) {
    connectToNewUser(userId, myStream)
    addParticipant(userId, userName)
  } else {
    pendingUsers.push({ id: userId, name: userName })
  }
})

socket.on('room-users', (users, myAssignedName) => {
  // Update my name if server assigned one
  if (myAssignedName) userName = myAssignedName
  
  users.forEach(user => {
    if (user.id !== myPeer.id) {
      // Clean up any existing connection first
      if (peers[user.id]) {
        try {
          peers[user.id].close()
        } catch (e) {}
        delete peers[user.id]
      }
      removeVideo(user.id)
      removeParticipant(user.id)
      
      addParticipant(user.id, user.name)
      if (myStream) {
        connectToNewUser(user.id, myStream)
      } else {
        pendingUsers.push(user)
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
  socket.emit('join-room', ROOM_ID, id, userName)
  addParticipant(id, userName, true)
})

// Clean up on page unload/refresh
window.addEventListener('beforeunload', () => {
  // Close all peer connections
  Object.keys(peers).forEach(userId => {
    if (peers[userId]) {
      peers[userId].close()
    }
  })
  // Disconnect socket
  socket.disconnect()
})

function addParticipant(userId, userName, isYou = false) {
  if (participants.has(userId)) {
    // Update name if already exists
    const li = document.getElementById(`participant-${userId}`)
    if (li && userName) {
      li.textContent = isYou ? `${userName} (You)` : userName
    }
    return
  }
  participants.add(userId)
  
  const displayName = userName || userId.substring(0, 8) + '...'
  const li = document.createElement('li')
  li.id = `participant-${userId}`
  li.textContent = isYou ? `${displayName} (You)` : displayName
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
  if (peers[userId]) {
    console.log('Already connected to:', userId)
    return
  }
  // Remove any existing video for this user first
  removeVideo(userId)
  
  console.log('Calling user:', userId)
  const call = myPeer.call(userId, stream)
  const video = document.createElement('video')
  video.id = `video-${userId}`
  
  call.on('stream', userVideoStream => {
    console.log('Received stream from:', userId)
    // Only add if video doesn't already exist
    if (!userVideos[userId]) {
      addVideoStream(video, userVideoStream)
      userVideos[userId] = video
    }
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
  const sender = data.senderName || data.sender.substring(0, 8) + '...'
  const isOwn = data.sender === userId
  addChatMessage(sender, data.text, isOwn)
})

socket.on('chat-history', messages => {
  chatMessages.innerHTML = ''
  messages.forEach(data => {
    const sender = data.senderName || data.sender.substring(0, 8) + '...'
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

// Audio/Video controls
let isAudioMuted = false
let isVideoStopped = false

muteBtn.addEventListener('click', () => {
  if (myStream) {
    isAudioMuted = !isAudioMuted
    myStream.getAudioTracks().forEach(track => {
      track.enabled = !isAudioMuted
    })
    muteBtn.classList.toggle('muted', isAudioMuted)
    muteBtn.querySelector('.label').textContent = isAudioMuted ? 'Unmute' : 'Mute'
    muteBtn.querySelector('.icon').textContent = isAudioMuted ? '🎤❌' : '🎤'
  }
})

videoBtn.addEventListener('click', () => {
  if (myStream) {
    isVideoStopped = !isVideoStopped
    myStream.getVideoTracks().forEach(track => {
      track.enabled = !isVideoStopped
    })
    videoBtn.classList.toggle('muted', isVideoStopped)
    videoBtn.querySelector('.label').textContent = isVideoStopped ? 'Start Video' : 'Stop Video'
    videoBtn.querySelector('.icon').textContent = isVideoStopped ? '📹❌' : '📹'
  }
})
