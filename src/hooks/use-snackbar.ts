"use client"

import { useState, useCallback } from "react"

type SnackbarSeverity = "success" | "error" | "info" | "warning"

export interface SnackbarOptions {
  title?: string
  message: string
  severity?: SnackbarSeverity
  duration?: number
}

export interface SnackbarState {
  open: boolean
  message: string
  severity: SnackbarSeverity
  duration: number
}

export function useSnackbar() {
  const [snackbarState, setSnackbarState] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "info",
    duration: 5000,
  })

  const showSnackbar = useCallback((options: SnackbarOptions) => {
    const { title, message, severity = "info", duration = 5000 } = options
    setSnackbarState({
      open: true,
      message: title ? `${title}: ${message}` : message,
      severity,
      duration,
    })
  }, [])

  const handleClose = useCallback(
    (event?: React.SyntheticEvent | Event, reason?: string) => {
      if (reason === "clickaway") return
      setSnackbarState((prev) => ({ ...prev, open: false }))
    },
    []
  )

  return {
    snackbarState,
    showSnackbar,
    handleClose,
  }
}
