// app/login/page.tsx



import { Toaster } from "react-hot-toast";
import Image from "next/image"
import LoginForm from "@/components/auth/LoginForm";


export default function LoginPage() {
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      <Toaster position="top-right" />
      {/* Left Column: Illustration */}
      <div className="hidden lg:flex items-center justify-center bg-mint-light p-8">
        <Image
          src="/01.png"
          alt="Illustration of a person interacting with a laptop"
          width={600}
          height={600}
          className="max-w-full h-auto"
        />
      </div>

      {/* Right Column: Login Form */}
      <div className="flex items-center justify-center  p-4 sm:p-8 ">
        
         <LoginForm />
      </div>
    </div>
  )
}
