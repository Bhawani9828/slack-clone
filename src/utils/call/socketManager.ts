// utils/call/socketManager.ts
export interface CallData {
  from: string
  to: string
  fromName?: string
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidate
  type?: "video" | "audio"
  callId: string
}

export interface SocketEvents {
  onIncomingCall: (data: CallData) => void
  onCallAccepted: (data: CallData) => void
  onCallRejected: (data: CallData) => void
  onCallEnded: (data: CallData) => void
  onIceCandidate: (data: CallData) => void
}

export class SocketManager {
  private socket: any = null

  async connect(socketService: any, currentUserId: string): Promise<boolean> {
    try {
      if (this.socket?.connected) {
        console.log("✅ Socket already connected")
        return true
      }

      console.log("🔌 Connecting socket for calls...")
      socketService.setCurrentUserId(currentUserId)
      this.socket = socketService.connect(currentUserId)

      if (!this.socket) {
        console.error("❌ Failed to create socket instance")
        return false
      }

      if (this.socket.connected) {
        console.log("✅ Socket connected immediately")
        return true
      }

      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn("⚠️ Socket connection timeout")
          resolve(this.socket.connected)
        }, 5000)

        const onConnect = () => {
          clearTimeout(timeout)
          this.socket.off("connect", onConnect)
          console.log("✅ Socket connected for calls")
          resolve(true)
        }

        this.socket.on("connect", onConnect)
      })
    } catch (error) {
      console.error("Socket connection error:", error)
      return false
    }
  }

  setupEventListeners(events: SocketEvents): () => void {
    if (!this.socket) {
      throw new Error("Socket not connected")
    }

    const eventMap = {
      "incoming-call": events.onIncomingCall,
      "call-accepted": events.onCallAccepted,
      "call-rejected": events.onCallRejected,
      "call-ended": events.onCallEnded,
      "ice-candidate": events.onIceCandidate,
    }

    // Clear existing listeners
    Object.keys(eventMap).forEach(event => this.socket.off(event))

    // Set up new listeners
    Object.entries(eventMap).forEach(([event, handler]) => {
      this.socket.on(event, handler)
    })

    console.log("✅ Call event listeners setup complete")

    // Return cleanup function
    return () => {
      Object.keys(eventMap).forEach(event => this.socket.off(event))
    }
  }

  emit(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    } else {
      console.warn("⚠️ Attempting to emit on disconnected socket")
    }
  }

  get isConnected(): boolean {
    return !!this.socket?.connected
  }
}