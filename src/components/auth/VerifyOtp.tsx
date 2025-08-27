"use client";

import type React from "react";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  TextField,
  Button,
  Snackbar,
  Alert,
  InputLabel,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import { styled } from "@mui/system";
import { useRouter } from "next/navigation";
import { postApi, getApi } from "@/axios/apiService";
import API_ENDPOINTS from "@/axios/apiEndpoints";
import type { AxiosError } from "axios";
import { useSnackbar } from "@/hooks/use-snackbar";
import { CustomSnackbar } from "../custom-snackbar";
import Cookies from "js-cookie";

const StyledTextField = styled(TextField)({
  "& .MuiOutlinedInput-root": {
    borderRadius: "0.5rem",
    "&.Mui-focused fieldset": {
      borderColor: "#00B09B",
    },
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "#00B09B",
  },
});

const OtpDisplayBox = styled(Box)(({ theme }) => ({
  backgroundColor: "#f5f5f5",
  border: "1px solid #e0e0e0",
  borderRadius: "0.5rem",
  padding: "12px",
  marginTop: "8px",
  textAlign: "center",
}));

type VerifyOtpFormData = {
  mobileNumber: string;
  otp: string;
  countryCode: string;
};

type VerifyOtpApiResponse = {
  message: string;
  token?: string;
  user?: {
    _id: string;
    name: string;
    mobileNumber: string;
  };
};

type OtpDetailsResponse = {
  otp: string;
  expiresAt: string;
  timeRemaining: number;
  otpId: string;
};

type OtpStatusResponse = {
  hasActiveOtp: boolean;
  timeRemaining?: number;
  expiresAt?: string;
  canResend?: boolean;
};

