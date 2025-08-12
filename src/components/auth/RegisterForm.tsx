"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Card,
  CardContent,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar, // Import Snackbar
  Alert, // Import Alert
} from "@mui/material"
import { styled } from "@mui/system"
import { useRouter } from "next/navigation"
// Removed: import toast from "react-hot-toast";
import { postApi } from "@/axios/apiService"
import API_ENDPOINTS from "@/axios/apiEndpoints"
import type { AxiosError } from "axios"

// Define the types if they are not already defined in "@/types/registerTypes"
type RegisterFormData = {
  name: string
  countryCode: string
  mobileNumber: string
}

type RegisterApiResponse = {
  message: string
  // Add other fields your API might return on success
}

// Custom styled TextField to match the design's border radius and focus color
const StyledTextField = styled(TextField)({
  "& .MuiOutlinedInput-root": {
    borderRadius: "0.5rem", // Equivalent to rounded-lg
    "&.Mui-focused fieldset": {
      borderColor: "#00B09B", // accent-green on focus
    },
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "#00B09B", // accent-green for label on focus
  },
})

// Custom styled Select to match the design's border radius and focus color
const StyledSelect = styled(Select)({
  "& .MuiOutlinedInput-root": {
    borderRadius: "0.5rem", // Equivalent to rounded-lg
    "&.Mui-focused fieldset": {
      borderColor: "#00B09B", // accent-green on focus
    },
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "#00B09B", // accent-green for label on focus
  },
})

export default function RegisterForm() {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: "",
    countryCode: "+1", // Default country code
    mobileNumber: "",
  })
  const [loading, setLoading] = useState(false) // Added loading state
  const [errors, setErrors] = useState<Record<string, string>>({}) // Keep errors state for potential client-side validation

  // State for Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState("")
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error" | "info" | "warning">("info")

  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error for the field being changed
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleCountryCodeChange = (e: any) => {
    setFormData((prev) => ({
      ...prev,
      countryCode: e.target.value as string,
    }))
  }

  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") {
      return
    }
    setSnackbarOpen(false)
  }

  const showSnackbar = (message: string, severity: "success" | "error" | "info" | "warning") => {
    setSnackbarMessage(message)
    setSnackbarSeverity(severity)
    setSnackbarOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true) // Set loading to true on submission
    setErrors({}) // Clear previous errors

    // Basic client-side validation (you can integrate Zod here if preferred)
    const newErrors: Record<string, string> = {}
    if (!formData.name) newErrors.name = "User Name is required"
    if (!formData.mobileNumber) newErrors.mobileNumber = "Mobile Number is required"
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setLoading(false)
      showSnackbar("Please fill in all required fields.", "error")
      return
    }

    try {
      const payload = {
        name: formData.name,
        mobileNumber: formData.countryCode + formData.mobileNumber, 
      }

      const responseData = await postApi<RegisterApiResponse>(
        API_ENDPOINTS.REGISTER,
        payload as RegisterFormData, 
      )

      if (responseData?.message) {
        showSnackbar(responseData.message, "success")
        router.push("/verify") 
      } else {
        showSnackbar("Something went wrong!", "error")
      }
    } catch (error: unknown) {
      const err = error as AxiosError<{ message: string }>
      const errorMessage = err?.response?.data?.message || "Registration failed"
      showSnackbar(errorMessage, "error")
    } finally {
      setLoading(false) 
    }
  }

  const handleLoginRedirect = () => {
    router.push("/login")
  }

  return (
    <Card className="mx-auto w-full max-w-md auth_cart">
      <CardContent className="p-8 space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <Image src="/01.png" alt="Chatzy Logo" width={64} height={64} className="h-16 w-16" />
          <h1 className="text-2xl font-bold text-gray-800">Welcome to My Chat!</h1>
          <p className="text-sm text-text-gray text-center">Access your chat from a computer anytime, anyplace.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <InputLabel htmlFor="username" className="text-sm font-medium text-gray-700 mb-1">
              User Name
            </InputLabel>
            <StyledTextField
              id="username"
              name="name" 
              placeholder="TestUser"
              variant="outlined"
              fullWidth
              size="small"
              value={formData.name}
              onChange={handleChange}
              error={!!errors.name}
              helperText={errors.name}
            />
          </div>

          <div className="space-y-2">
            <InputLabel htmlFor="mobile-number" className="text-sm font-medium text-gray-700 mb-1">
              Enter Your Mobile Number
            </InputLabel>
            <div className="flex gap-2">
              <FormControl variant="outlined" size="small" sx={{ width: "130px" }}>
                <InputLabel id="country-code-label">Code</InputLabel>
                <StyledSelect
                  labelId="country-code-label"
                  id="country-code-select"
                  name="countryCode" // Added name prop
                  value={formData.countryCode}
                  label="Code"
                  onChange={handleCountryCodeChange} // Specific handler for select
                >
                  <MenuItem value="+1">(+1)</MenuItem>
                  <MenuItem value="+44">(+44)</MenuItem>
                  <MenuItem value="+91">(+91)</MenuItem>
                </StyledSelect>
              </FormControl>
              <StyledTextField
                id="mobile-number"
                name="mobileNumber" // Added name prop for handleChange
                placeholder="0738036136"
                variant="outlined"
                fullWidth
                size="small"
                value={formData.mobileNumber}
                onChange={handleChange}
                error={!!errors.mobileNumber}
                helperText={errors.mobileNumber}
              />
            </div>
          </div>

          <Button
            type="submit" // Set type to submit
            variant="contained"
            fullWidth
            disabled={loading} // Disable button when loading
            sx={{
              backgroundColor: "#00B09B",
              "&:hover": {
                backgroundColor: "#00B09B",
                opacity: 0.9,
              },
              textTransform: "none",
              borderRadius: "0.5rem",
              paddingY: "0.75rem",
            }}
          >
            {loading ? "Registering..." : "Send Verification Code"} {/* Change button text based on loading state */}
          </Button>
        </form>

        <p className="text-xs text-center my-5 text-text-gray">Send an SMS code to verify your number</p>

        <p className="text-xs text-center text-text-gray mt-6">
          By moving forward, you concur with the{" "}
          <Link href="#" className="text-accent-green hover:underline">
            Terms & condition
          </Link>{" "}
          -{" "}
          <Link href="#" className="text-accent-green hover:underline">
            Privacy policy
          </Link>
        </p>
        <div className="text-center mt-4">
          <Button onClick={handleLoginRedirect} variant="text" sx={{ textTransform: "none", color: "#00B09B" }}>
            Already have an account? Login
          </Button>
        </div>
      </CardContent>

      {/* MUI Snackbar for Toast Notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }} // Position at bottom center
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Card>
  )
}
