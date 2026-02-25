# Video Conferencing (VidConf)

VidConf is a real-time video conferencing application built with WebRTC, enabling multiple users to connect via peer-to-peer video and audio streaming directly in their browsers. The application features a modern, responsive interface with text chat, participant management, and media controls, making it ideal for small group meetings and virtual gatherings.

Built on Node.js and Express with Socket.IO for real-time signaling, VidConf leverages PeerJS for WebRTC peer connections and EJS for server-side templating. Key features include persistent user identity across page refreshes, chat history retention, mute/unmute controls, video on/off toggles, and a welcome screen for personalized display names. The application automatically generates unique room URLs for easy sharing and supports seamless reconnection when users refresh their browsers.

## Inspired by this video by Web Dev Simplified
https://www.youtube.com/watch?v=DvlyzDZDEq4

## Features

### Current Features
- **Multi-user video conferencing** with WebRTC peer-to-peer streaming
- **Real-time text chat** with message history persistence
- **Participant list** showing connected users with display names
- **Media controls** - mute/unmute audio, start/stop video
- **Welcome screen** for entering personalized display names
- **Persistent identity** - user name and ID persist across page refreshes
- **Automatic room generation** with unique, shareable URLs
- **Real-time notifications** for user join/leave events

### Technical Stack
- **Backend:** Node.js, Express, Socket.IO
- **Frontend:** Vanilla JavaScript, EJS templates
- **WebRTC:** PeerJS for peer-to-peer connections
- **Real-time:** Socket.IO for signaling and chat

## Installation

1. Checkout code in folder
2. Create .env file in the root folder and add the config

    PORT= < whatever port you want to run it on >

3. Run the command "npm install".
4. Run the command "node server.js" to start the server.
