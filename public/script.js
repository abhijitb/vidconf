const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const participantsList = document.getElementById('participants-list')
const participantCount = document.getElementById('participant-count')
const myPeer = new Peer(undefined, {
  host: PEER_HOST,
  port: PEER_PORT,
  secure: PEER_SECURE
})
const myVideo = document.createElement('video')
myVideo.muted = true
const peers = {}
const participants = new Set()
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
    call.on('stream', userVideoStream => {
      console.log('Received stream from:', call.peer)
      addVideoStream(video, userVideoStream)
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
  if (peers[userId]) peers[userId].close()
  removeParticipant(userId)
})

myPeer.on('open', id => {
  socket.emit('join-room', ROOM_ID, id)
  addParticipant(id, true)
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
  call.on('stream', userVideoStream => {
    console.log('Received stream from:', userId)
    addVideoStream(video, userVideoStream)
  })
  call.on('close', () => {
    video.remove()
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
