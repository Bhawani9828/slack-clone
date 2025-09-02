// utils/call/callStateManager.ts
export interface CallState {
  targetUserId?: string
  type?: "video" | "audio"
  callId?: string
}

export interface IncomingCall {
  from: string
  type: "video" | "audio"
  offer: RTCSessionDescriptionInit
  fromName?: string
  callId?: string
}

export class CallStateManager {
  private currentCall: CallState = {}
  private justAcceptedAt: number = 0

  setCurrentCall(call: Partial<CallState>): void {
    this.currentCall = { ...this.currentCall, ...call }
  }

  getCurrentCall(): CallState {
    return { ...this.currentCall }
  }

  clearCurrentCall(): void {
    this.currentCall = {}
  }

  setJustAcceptedAt(timestamp: number): void {
    this.justAcceptedAt = timestamp
  }

  shouldIgnoreSpuriousEndCall(): boolean {
    return Date.now() - this.justAcceptedAt < 2000
  }

  generateCallId(currentUserId: string): string {
    return `${Date.now()}-${currentUserId}`
  }

  isValidCallId(receivedCallId: string): boolean {
    return !!receivedCallId && receivedCallId === this.currentCall.callId
  }
}