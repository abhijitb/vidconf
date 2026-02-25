# VidConf Project TODO

## Priority 1: Update Dependencies (Critical)
- [x] Update Socket.IO from 2.3.0 to 4.x (security vulnerabilities)
- [x] Update PeerJS from 0.5.3 to 1.x
- [x] Update Express from 4.17.1 to 4.21.x
- [x] Update EJS from 3.1.3 to latest
- [x] Update UUID from 8.3.0 to 11.x
- [x] Test all functionality after updates

## Priority 2: Fix PeerJS Configuration
- [x] Configure frontend to use local PeerJS server (port 3001) instead of Heroku
- [x] Ensure peerjs CLI is properly integrated
- [x] Add environment-based configuration for production deployment
- [x] Add SSL/secure WebSocket support for HTTPS deployments
- [x] Test peer connections locally

## Priority 3: Essential Features
- [ ] Add Mute/Unmute Audio button
- [ ] Add Video On/Off toggle
- [ ] Add Screen Sharing capability
- [ ] Add Chat/Messaging panel
- [x] Add Participant List display

## Priority 4: UI/UX Improvements
- [ ] Implement responsive design (mobile-friendly grid)
- [ ] Add Connection Status Indicators
- [ ] Add Copy Room Link button
- [ ] Add Leave Room button

## Priority 5: Technical Improvements
- [ ] Add error handling for camera/mic permissions
- [ ] Configure STUN/TURN servers for better NAT traversal
- [ ] Add proper logging for debugging
