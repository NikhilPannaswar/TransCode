'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface FileUploaderProps {
  onFileSelect: (file: File) => void
  accept?: Record<string, string[]>
  maxSize?: number
  children?: React.ReactNode
  className?: string
}

export default function FileUploader({
  onFileSelect,
  accept,
  maxSize = 10 * 1024 * 1024,
  children,
  className = ''
}: FileUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0])
      }
    },
    [onFileSelect]
  )

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept,
      maxSize,
      multiple: false,
    })

  return (
    <div className={`w-full ${className}`}>
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${
            isDragActive
              ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20'
              : 'border-slate-300 dark:border-slate-600 hover:border-purple-400 dark:hover:border-purple-400'
          }
        `}
      >
        <input {...getInputProps()} />
        {children || (
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 text-slate-400">
              📁
            </div>
            <div>
              <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
                {isDragActive
                  ? 'Drop your file here'
                  : 'Drag & drop a file here, or click to select'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Maximum file size: {Math.round(maxSize / (1024 * 1024))}MB
              </p>
            </div>
          </div>
        )}
      </div>

      {fileRejections.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
          <p className="text-sm text-red-600 dark:text-red-400">
            {fileRejections[0].errors[0].message}
          </p>
        </div>
      )}
    </div>
  )
}
