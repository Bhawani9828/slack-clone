"use client";
import type React from "react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { styled } from "@mui/system";
import { useRouter } from "next/navigation";
import { postApi } from "@/axios/apiService";
import API_ENDPOINTS from "@/axios/apiEndpoints";
import type { AxiosError } from "axios";
import { CustomSnackbar } from "../custom-snackbar";
import { useSnackbar } from "@/hooks/use-snackbar";

type RegisterFormData = {
  name: string;
  countryCode: string;
  mobileNumber: string;
};

type RegisterApiResponse = {
  message: string;
};

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

const StyledSelect = styled(Select)({
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

export default function RegisterForm() {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: "",
    countryCode: "+1",
    mobileNumber: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { snackbarState, showSnackbar, handleClose } = useSnackbar();

  const router = useRouter();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
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

  const handleCountryCodeChange = (e: any) => {
    setFormData((prev) => ({
      ...prev,
      countryCode: e.target.value as string,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = "User Name is required";
    if (!formData.mobileNumber)
      newErrors.mobileNumber = "Mobile Number is required";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      showSnackbar("Please fill in all required fields.", "error");

      return;
    }

    try {
      const payload = {
        name: formData.name,
        mobileNumber: formData.countryCode + formData.mobileNumber,
      };

      const responseData = await postApi<RegisterApiResponse>(
        API_ENDPOINTS.REGISTER,
        payload as RegisterFormData
      );

      if (responseData?.message) {
        showSnackbar(responseData.message, "success");
        router.push("/verify");
      } else {
        showSnackbar("Something went wrong!", "error");
      }
    } catch (error: unknown) {
      const err = error as AxiosError<{ message: string }>;
      const errorMessage =
        err?.response?.data?.message || "Registration failed";
      showSnackbar(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginRedirect = () => {
    router.push("/login");
  };

  return (
    <Card className="mx-auto w-full max-w-md auth_cart  rounded-xl">
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <Image
            src="/01.png"
            alt="Chatzy Logo"
            width={64}
            height={64}
            className="h-16 w-16"
          />
          <h1 className="text-2xl font-bold text-gray-800">
            Welcome to My Chat!
          </h1>
          <p className="text-sm text-gray-500 text-center">
            Access your chat from a computer anytime, anyplace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <InputLabel
              htmlFor="username"
              className="text-sm font-medium text-gray-700"
            >
              User Name
            </InputLabel>
            <StyledTextField
              id="username"
              name="name"
              placeholder="Enter User Name"
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
            <InputLabel
              htmlFor="mobile-number"
              className="text-sm font-medium text-gray-700"
            >
              Enter Your Mobile Number
            </InputLabel>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <FormControl
                variant="outlined"
                size="small"
                sx={{
                  width: { xs: "100%", sm: "120px" },
                }}
              >
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

          {/* Button */}
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
              paddingY: { xs: "0.65rem", sm: "0.75rem" },
              fontSize: { xs: "0.9rem", sm: "1rem" },
            }}
          >
            {loading ? "Registering..." : "Send Verification Code"}
          </Button>
        </form>

        {/* Extra Info */}
        <p className="text-xs text-center text-gray-500">
          Send an SMS code to verify your number
        </p>

        <p className="text-xs text-center text-gray-500">
          By moving forward, you concur with the{" "}
          <Link href="#" className="text-[#00B09B] hover:underline">
            Terms & condition
          </Link>{" "}
          -{" "}
          <Link href="#" className="text-[#00B09B] hover:underline">
            Privacy policy
          </Link>
        </p>

        {/* Login Redirect */}
        <div className="text-center mt-4">
          <Button
            onClick={handleLoginRedirect}
            variant="text"
            sx={{ textTransform: "none", color: "#00B09B" }}
          >
            Already have an account? Login
          </Button>
        </div>
      </CardContent>

      {/* Snackbar */}
      <CustomSnackbar
        open={snackbarState.open}
        message={snackbarState.message}
        severity={snackbarState.severity}
        onClose={handleClose}
      />
    </Card>
  );
}
