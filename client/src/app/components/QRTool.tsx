'use client'

import { useState } from 'react'
import FileUploader from './FileUploader'

interface QRToolProps {
  onHashGenerated: (hash: string) => void
}

export default function QRTool({ onHashGenerated }: QRToolProps) {
  const [file, setFile] = useState<File | null>(null)
  const [qrImageUrl, setQrImageUrl] = useState<string>('')
  const [decodedFileUrl, setDecodedFileUrl] = useState<string>('')
  const [isEncoding, setIsEncoding] = useState(false)
  const [isDecoding, setIsDecoding] = useState(false)
  const [qrStats, setQrStats] = useState<{ dataSize: string; filename: string } | null>(null)

  const encodeQR = async () => {
    if (!file) return

    // Check file size limit - allow up to 500KB but warn about limitations
    if (file.size > 500 * 1024) {
      alert(`File too large (${(file.size / 1024).toFixed(1)}KB). Maximum supported is 500KB.`)
      return
    }

    setIsEncoding(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('http://localhost:8000/encode/qr', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to encode file to QR')
      }

      const hash = response.headers.get('X-Original-Hash')
      const filename = response.headers.get('X-Original-Filename')
      const dataSize = response.headers.get('X-QR-Data-Size')

      if (hash) {
        onHashGenerated(hash)
      }

      if (filename && dataSize) {
        setQrStats({ filename, dataSize })
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setQrImageUrl(url)
    } catch (error) {
      console.error('Error encoding file to QR:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to encode file'}`)
    } finally {
      setIsEncoding(false)
    }
  }

  const decodeQR = async (qrFile: File) => {
    setIsDecoding(true)
    try {
      const formData = new FormData()
      formData.append('file', qrFile)

      const response = await fetch('http://localhost:8000/decode/qr', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        try {
          const error = await response.json()
          throw new Error(error.detail || 'Failed to decode QR image')
        } catch (e) {
          throw new Error('Failed to decode QR image. Make sure you upload a valid QR code image.')
        }
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setDecodedFileUrl(url)
    } catch (error) {
      console.error('Error decoding QR:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to decode QR code'}`)
    } finally {
      setIsDecoding(false)
    }
  }

  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">QR Code Codec</h2>
        <p className="text-slate-400">
          Convert small files into QR codes and back (≤2KB recommended)
        </p>
      </div>

      {/* Size Warning */}
      <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <span className="text-amber-400">⚠️</span>
          <div>
            <p className="text-amber-400 font-medium">QR Code Size Limits</p>
            <p className="text-amber-300 text-sm">
              QR codes work best with small files (under 2KB). Larger files may not scan properly on all devices.
            </p>
          </div>
        </div>
      </div>

      {/* Encoding Section */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            📤 Encode File to QR Code
          </h3>

          {!file ? (
            <FileUploader
              onFileSelect={setFile}
              maxSize={500 * 1024}
            >
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 text-slate-400">
                  📱
                </div>
                <div>
                  <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
                    Drop a small file here
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Maximum: 500KB
                  </p>
                </div>
              </div>
            </FileUploader>
          ) : (
            <div className="bg-slate-700 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-slate-400 text-sm">
                    {formatFileSize(file.size)}
                    {file.size > 2048 && (
                      <span className="text-amber-400 ml-2">(Large for QR)</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          <button
            onClick={encodeQR}
            disabled={!file || isEncoding}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition-all"
          >
            {isEncoding ? '🔄 Generating QR...' : '📱 Generate QR Code'}
          </button>

          {qrImageUrl && (
            <div className="space-y-4 bg-slate-700 p-4 rounded-lg">
              <div className="text-center">
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img
                    src={qrImageUrl}
                    alt="Generated QR Code"
                    className="max-w-full h-auto"
                    style={{ maxWidth: '200px', maxHeight: '200px' }}
                  />
                </div>
              </div>

              {qrStats && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">File:</span>
                    <p className="text-white">{qrStats.filename}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">QR Data:</span>
                    <p className="text-white">{qrStats.dataSize} chars</p>
                  </div>
                </div>
              )}

              <button
                onClick={() => downloadFile(qrImageUrl, `${file?.name || 'file'}_qr.png`)}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all"
              >
                ⬇️ Download QR Image
              </button>
            </div>
          )}
        </div>

        {/* Decoding Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            📥 Decode QR Code to File
          </h3>

          <FileUploader
            onFileSelect={decodeQR}
            accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'] }}
            maxSize={10 * 1024 * 1024}
          >
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 text-slate-400">
                🖼️
              </div>
              <div>
                <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
                  Upload QR code image
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  PNG, JPG, GIF, or other image formats
                </p>
              </div>
            </div>
          </FileUploader>

          {isDecoding && (
            <div className="text-center text-purple-400">
              🔄 Scanning QR code...
            </div>
          )}

          {decodedFileUrl && (
            <div className="space-y-2">
              <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
                <p className="text-green-400 text-sm">✅ QR code decoded successfully!</p>
              </div>
              <button
                onClick={() => downloadFile(decodedFileUrl, 'decoded_file')}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all"
              >
                ⬇️ Download Decoded File
              </button>
            </div>
          )}

          {/* Info Panel */}
          <div className="bg-slate-700 p-4 rounded-lg">
            <h4 className="text-white font-medium mb-2">QR Code Tips:</h4>
            <ul className="text-slate-400 text-sm space-y-1">
              <li>• Best for small text files, configs, or scripts</li>
              <li>• Files encoded as Base64 inside QR data</li>
              <li>• Larger files = more complex QR patterns</li>
              <li>• Use high-quality images for decoding</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
