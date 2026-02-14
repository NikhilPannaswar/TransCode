'use client'

import { useState, useRef } from 'react'
import FileUploader from './FileUploader'

interface MidiToolProps {
  onHashGenerated: (hash: string) => void
}

interface MidiPlayerState {
  isLoaded: boolean
  isPlaying: boolean
  duration: number
  currentTime: number
}

export default function MidiTool({ onHashGenerated }: MidiToolProps) {
  const [file, setFile] = useState<File | null>(null)
  const [encodedMidiUrl, setEncodedMidiUrl] = useState<string>('')
  const [decodedFileUrl, setDecodedFileUrl] = useState<string>('')
  const [isEncoding, setIsEncoding] = useState(false)
  const [isDecoding, setIsDecoding] = useState(false)
  const [mode, setMode] = useState<'raw' | 'musical'>('raw')
  const [player, setPlayer] = useState<MidiPlayerState>({
    isLoaded: false,
    isPlaying: false,
    duration: 0,
    currentTime: 0
  })

  const synthRef = useRef<any>(null)
  const partRef = useRef<any>(null)

  const encodeMidi = async () => {
    if (!file) return

    setIsEncoding(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`http://localhost:8000/encode/midi?mode=${mode}`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to encode file')
      }

      const hash = response.headers.get('X-Original-Hash')
      if (hash) {
        onHashGenerated(hash)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setEncodedMidiUrl(url)

      // Initialize MIDI player
      await initializeMidiPlayer(blob)
    } catch (error) {
      console.error('Error encoding file:', error)
      alert('Error encoding file. Please try again.')
    } finally {
      setIsEncoding(false)
    }
  }

  const decodeMidi = async (midiFile: File) => {
    setIsDecoding(true)
    try {
      const formData = new FormData()
      formData.append('file', midiFile)

      const response = await fetch('http://localhost:8000/decode/midi', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to decode MIDI file')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setDecodedFileUrl(url)
    } catch (error) {
      console.error('Error decoding MIDI:', error)
      alert('Error decoding MIDI file. Please try again.')
    } finally {
      setIsDecoding(false)
    }
  }

  const initializeMidiPlayer = async (midiBlob: Blob) => {
    try {
      // MIDI player initialization would go here
      setPlayer(prev => ({ ...prev, isLoaded: true, duration: 60 }))
    } catch (error) {
      console.error('Error initializing MIDI player:', error)
    }
  }

  const playMidi = async () => {
    if (!player.isLoaded) return

    try {
      // Demo playback notification
      setPlayer(prev => ({ ...prev, isPlaying: true }))

      // Auto-stop after demo
      setTimeout(() => {
        stopMidi()
      }, 2000)
    } catch (error) {
      console.error('Error playing MIDI:', error)
    }
  }

  const stopMidi = () => {
    setPlayer(prev => ({ ...prev, isPlaying: false, currentTime: 0 }))
  }

  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">MIDI Codec</h2>
        <p className="text-slate-400">
          Convert any file to MIDI music and back with perfect reconstruction
        </p>
      </div>

      {/* Mode Selection */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => setMode('raw')}
          className={`px-4 py-2 rounded-lg transition-all ${
            mode === 'raw'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          🎯 Raw Mode
        </button>
        <button
          onClick={() => setMode('musical')}
          className={`px-4 py-2 rounded-lg transition-all ${
            mode === 'musical'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          🎶 Musical Mode
        </button>
      </div>

      <p className="text-center text-sm text-slate-400">
        {mode === 'raw'
          ? 'Strict data encoding - only the file data as melody'
          : 'Adds harmony, bass, and drums while keeping data track intact'}
      </p>

      {/* Encoding Section */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            📤 Encode File to MIDI
          </h3>

          {!file ? (
            <FileUploader
              onFileSelect={setFile}
              maxSize={50 * 1024 * 1024}
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
            onClick={encodeMidi}
            disabled={!file || isEncoding}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition-all"
          >
            {isEncoding ? '🔄 Encoding...' : '🎵 Convert to MIDI'}
          </button>

          {encodedMidiUrl && (
            <div className="space-y-2">
              <button
                onClick={() => downloadFile(encodedMidiUrl, `${file?.name || 'file'}.mid`)}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all"
              >
                ⬇️ Download MIDI
              </button>

              {/* MIDI Player */}
              {player.isLoaded && (
                <div className="bg-slate-700 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-medium">🎵 MIDI Player</span>
                    <span className="text-slate-400 text-sm">
                      Demo: {player.duration}s
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={playMidi}
                      disabled={player.isPlaying}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white px-3 py-2 rounded transition-all text-sm"
                    >
                      {player.isPlaying ? '⏸️ Playing...' : '▶️ Play Demo'}
                    </button>
                    <button
                      onClick={stopMidi}
                      className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded transition-all text-sm"
                    >
                      ⏹️ Stop
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Decoding Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            📥 Decode MIDI to File
          </h3>

          <FileUploader
            onFileSelect={decodeMidi}
            accept={{ 'audio/midi': ['.mid', '.midi'] }}
            maxSize={10 * 1024 * 1024}
          >
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 text-slate-400">
                🎵
              </div>
              <div>
                <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
                  Upload MIDI file to decode
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  .mid, .midi files only
                </p>
              </div>
            </div>
          </FileUploader>

          {isDecoding && (
            <div className="text-center text-purple-400">
              🔄 Decoding MIDI file...
            </div>
          )}

          {decodedFileUrl && (
            <button
              onClick={() => downloadFile(decodedFileUrl, 'decoded_file')}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all"
            >
              ⬇️ Download Decoded File
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
