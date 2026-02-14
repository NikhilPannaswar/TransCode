'use client'

import { useState } from 'react'
import MidiTool from './components/MidiTool'
import PrimeTool from './components/PrimeTool'
import QRTool from './components/QRTool'
import VerificationPanel from './components/VerificationPanel'
import PipelineBuilder from './components/PipelineBuilder'

export default function Home() {
  const [activeTab, setActiveTab] = useState('midi')
  const [originalHash, setOriginalHash] = useState<string>('')

  const tabs = [
    { id: 'midi', name: 'MIDI Codec', icon: '🎵' },
    { id: 'prime', name: 'Prime Codec', icon: '🔢' },
    { id: 'qr', name: 'QR Codec', icon: '📱' },
    { id: 'pipeline', name: 'Pipeline Builder', icon: '🔧' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Trans<span className="text-purple-400">Code</span>
          </h1>
          <p className="text-xl text-slate-300 mb-6">
            Universal File Encoding & Decoding System
          </p>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Convert any file into MIDI music, prime numbers, or QR codes with perfect reconstruction.
            Features lossless encoding, SHA-256 verification, and creative musical modes.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-md transition-all duration-200 flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto">
          {/* Verification Panel */}
          {originalHash && (
            <VerificationPanel originalHash={originalHash} />
          )}

          {/* Tool Content */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-2xl">
            {activeTab === 'midi' && (
              <MidiTool onHashGenerated={setOriginalHash} />
            )}
            {activeTab === 'prime' && (
              <PrimeTool onHashGenerated={setOriginalHash} />
            )}
            {activeTab === 'qr' && (
              <QRTool onHashGenerated={setOriginalHash} />
            )}
            {activeTab === 'pipeline' && (
              <PipelineBuilder onHashGenerated={setOriginalHash} />
            )}
          </div>
        </div>

        {/* Features */}
        <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-3xl mb-4">🔄</div>
            <h3 className="text-xl font-semibold text-white mb-2">Lossless</h3>
            <p className="text-slate-400">
              Perfect reconstruction with SHA-256 verification
            </p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold text-white mb-2">Creative</h3>
            <p className="text-slate-400">
              Transform files into music, primes, and visual codes
            </p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold text-white mb-2">Fast</h3>
            <p className="text-slate-400">
              Instant encoding/decoding with modern web technologies
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
