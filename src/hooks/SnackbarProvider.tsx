// hooks/SnackbarProvider.tsx
"use client"

import { createContext, useContext, ReactNode } from "react"
import { SnackbarState, useSnackbar } from "./use-snackbar";


interface SnackbarContextType {
  snackbarState: SnackbarState
  showSnackbar: (options: { title?: string; message: string; severity?: "success" | "error" | "info" | "warning"; duration?: number }) => void
  handleClose: (event?: React.SyntheticEvent | Event, reason?: string) => void
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined)

interface Props {
  children: ReactNode
}

export const SnackbarProvider = ({ children }: Props) => {
  const { snackbarState, showSnackbar, handleClose } = useSnackbar()
  return (
    <SnackbarContext.Provider value={{ snackbarState, showSnackbar, handleClose }}>
      {children}
    </SnackbarContext.Provider>
  )
}

// Custom hook to consume context
export const useSnackbarContext = () => {
  const context = useContext(SnackbarContext)
  if (!context) throw new Error("useSnackbarContext must be used within a SnackbarProvider")
  return context
}
