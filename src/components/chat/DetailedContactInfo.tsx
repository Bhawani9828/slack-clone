"use client";
import { Avatar } from "@mui/material";
import { Facebook, Twitter, Google } from "@mui/icons-material";

interface Contact {
  name: string;
  avatar: string;
  gender?: string;
  birthday?: string;
  favoriteBook?: string;
  personality?: string;
  city?: string;
  mobileNo?: string;
  email?: string;
  website?: string;
  interest?: string;
}

export default function DetailedContactInfo({
  contact = {
    name: "Jony Lynetin",
    avatar: "/placeholder.svg?height=80&width=80",
    gender: "female",
    birthday: "9 april 1994",
    favoriteBook: "perfect chemistry",
    personality: "cool",
    city: "moline acres",
    mobileNo: "+91 9752849222",
    email: "pabelomukrani@gmail.com",
    website: "www.test.com",
    interest: "photography",
  },
}) {
  return (
    <div className="h-full flex flex-col bg-[#f0f2f5] p-6 overflow-y-auto">
      {/* Contact Header */}
      <div className="bg-white p-6 text-center border-b border-gray-200 rounded-lg shadow-sm mb-6">
        <Avatar src={contact.avatar} className="w-24 h-24 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">
          {contact.name}
        </h2>
      </div>

      {/* Contact Info Details */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Contact Info
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <p className="font-medium text-gray-900">Name</p>
            <p>{contact.name}</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Gender</p>
            <p>{contact.gender}</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Birthday</p>
            <p>{contact.birthday}</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Favorite Book</p>
            <p>{contact.favoriteBook}</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Personality</p>
            <p>{contact.personality}</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">City</p>
            <p>{contact.city}</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Mobile No</p>
            <p>{contact.mobileNo}</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Email</p>
            <p>{contact.email}</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Website</p>
            <p>{contact.website}</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Interest</p>
            <p>{contact.interest}</p>
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Social Links
        </h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Facebook className="text-blue-600" />
            <a href="#" className="text-blue-600 hover:underline">
              Facebook
            </a>
          </div>
          <div className="flex items-center space-x-3">
            <Twitter className="text-blue-400" />
            <a href="#" className="text-blue-400 hover:underline">
              Twitter
            </a>
          </div>
          <div className="flex items-center space-x-3">
            <Google className="text-red-500" />
            <a href="#" className="text-red-500 hover:underline">
              Google
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
