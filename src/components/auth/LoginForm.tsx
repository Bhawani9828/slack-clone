"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, TextField, Button, Select, MenuItem, FormControl, InputLabel } from "@mui/material"
import { styled } from "@mui/system"
import { useRouter } from "next/navigation"
import { postApi } from "@/axios/apiService"
import API_ENDPOINTS from "@/axios/apiEndpoints"
import type { AxiosError } from "axios"
import { useSnackbar } from "@/hooks/use-snackbar" // Import the custom hook
import { CustomSnackbar } from "@/components/custom-snackbar" // Import the custom component

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

// Define the types for login (sending verification code)
type LoginFormData = {
  countryCode: string
  mobileNumber: string
}

type LoginApiResponse = {
  message: string
  // Add other fields your API might return on success, e.g., a session ID
}

export default function LoginForm() {
  const [formData, setFormData] = useState<LoginFormData>({
    countryCode: "+91", // Default country code
    mobileNumber: "",
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { snackbarState, showSnackbar, handleClose } = useSnackbar() // Use the custom hook

  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    const newErrors: Record<string, string> = {}
    if (!formData.mobileNumber) newErrors.mobileNumber = "Mobile Number is required"
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setLoading(false)
      showSnackbar("Please enter your mobile number.", "error")
      return
    }

    try {
      const payload = {
        mobileNumber: formData.countryCode + formData.mobileNumber, // Combine for API
      }

      const responseData = await postApi<LoginApiResponse>(
        API_ENDPOINTS.LOGIN, // Assuming this is your login endpoint to send OTP
        payload,
      )

      if (responseData?.message) {
        showSnackbar(responseData.message, "success")
        // Redirect to OTP verification page, passing the mobile number
        router.push("/verify")
      } else {
        showSnackbar("Failed to send verification code!", "error")
      }
    } catch (error: unknown) {
      const err = error as AxiosError<{ message: string }>
      const errorMessage = err?.response?.data?.message || "Failed to send verification code"
      showSnackbar(errorMessage, "error")
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterRedirect = () => {
    router.push("/register")
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
            <InputLabel htmlFor="mobile-number" className="text-sm font-medium text-gray-700 mb-1">
              Enter Your Mobile Number
            </InputLabel>
            <div className="flex gap-2">
              <FormControl variant="outlined" size="small" sx={{ width: "130px" }}>
                <InputLabel id="country-code-label">Code</InputLabel>
                <StyledSelect
                  labelId="country-code-label"
                  id="country-code-select"
                  name="countryCode"
                  value={formData.countryCode}
                  label="Code"
                  onChange={handleCountryCodeChange}
                >
                  <MenuItem value="+1">(+1)</MenuItem>
                  <MenuItem value="+44">(+44)</MenuItem>
                  <MenuItem value="+91">(+91)</MenuItem>
                </StyledSelect>
              </FormControl>
              <StyledTextField
                id="mobile-number"
                name="mobileNumber"
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
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
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
            {loading ? "Sending Code..." : "Send Verification Code"}
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
          <Button onClick={handleRegisterRedirect} variant="text" sx={{ textTransform: "none", color: "#00B09B" }}>
            Don't have an account? Register
          </Button>
        </div>
      </CardContent>

      {/* Use the reusable CustomSnackbar component */}
      <CustomSnackbar
        open={snackbarState.open}
        message={snackbarState.message}
        severity={snackbarState.severity}
        onClose={handleClose}
      />
    </Card>
  )
}