export default function VerifyOtpForm() {
  const [formData, setFormData] = useState<VerifyOtpFormData>({
    mobileNumber: "",
    otp: "",
    countryCode: "+91",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [currentOtp, setCurrentOtp] = useState<string>("");
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [fetchingOtp, setFetchingOtp] = useState<boolean>(false);
  const [showOtpDetails, setShowOtpDetails] = useState<boolean>(false);

  const { snackbarState, showSnackbar, handleClose } = useSnackbar();
  const router = useRouter();

  useEffect(() => {
    const initialize = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const mobileFromUrl = searchParams.get("mobile");
        const storedMobile = localStorage.getItem("pendingMobile");

        let mobileToUse = mobileFromUrl || storedMobile;

        if (mobileToUse) {
          mobileToUse = mobileToUse.replace("+91", "");
          setFormData((prev) => ({
            ...prev,
            mobileNumber: mobileToUse as string,
          }));
          await checkOtpStatus(mobileToUse as string);
        }
      } catch (error) {
        console.error("Initialization error:", error);
      }
    };

    initialize();
  }, []);

  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
        if (timeRemaining <= 30) {
          setCanResend(true);
        }
      }, 1000);

      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && showOtpDetails) {
      setCanResend(true);
    }
  }, [timeRemaining, showOtpDetails]);

  const checkOtpStatus = async (mobileNumber: string) => {
    try {
      const cleanMobile = mobileNumber.replace("+91", "");
      const response = await getApi<OtpStatusResponse>(
        `/auth/otp-status/${cleanMobile}`
      );

      if (response?.hasActiveOtp) {
        setTimeRemaining(response.timeRemaining || 0);
        setCanResend(response.canResend || false);
        setShowOtpDetails(true);

        fetchOtpDetails(cleanMobile);
      }
    } catch (error) {
      console.error("Failed to check OTP status:", error);
    }
  };

  // Fetch OTP details
  const fetchOtpDetails = async (mobileNumber: string) => {
    try {
      setFetchingOtp(true);
      const cleanMobile = mobileNumber.replace("+91", "");
      const response = await getApi<OtpDetailsResponse>(
        `/auth/otp-details/${cleanMobile}`
      );

      console.log("Fetched OTP response:", response);

      if (response?.otp) {
        setCurrentOtp(response.otp);
        setTimeRemaining(response.timeRemaining);
        setShowOtpDetails(true);
      } else if (response?.otp) {
        setCurrentOtp(response.otp);
        setTimeRemaining(response.timeRemaining);
        setShowOtpDetails(true);
      } else {
        console.warn("No OTP found in response:", response);
        setCurrentOtp("");
      }
    } catch (error) {
      console.error("Failed to fetch OTP details:", error);
      setCurrentOtp("");
    } finally {
      setFetchingOtp(false);
    }
  };

  useEffect(() => {
    console.log("OTP Status:", {
      showOtpDetails,
      currentOtp,
      timeRemaining,
      canResend,
      mobile: formData.mobileNumber,
    });
  }, [showOtpDetails, currentOtp, timeRemaining, canResend]);

  const handleAutoFillOtp = () => {
    if (currentOtp) {
      setFormData((prev) => ({ ...prev, otp: currentOtp }));
      showSnackbar("OTP auto-filled for development", "info");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!formData.mobileNumber)
      newErrors.mobileNumber = "Mobile Number is required";
    if (!formData.otp) newErrors.otp = "OTP is required";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      showSnackbar("Please fill in all required fields.", "error");
      return;
    }

    try {
      const payload = {
        mobileNumber: formData.countryCode + formData.mobileNumber,
        otp: formData.otp,
      };

      const responseData = await postApi<VerifyOtpApiResponse>(
        API_ENDPOINTS.VERIFY_OTP,
        payload
      );

      if (responseData?.message) {
        showSnackbar(responseData.message, "success");
        if (responseData.token && responseData.user) {
          Cookies.set("auth_token", responseData.token, { expires: 7 });
          localStorage.setItem("currentUserId", responseData.user._id);
          localStorage.setItem("currentUserName", responseData.user.name);
          localStorage.removeItem("pendingMobile"); // Clear pending mobile
          console.log("Token stored in cookie:", responseData.token);
          console.log("User data stored:", {
            id: responseData.user._id,
            name: responseData.user.name,
          });
        }

        router.push("/");
      } else {
        showSnackbar("OTP verification failed!", "error");
      }
    } catch (error: unknown) {
      const err = error as AxiosError<{ message: string }>;
      const errorMessage =
        err?.response?.data?.message || "OTP verification failed";
      showSnackbar(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const cleanMobile = formData.mobileNumber.replace("+91", "");
      const response = await postApi("/auth/resend-otp", {
        mobileNumber: cleanMobile,
      });

      showSnackbar("OTP has been re-sent to your mobile number.", "success");

      setTimeRemaining(300);
      setCanResend(false);
      setShowOtpDetails(true);

      setTimeout(() => fetchOtpDetails(cleanMobile), 1000);
    } catch (error: unknown) {
      const err = error as AxiosError<{ message: string }>;
      const errorMessage =
        err?.response?.data?.message || "Failed to resend OTP";
      showSnackbar(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginRedirect = () => {
    router.push("/login");
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="mx-auto w-full max-w-md auth_cart">
      <CardContent className="p-8 space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <Image
            src="/01.png"
            alt="Chatzy Logo"
            width={64}
            height={64}
            className="h-16 w-16"
          />
          <h1 className="text-2xl font-bold text-gray-800">
            Verify Your Mobile Number
          </h1>
          <p className="text-sm text-text-gray text-center">
            Please enter the 6-digit OTP sent to your mobile number.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <InputLabel
              htmlFor="mobile-number"
              className="text-sm font-medium text-gray-700 mb-1"
            >
              Mobile Number
            </InputLabel>
            <StyledTextField
              id="mobile-number"
              name="mobileNumber"
              placeholder="e.g., 9876543210"
              variant="outlined"
              fullWidth
              size="small"
              value={formData.mobileNumber}
              onChange={handleChange}
              error={!!errors.mobileNumber}
              helperText={errors.mobileNumber}
              InputProps={{ readOnly: true }}
            />
          </div>

          <div className="space-y-2">
            <InputLabel
              htmlFor="otp"
              className="text-sm font-medium text-gray-700 mb-1"
            >
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
              inputProps={{ maxLength: 6 }}
            />

            {showOtpDetails && (
              <OtpDisplayBox>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Current OTP:
                </Typography>

                {fetchingOtp ? (
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    gap={1}
                  >
                    <CircularProgress size={20} />
                    <Typography variant="body2">Fetching OTP...</Typography>
                  </Box>
                ) : currentOtp ? (
                  <>
                    <Typography
                      variant="h6"
                      sx={{
                        fontFamily: "monospace",
                        backgroundColor: "#fff",
                        padding: "8px 16px",
                        borderRadius: "4px",
                        margin: "8px 0",
                        border: "2px solid #00B09B",
                        color: "#00B09B",
                        fontWeight: "bold",
                      }}
                    >
                      {currentOtp}
                    </Typography>
                    <Button
                      onClick={handleAutoFillOtp}
                      size="small"
                      variant="outlined"
                      sx={{
                        textTransform: "none",
                        borderColor: "#00B09B",
                        color: "#00B09B",
                        "&:hover": {
                          borderColor: "#00B09B",
                          backgroundColor: "rgba(0, 176, 155, 0.04)",
                        },
                      }}
                    >
                      Auto Fill OTP
                    </Button>
                  </>
                ) : (
                  <Typography variant="body2" color="error">
                    No active OTP found
                  </Typography>
                )}
              </OtpDisplayBox>
            )}

            {/* Timer Display */}
            {showOtpDetails && (
              <Box mt={2} textAlign="center">
                {timeRemaining > 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    OTP expires in:{" "}
                    <strong style={{ color: "#00B09B" }}>
                      {formatTime(timeRemaining)}
                    </strong>
                  </Typography>
                ) : (
                  <Typography variant="body2" color="error">
                    OTP has expired
                  </Typography>
                )}
              </Box>
            )}
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

        {/* Resend OTP Section */}
        <Box textAlign="center">
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Didn't receive the code?
          </Typography>
          <Button
            onClick={handleResendOtp}
            disabled={loading || !canResend}
            variant="text"
            sx={{
              textTransform: "none",
              color: canResend ? "#00B09B" : "#ccc",
              padding: 0,
              minWidth: 0,
            }}
          >
            {canResend
              ? "Resend OTP"
              : `Resend in ${formatTime(timeRemaining)}`}
          </Button>
        </Box>

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
          <Button
            onClick={handleLoginRedirect}
            variant="text"
            sx={{ textTransform: "none", color: "#00B09B" }}
          >
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
  );
}
