'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { Upload, X, RefreshCw, CheckCircle2, AlertTriangle, FileImage } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageUploadCardProps {
  label: string;
  sublabel: string;
  file: File | null;
  previewUrl: string | null;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  error?: string | null;
}

export default function ImageUploadCard({
  label,
  sublabel,
  file,
  previewUrl,
  onFileSelect,
  onRemove,
  error,
}: ImageUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const validateAndPassFile = (selectedFile: File) => {
    setClientError(null);

    // File type check
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      setClientError('Invalid format. Please select an authentic JPEG, PNG, or WebP image.');
      return;
    }

    // Size check (10 MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setClientError('File exceeds 10 MB maximum upload limit.');
      return;
    }

    onFileSelect(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndPassFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndPassFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-white tracking-wide flex items-center gap-2">
            <span>{label}</span>
            {file && (
              <span className="flex items-center gap-1 text-[11px] font-normal text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                Ready
              </span>
            )}
          </h3>
          <p className="text-xs text-white/50">{sublabel}</p>
        </div>

        {file && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-xs text-white/60 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            title="Replace Photograph"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Replace</span>
          </button>
        )}
      </div>

      {/* Main Dropzone / Preview Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !file && fileInputRef.current?.click()}
        className={`relative flex-1 min-h-[320px] rounded-3xl border-2 border-dashed transition-all duration-300 overflow-hidden flex flex-col items-center justify-center p-6 ${
          isDragOver
            ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_25px_rgba(34,211,238,0.25)]'
            : file
            ? 'border-white/15 bg-black/40'
            : 'border-white/20 bg-white/[0.03] hover:border-white/35 hover:bg-white/[0.05] cursor-pointer'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {previewUrl && file ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full h-full min-h-[280px] flex items-center justify-center"
            >
              <img
                src={previewUrl}
                alt={label}
                className="max-h-[300px] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
              />

              {/* Remove Overlay Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="absolute top-2 right-2 p-2 rounded-full bg-black/60 hover:bg-red-600 text-white backdrop-blur-md transition-all shadow-lg border border-white/10 focus:outline-none"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>

              {/* File Info Pill */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-[11px] text-white/80">
                <span className="truncate max-w-[180px]">{file.name}</span>
                <span className="text-white/50">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center text-center space-y-3 pointer-events-none"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center shadow-inner">
                <Upload className="w-7 h-7 text-cyan-300" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  Drag and drop photograph here
                </p>
                <p className="text-xs text-white/45 mt-1">
                  or click to browse from device
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-[11px] text-white/50 border border-white/10">
                <FileImage className="w-3 h-3" />
                <span>JPEG, PNG, WebP up to 10 MB</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error Message */}
      {(clientError || error) && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-red-300 bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
          <span>{clientError || error}</span>
        </div>
      )}
    </div>
  );
}

