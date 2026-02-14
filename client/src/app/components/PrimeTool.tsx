'use client'

import { useState } from 'react'
import FileUploader from './FileUploader'

interface PrimeToolProps {
  onHashGenerated: (hash: string) => void
}

interface PrimeResult {
  prime_string: string
  digit_count: number
  original_filename: string
  original_size: number
  original_hash: string
}

export default function PrimeTool({ onHashGenerated }: PrimeToolProps) {
  const [file, setFile] = useState<File | null>(null)
  const [primeResult, setPrimeResult] = useState<PrimeResult | null>(null)
  const [primeInput, setPrimeInput] = useState<string>('')
  const [decodedFileUrl, setDecodedFileUrl] = useState<string>('')
  const [isEncoding, setIsEncoding] = useState(false)
  const [isDecoding, setIsDecoding] = useState(false)
  const [showFullPrime, setShowFullPrime] = useState(false)

  const encodePrime = async () => {
    if (!file) return

    setIsEncoding(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('http://localhost:8000/encode/prime', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to encode file to prime')
      }

      const result: PrimeResult = await response.json()
      setPrimeResult(result)
      onHashGenerated(result.original_hash)
    } catch (error) {
      console.error('Error encoding file to prime:', error)
      alert('Error encoding file. Please try again.')
    } finally {
      setIsEncoding(false)
    }
  }

  const decodePrime = async () => {
    if (!primeInput.trim()) return

    setIsDecoding(true)
    try {
      const response = await fetch('http://localhost:8000/decode/prime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prime_string: primeInput.trim()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to decode prime string')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      // Get filename from response header
      const filename = response.headers.get('X-Decoded-Filename') || 'decoded_file'
      
      // Trigger download with proper filename
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      setDecodedFileUrl(url)
    } catch (error) {
      console.error('Error decoding prime:', error)
      alert('Error decoding prime string. Please check the format and try again.')
    } finally {
      setIsDecoding(false)
    }
  }

  const copyPrimeToClipboard = async () => {
    if (!primeResult) return

    try {
      await navigator.clipboard.writeText(primeResult.prime_string)
      alert('Prime number copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy:', error)
      alert('Failed to copy to clipboard')
    }
  }

  const downloadPrimeTxt = () => {
    if (!primeResult) return

    const content = `# File: ${primeResult.original_filename}\n# Size: ${primeResult.original_size} bytes\n# Hash: ${primeResult.original_hash}\n# Digits: ${primeResult.digit_count}\n\n${primeResult.prime_string}`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `${primeResult.original_filename}.prime.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    URL.revokeObjectURL(url)
  }

  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  const truncatePrime = (primeStr: string, maxLength: number = 100) => {
    if (primeStr.length <= maxLength) return primeStr
    const start = primeStr.substring(0, maxLength / 2)
    const end = primeStr.substring(primeStr.length - maxLength / 2)
    return `${start}...${end}`
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Prime Number Codec</h2>
        <p className="text-slate-400">
          Convert any file into a massive decimal number and back
        </p>
      </div>

      {/* Encoding Section */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            📤 Encode File to Prime
          </h3>

          {!file ? (
            <FileUploader
              onFileSelect={setFile}
              maxSize={10 * 1024 * 1024}
            />
          ) : (
            <div className="bg-slate-700 p-4 rounded-lg">
              <p className="text-white font-medium">{file.name}</p>
              <p className="text-slate-400 text-sm">
                {(file.size / 1024).toFixed(1)} KB
              </p>
              <button
                onClick={() => setFile(null)}
                className="mt-2 text-red-400 hover:text-red-300 text-sm"
              >
                Remove file
              </button>
            </div>
          )}

          <button
            onClick={encodePrime}
            disabled={!file || isEncoding}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition-all"
          >
            {isEncoding ? '🔄 Converting...' : '🔢 Convert to Prime'}
          </button>

          {primeResult && (
            <div className="space-y-4 bg-slate-700 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">File:</span>
                  <p className="text-white">{primeResult.original_filename}</p>
                </div>
                <div>
                  <span className="text-slate-400">Size:</span>
                  <p className="text-white">{formatNumber(primeResult.original_size)} bytes</p>
                </div>
                <div>
                  <span className="text-slate-400">Digits:</span>
                  <p className="text-white">{formatNumber(primeResult.digit_count)}</p>
                </div>
                <div>
                  <span className="text-slate-400">Hash:</span>
                  <p className="text-white font-mono text-xs">{primeResult.original_hash.substring(0, 8)}...</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Prime Number:</span>
                  <button
                    onClick={() => setShowFullPrime(!showFullPrime)}
                    className="text-purple-400 hover:text-purple-300 text-xs"
                  >
                    {showFullPrime ? 'Hide Full' : 'Show Full'}
                  </button>
                </div>
                <div className="bg-slate-800 p-3 rounded font-mono text-xs text-green-400 overflow-auto max-h-32">
                  {showFullPrime
                    ? primeResult.prime_string
                    : truncatePrime(primeResult.prime_string)}
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={copyPrimeToClipboard}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm transition-all"
                >
                  📋 Copy Prime
                </button>
                <button
                  onClick={downloadPrimeTxt}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm transition-all"
                >
                  ⬇️ Download TXT
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Decoding Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            📥 Decode Prime to File
          </h3>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Paste Prime Number:
            </label>
            <textarea
              value={primeInput}
              onChange={(e) => setPrimeInput(e.target.value)}
              placeholder="Paste your prime number here..."
              className="w-full h-32 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-xs resize-none focus:outline-none focus:border-purple-400"
            />
          </div>

          <button
            onClick={decodePrime}
            disabled={!primeInput.trim() || isDecoding}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition-all"
          >
            {isDecoding ? '🔄 Decoding...' : '🔍 Decode Prime'}
          </button>

          {decodedFileUrl && (
            <button
              onClick={() => downloadFile(decodedFileUrl, 'decoded_file')}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all"
            >
              ⬇️ Download Decoded File
            </button>
          )}

          {/* Info Panel */}
          <div className="bg-slate-700 p-4 rounded-lg">
            <h4 className="text-white font-medium mb-2">How it works:</h4>
            <ul className="text-slate-400 text-sm space-y-1">
              <li>• File bytes → Big integer → Decimal string</li>
              <li>• Includes filename and metadata</li>
              <li>• Perfect reconstruction guaranteed</li>
              <li>• Inspired by "GPT in a prime number"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
