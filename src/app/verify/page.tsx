import VerifyOtp from '@/components/auth/VerifyOtp'
import React from 'react'
import Image from "next/image"
export default function page() {
  return (
      <div className="grid min-h-screen w-full lg:grid-cols-2">
         
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
             
              <VerifyOtp/>
           </div>
         </div>
  )
}
