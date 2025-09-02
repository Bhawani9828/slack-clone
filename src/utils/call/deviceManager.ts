
// utils/call/deviceManager.ts
export interface DeviceStatus {
  camera: boolean
  microphone: boolean
  checking: boolean
}

export class DeviceManager {
  private static instance: DeviceManager
  
  static getInstance(): DeviceManager {
    if (!DeviceManager.instance) {
      DeviceManager.instance = new DeviceManager()
    }
    return DeviceManager.instance
  }

  async checkAndPrepareDevices(
    constraints: MediaStreamConstraints,
    currentStream: MediaStream | null,
    setDeviceStatus: (status: DeviceStatus | ((prev: DeviceStatus) => DeviceStatus)) => void,
    setCallError: (error: string | null) => void
  ): Promise<boolean> {
    try {
      setDeviceStatus(prev => ({ ...prev, checking: true }))
      setCallError(null)

      console.log("🔍 Starting device check with constraints:", constraints)

      // Stop existing streams
      if (currentStream) {
        currentStream.getTracks().forEach(track => {
          track.stop()
          console.log(`Stopped ${track.kind} track: ${track.label}`)
        })
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Check browser support
      if (!navigator.mediaDevices?.enumerateDevices) {
        setCallError("Media devices not supported in this browser")
        setDeviceStatus(prev => ({ ...prev, checking: false }))
        return false
      }

      // Enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices()
      const hasCamera = devices.some(device => device.kind === "videoinput")
      const hasMicrophone = devices.some(device => device.kind === "audioinput")

      setDeviceStatus({
        camera: hasCamera,
        microphone: hasMicrophone,
        checking: false,
      })

      // Validate required devices
      if (constraints.video && !hasCamera) {
        const error = "No camera found. Please connect a camera and try again."
        setCallError(error)
        throw new Error(error)
      }

      if (constraints.audio && !hasMicrophone) {
        const error = "No microphone found. Please connect a microphone and try again."
        setCallError(error)
        throw new Error(error)
      }

      // Test device accessibility
      return await this.testDeviceAccess(constraints)
    } catch (error) {
      setDeviceStatus(prev => ({ ...prev, checking: false }))
      throw error
    }
  }

  private async testDeviceAccess(constraints: MediaStreamConstraints): Promise<boolean> {
    try {
      const testStream = await navigator.mediaDevices.getUserMedia(constraints)
      testStream.getTracks().forEach(track => track.stop())
      await new Promise(resolve => setTimeout(resolve, 200))
      return true
    } catch (error) {
      console.error("Device test failed:", error)
      throw new Error("Failed to access camera/microphone.")
    }
  }

  async initLocalStream(constraints: MediaStreamConstraints): Promise<MediaStream> {
    console.log("🎥 Requesting media stream with constraints:", constraints)
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    
    console.log("✅ Got media stream with tracks:", 
      stream.getTracks().map(t => ({
        kind: t.kind,
        label: t.label,
        enabled: t.enabled,
        readyState: t.readyState,
      }))
    )
    
    return stream
  }
}