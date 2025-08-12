"use client"

import type React from "react"
import { Snackbar, Alert } from "@mui/material"

interface CustomSnackbarProps {
  open: boolean
  message: string
  severity: "success" | "error" | "info" | "warning"
  onClose: (event?: React.SyntheticEvent | Event, reason?: string) => void
}

export function CustomSnackbar({ open, message, severity, onClose }: CustomSnackbarProps) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
    >
      <Alert onClose={onClose} severity={severity} sx={{ width: "100%" }}>
        {message}
      </Alert>
    </Snackbar>
  )
}
