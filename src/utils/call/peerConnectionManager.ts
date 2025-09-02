// utils/call/peerConnectionManager.ts
export interface PeerConnectionEvents {
  onRemoteStream: (stream: MediaStream) => void
  onIceCandidate: (candidate: RTCIceCandidate) => void
  onConnectionStateChange: (state: RTCPeerConnectionState) => void
}

export class PeerConnectionManager {
  private peerConnection: RTCPeerConnection | null = null
  private readonly config: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ],
  }

  create(localStream: MediaStream | null, events: PeerConnectionEvents): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.config)

    // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        console.log(`Adding ${track.kind} track to peer connection:`, track.label)
        pc.addTrack(track, localStream)
      })
    }

    // Set up event handlers
    pc.ontrack = (event) => {
      console.log("📥 Received remote track:", event.track.kind)
      if (event.streams?.[0]) {
        events.onRemoteStream(event.streams[0])
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        events.onIceCandidate(event.candidate)
      }
    }

    pc.onconnectionstatechange = () => {
      console.log("🔗 Peer connection state:", pc.connectionState)
      events.onConnectionStateChange(pc.connectionState)
    }

    this.peerConnection = pc
    return pc
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error("Peer connection not initialized")
    }
    
    const offer = await this.peerConnection.createOffer()
    await this.peerConnection.setLocalDescription(offer)
    return offer
  }

  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error("Peer connection not initialized")
    }

    await this.peerConnection.setRemoteDescription(offer)
    const answer = await this.peerConnection.createAnswer()
    await this.peerConnection.setLocalDescription(answer)
    return answer
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error("Peer connection not initialized")
    }
    
    await this.peerConnection.setRemoteDescription(description)
  }

  async addIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    if (!this.peerConnection) {
      throw new Error("Peer connection not initialized")
    }
    
    await this.peerConnection.addIceCandidate(candidate)
  }

  close(): void {
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }
  }

  get instance(): RTCPeerConnection | null {
    return this.peerConnection
  }
}