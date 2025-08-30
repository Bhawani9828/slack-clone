"use client"

import type React from "react"

import { useState, useCallback } from "react"

type SnackbarSeverity = "success" | "error" | "info" | "warning"

interface SnackbarState {
  open: boolean
  message: string
  severity: SnackbarSeverity
}

export function useSnackbar() {
  const [snackbarState, setSnackbarState] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "info",
  })

  const showSnackbar = useCallback((message: string, severity: SnackbarSeverity = "info") => {
    setSnackbarState({
      open: true,
      message,
      severity,
    })
  }, [])

  const handleClose = useCallback((event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") {
      return
    }
    setSnackbarState((prev) => ({ ...prev, open: false }))
  }, [])

  return {
    snackbarState,
    showSnackbar,
    handleClose,
  }
}
