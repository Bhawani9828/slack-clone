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
  Snackbar, // Import Snackbar
  Alert, // Import Alert
  InputLabel,
} from "@mui/material"
import { styled } from "@mui/system"
import { useRouter } from "next/navigation"
import { postApi } from "@/axios/apiService"
import API_ENDPOINTS from "@/axios/apiEndpoints"
import type { AxiosError } from "axios"
import { useSnackbar } from "@/hooks/use-snackbar"
import { CustomSnackbar } from "../custom-snackbar"
import Cookies from "js-cookie";

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

// Define the types for OTP verification
type VerifyOtpFormData = {
  mobileNumber: string
  otp: string
  countryCode: string
}

type VerifyOtpApiResponse = {
  message: string;
  token?: string;
  user?: {
    _id: string;
    name: string;
    mobileNumber: string;
  };
};

export default function VerifyOtpForm() {
  const [formData, setFormData] = useState<VerifyOtpFormData>({
    mobileNumber: "", // This could be pre-filled if passed as a prop
    otp: "",
    countryCode: "+91",
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



 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    const newErrors: Record<string, string> = {}
    if (!formData.mobileNumber) newErrors.mobileNumber = "Mobile Number is required"
    if (!formData.otp) newErrors.otp = "OTP is required"
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setLoading(false)
      showSnackbar("Please fill in all required fields.", "error")
      return
    }

    try {
     const payload = {
  mobileNumber: formData.countryCode + formData.mobileNumber, 
  otp: formData.otp, 
};
      const responseData = await postApi<VerifyOtpApiResponse>(
        API_ENDPOINTS.VERIFY_OTP, 
        payload, 
      )

      if (responseData?.message) {
        showSnackbar(responseData.message, "success")
        if (responseData.token && responseData.user) {
          Cookies.set("auth_token", responseData.token, { expires: 7 }) 
           localStorage.setItem("currentUserId", responseData.user._id);
        localStorage.setItem("currentUserName", responseData.user.name);
          console.log("Token stored in cookie:", responseData.token)
           console.log("User data stored:", {
          id: responseData.user._id,
          name: responseData.user.name
        });
      }
        
        router.push("/")
      } else {
        showSnackbar("OTP verification failed!", "error")
      }
      
    } catch (error: unknown) {
      const err = error as AxiosError<{ message: string }>
      const errorMessage = err?.response?.data?.message || "OTP verification failed"
      showSnackbar(errorMessage, "error")
    } finally {
      setLoading(false)
    }
  }

  // const handleResendOtp = async () => {
  //   setLoading(true)
  //   try {
  //     // Assuming you have an API endpoint to resend OTP
  //     await postApi(API_ENDPOINTS.RESEND_OTP, { mobileNumber: formData.mobileNumber })
  //     showSnackbar("OTP has been re-sent to your mobile number.", "success")
  //   } catch (error: unknown) {
  //     const err = error as AxiosError<{ message: string }>
  //     const errorMessage = err?.response?.data?.message || "Failed to resend OTP"
  //     showSnackbar(errorMessage, "error")
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  const handleLoginRedirect = () => {
    router.push("/login")
  }

  return (
    <Card className="mx-auto w-full max-w-md auth_cart">
      <CardContent className="p-8 space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <Image src="/01.png" alt="Chatzy Logo" width={64} height={64} className="h-16 w-16" />
          <h1 className="text-2xl font-bold text-gray-800">Verify Your Mobile Number</h1>
          <p className="text-sm text-text-gray text-center">Please enter the 6-digit OTP sent to your mobile number.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <InputLabel htmlFor="mobile-number" className="text-sm font-medium text-gray-700 mb-1">
              Mobile Number
            </InputLabel>
            <StyledTextField
              id="mobile-number"
              name="mobileNumber"
              placeholder="e.g., +19876543210"
              variant="outlined"
              fullWidth
              size="small"
              value={formData.mobileNumber}
              onChange={handleChange}
              error={!!errors.mobileNumber}
              helperText={errors.mobileNumber}
              // Consider making this readOnly if the number is passed from previous step
              // InputProps={{ readOnly: true }}
            />
          </div>

          <div className="space-y-2">
            <InputLabel htmlFor="otp" className="text-sm font-medium text-gray-700 mb-1">
              OTP
            </InputLabel>
            <StyledTextField
              id="otp"
              name="otp"
              placeholder="Enter 6-digit OTP"
              variant="outlined"
              fullWidth
              size="small"
              value={formData.otp}
              onChange={handleChange}
              error={!!errors.otp}
              helperText={errors.otp}
              inputProps={{ maxLength: 6 }} // Limit OTP length
            />
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
            {loading ? "Verifying..." : "Verify OTP"}
          </Button>
        </form>

        {/* <p className="text-xs text-center my-5 text-text-gray">
          Didn't receive the code?{" "}
          <Button
            onClick={handleResendOtp}
            disabled={loading}
            variant="text"
            sx={{ textTransform: "none", color: "#00B09B", padding: 0, minWidth: 0 }}
          >
            Resend OTP
          </Button>
        </p> */}

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
            Back to Login
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
