"use client";
import { useState, useRef } from "react";
import { Modal, Avatar, Button, IconButton } from "@mui/material";
import { Close, CameraAlt, Videocam, InsertEmoticon } from "@mui/icons-material";
import { useDropzone } from "react-dropzone";

interface AddStatusModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (file: File, caption?: string) => void;
}

export default function AddStatusModal({ open, onClose, onSubmit }: AddStatusModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.png', '.jpg'],
      'video/*': ['.mp4', '.mov']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = () => {
    if (file) {
      onSubmit(file, caption);
      onClose();
      resetForm();
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setCaption("");
  };

  return (
    <Modal open={open} onClose={onClose} className="flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-md p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add Status Update</h2>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </div>

        {preview ? (
          <div className="mb-4">
            {file?.type.startsWith('image/') ? (
              <img 
                src={preview} 
                alt="Preview" 
                className="w-full h-64 object-contain rounded-lg"
              />
            ) : (
              <video 
                src={preview}
                controls
                className="w-full h-64 object-contain rounded-lg"
              />
            )}
            
            <textarea
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full mt-2 p-2 border rounded-lg"
              rows={2}
            />
          </div>
        ) : (
          <div 
            {...getRootProps()} 
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer mb-4"
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center">
              <CameraAlt className="text-gray-400 text-4xl mb-2" />
              <p className="text-gray-500">Drag & drop photo or video here</p>
              <p className="text-gray-400 text-sm mt-1">or click to select</p>
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <div className="flex space-x-2">
            <Button
              variant="outlined"
              startIcon={<CameraAlt />}
              onClick={() => fileInputRef.current?.click()}
            >
              Photo
            </Button>
            <Button
              variant="outlined"
              startIcon={<Videocam />}
              onClick={() => fileInputRef.current?.click()}
            >
              Video
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*, video/*"
              className="hidden"
            />
          </div>

          <Button
            variant="contained"
            color="primary"
            disabled={!file}
            onClick={handleSubmit}
          >
            Post Status
          </Button>
        </div>
      </div>
    </Modal>
  );
}