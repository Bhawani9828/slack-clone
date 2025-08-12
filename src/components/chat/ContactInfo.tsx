"use client";
import { useState } from "react";
import { Avatar, Collapse } from "@mui/material";
import {
  Message,
  Call,
  VideoCall,
  KeyboardArrowDown,
  KeyboardArrowUp,
  InsertDriveFile,
  Image,
  PictureAsPdf,
  Delete,
  CallReceived,
  CallMade,
  CallMissed,
} from "@mui/icons-material";

interface CallLog {
  id: string;
  type: "incoming" | "outgoing" | "missed";
  duration?: string;
  time: string;
  date: string;
}

interface SharedDocument {
  id: string;
  name: string;
  type: "zip" | "jpg" | "pdf";
  size?: string;
}

const callLogs: CallLog[] = [
  {
    id: "1",
    type: "incoming",
    duration: "15 Minutes ago",
    time: "5:10",
    date: "(22/10/19)",
  },
  {
    id: "2",
    type: "outgoing",
    duration: "30 Minutes ago",
    time: "10:30",
    date: "(12/09/19)",
  },
  {
    id: "3",
    type: "missed",
    duration: "1 Minutes ago",
    time: "8:30",
    date: "(28/08/19)",
  },
  {
    id: "4",
    type: "missed",
    duration: "10 Minutes ago",
    time: "9:10",
    date: "(18/10/19)",
  },
  {
    id: "5",
    type: "missed",
    duration: "35 Minutes ago",
    time: "9:10",
    date: "(17/01/19)",
  },
];

const sharedDocuments: SharedDocument[] = [
  {
    id: "1",
    name: "Simple_practice_project.zip",
    type: "zip",
  },
  {
    id: "2",
    name: "Word_Map.jpg",
    type: "jpg",
  },
  {
    id: "3",
    name: "Latest_Design_portfolio.pdf",
    type: "pdf",
  },
];

export default function ContactInfo({
  contact = {
    name: "Jony Lynetin",
    phone: "+0 1800 76855",
    avatar: "https://randomuser.me/api/portraits/men/75.jpg",
  },
}) {
  const [documentsExpanded, setDocumentsExpanded] = useState(true);

  const handleMessage = () => {
    console.log("Opening message chat...");
    // Navigate to chat
  };

  const handleVoiceCall = () => {
    console.log("Starting voice call...");
    // Start voice call
  };

  const handleVideoCall = () => {
    console.log("Starting video call...");
    // Start video call
  };

  const handleDeleteCallLog = () => {
    console.log("Deleting call log...");
    // Delete call log functionality
  };

  const getCallIcon = (type: string) => {
    switch (type) {
      case "incoming":
        return <CallReceived className="text-green-600 text-sm" />;
      case "outgoing":
        return <CallMade className="text-green-600 text-sm" />;
      case "missed":
        return <CallMissed className="text-red-500 text-sm" />;
      default:
        return <Call className="text-gray-500 text-sm" />;
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "zip":
        return <InsertDriveFile className="text-orange-500" />;
      case "jpg":
        return <Image className="text-blue-500" />;
      case "pdf":
        return <PictureAsPdf className="text-red-500" />;
      default:
        return <InsertDriveFile className="text-gray-500" />;
    }
  };

  return (
    <div className="h-full flex">
      {/* Contact Info Panel */}
      <div className="w-80 bg-[#f0f2f5] border-r border-gray-300 flex flex-col">
        {/* Contact Header */}
        <div className="bg-white p-6 text-center border-b border-gray-200">
          <Avatar src={contact.avatar} className="w-20 h-20 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            {contact.name}
          </h2>
          <p className="text-gray-600 mb-6">{contact.phone}</p>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-8">
            <button
              onClick={handleMessage}
              className="flex flex-col items-center space-y-2 p-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                <Message className="text-white" />
              </div>
              <span className="text-sm text-red-500 font-medium">Message</span>
            </button>

            <button
              onClick={handleVoiceCall}
              className="flex flex-col items-center space-y-2 p-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <Call className="text-white" />
              </div>
              <span className="text-sm text-green-500 font-medium">
                Voice Call
              </span>
            </button>

            <button
              onClick={handleVideoCall}
              className="flex flex-col items-center space-y-2 p-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <VideoCall className="text-white" />
              </div>
              <span className="text-sm text-green-500 font-medium">
                Video Call
              </span>
            </button>
          </div>
        </div>

        {/* Shared Documents */}
        <div className="bg-white border-b border-gray-200">
          <button
            onClick={() => setDocumentsExpanded(!documentsExpanded)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <span className="font-medium text-gray-900">Shared Document</span>
              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                3
              </span>
            </div>
            {documentsExpanded ? (
              <KeyboardArrowUp className="text-gray-500" />
            ) : (
              <KeyboardArrowDown className="text-gray-500" />
            )}
          </button>

          <Collapse in={documentsExpanded}>
            <div className="px-6 pb-4">
              {sharedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center space-x-3 py-2 hover:bg-gray-50 rounded-lg px-2 cursor-pointer"
                >
                  {getFileIcon(doc.type)}
                  <span className="text-sm text-gray-700 flex-1">
                    {doc.name}
                  </span>
                </div>
              ))}
            </div>
          </Collapse>
        </div>
      </div>

      {/* Call History Panel */}
      <div className="flex-1 bg-white flex flex-col">
        {/* Call History Header */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Call History
          </h3>
        </div>

        {/* Call Log List */}
        <div className="flex-1 overflow-y-auto">
          {callLogs.map((log) => (
            <div
              key={log.id}
              className="px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getCallIcon(log.type)}
                  <span className="text-sm text-gray-600 capitalize">
                    {log.type}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-900">{log.duration}</div>
                  <div className="text-xs text-gray-500">
                    {log.time} {log.date}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Delete Call Log Button */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={handleDeleteCallLog}
            className="flex items-center space-x-2 text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
          >
            <Delete className="text-sm" />
            <span className="text-sm font-medium">Delete Call Log</span>
          </button>
        </div>
      </div>
    </div>
  );
}
