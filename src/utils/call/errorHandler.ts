// utils/call/errorHandler.ts
export class CallErrorHandler {
  static logError(context: string, error: any): any {
    const errorInfo = {
      context,
      message: error?.message || "Unknown error",
      name: error?.name || "UnknownError",
      stack: error?.stack,
      constraint: error?.constraint,
      code: error?.code,
      toString: error?.toString?.() || String(error),
    }
    console.error(`❌ ${context}:`, errorInfo)
    return errorInfo
  }

  static handleDeviceError(error: any): string {
    const domError = error as DOMException
    
    switch (domError.name) {
      case "NotAllowedError":
        return "Permission denied. Please allow camera/microphone access."
      case "NotFoundError":
        return "No camera/microphone found. Please connect a device."
      case "NotReadableError":
        return "Device is busy or in use by another application."
      case "OverconstrainedError":
        return "Device doesn't support the requested settings."
      case "AbortError":
        return "Device access was aborted."
      case "SecurityError":
        return "Device access blocked by security policy."
      default:
        return `Device error: ${domError.message || "Unknown error"}`
    }
  }
}