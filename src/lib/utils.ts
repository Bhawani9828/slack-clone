
// @/lib/utils.ts 
export const formatLastSeen = (lastSeen: string): { time: string; isOnline: boolean } => {
  const lastSeenDate = new Date(lastSeen)
  const now = new Date()
  const diffMs = now.getTime() - lastSeenDate.getTime()
  const diffMinutes = Math.round(diffMs / (1000 * 60))
  let timeString = ""
  let onlineStatus = false

  if (diffMinutes < 5) {
    timeString = "JUST NOW"
    onlineStatus = true
  } else if (diffMinutes < 60) {
    timeString = `${diffMinutes} Mins Ago`
  } else if (lastSeenDate.toDateString() === now.toDateString()) {
    timeString = lastSeenDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } else {
    timeString = lastSeenDate.toLocaleDateString()
  }
  return { time: timeString, isOnline: onlineStatus }
}
