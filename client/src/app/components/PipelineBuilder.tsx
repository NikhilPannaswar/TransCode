'use client'

import { useState } from 'react'
import FileUploader from './FileUploader'

interface PipelineBuilderProps {
  onHashGenerated: (hash: string) => void
}

type PipelineStep = 'midi' | 'prime' | 'qr'

export default function PipelineBuilder({ onHashGenerated }: PipelineBuilderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [pipeline, setPipeline] = useState<PipelineStep[]>(['midi'])
  const [isExecuting, setIsExecuting] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState(0)

  const availableTools: { id: PipelineStep; name: string; icon: string }[] = [
    { id: 'midi', name: 'MIDI', icon: '🎵' },
    { id: 'prime', name: 'Prime', icon: '🔢' },
    { id: 'qr', name: 'QR Code', icon: '📱' }
  ]

  const presets = [
    {
      name: 'Simple MIDI',
      steps: ['midi'] as PipelineStep[]
    },
    {
      name: 'Prime Chain',
      steps: ['prime'] as PipelineStep[]
    },
    {
      name: 'Prime → MIDI',
      steps: ['prime', 'midi'] as PipelineStep[]
    },
    {
      name: 'MIDI → Prime',
      steps: ['midi', 'prime'] as PipelineStep[]
    },
    {
      name: 'Complex: Prime → MIDI → QR',
      steps: ['prime', 'midi', 'qr'] as PipelineStep[]
    }
  ]

  const addStep = (tool: PipelineStep) => {
    setPipeline([...pipeline, tool])
  }

  const removeStep = (index: number) => {
    setPipeline(pipeline.filter((_, i) => i !== index))
  }

  const applyPreset = (steps: PipelineStep[]) => {
    setPipeline(steps)
  }

  const executePipeline = async () => {
    if (!file || pipeline.length === 0) return

    setIsExecuting(true)
    setCurrentStep(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('http://localhost:8000/pipeline', {
        method: 'POST',
        body: formData,
        headers: {
          'X-Pipeline-Steps': pipeline.join(',')
        }
      })

      if (!response.ok) {
        throw new Error('Pipeline execution failed')
      }

      const result = await response.json()
      setResults(result)

      const hash = response.headers.get('X-Original-Hash')
      if (hash) {
        onHashGenerated(hash)
      }
    } catch (error) {
      console.error('Error executing pipeline:', error)
      alert('Error executing pipeline. Please try again.')
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Pipeline Builder</h2>
        <p className="text-slate-400">
          Chain multiple encoding operations together for complex transformations
        </p>
      </div>

      {/* File Upload */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          📁 Select File
        </h3>
        {!file ? (
          <FileUploader
            onFileSelect={setFile}
            maxSize={50 * 1024 * 1024}
          />
        ) : (
          <div className="bg-slate-700 p-4 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-white font-medium">{file.name}</p>
              <p className="text-slate-400 text-sm">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={() => setFile(null)}
              className="text-red-400 hover:text-red-300"
            >
              ✕ Remove
            </button>
          </div>
        )}
      </div>

      {/* Presets */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
          ⚡ Quick Presets
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset.steps)}
              className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm transition-all text-left"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline Visual */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          🔧 Pipeline Steps
        </h3>

        <div className="bg-slate-700 p-6 rounded-lg">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="bg-blue-600 px-4 py-2 rounded text-white font-medium">
              📁 Input File
            </div>

            {pipeline.map((step, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="text-2xl">→</div>
                <div className="relative">
                  <div className="bg-purple-600 px-4 py-2 rounded text-white font-medium">
                    {availableTools.find(t => t.id === step)?.icon}
                    {' '}
                    {availableTools.find(t => t.id === step)?.name}
                  </div>
                  <button
                    onClick={() => removeStep(index)}
                    className="absolute -top-2 -right-2 bg-red-600 rounded-full w-6 h-6 flex items-center justify-center text-white text-sm hover:bg-red-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

            <div className="text-2xl">→</div>
            <div className="bg-green-600 px-4 py-2 rounded text-white font-medium">
              📤 Output File
            </div>
          </div>
        </div>
      </div>

      {/* Add Steps */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
          ➕ Add Steps
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {availableTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => addStep(tool.id)}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg transition-all font-medium"
            >
              {tool.icon}
              <div className="text-sm mt-1">{tool.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Execute */}
      <button
        onClick={executePipeline}
        disabled={!file || pipeline.length === 0 || isExecuting}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-600 disabled:to-slate-600 text-white px-6 py-3 rounded-lg font-bold text-lg transition-all"
      >
        {isExecuting ? (
          <>
            🔄 Executing Pipeline (Step {currentStep + 1} of {pipeline.length})...
          </>
        ) : (
          <>🚀 Execute Pipeline</>
        )}
      </button>

      {/* Results */}
      {results && (
        <div className="bg-slate-700 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">✅ Pipeline Complete</h3>
          <div className="space-y-2 text-slate-300">
            <p>Execution time: {results.execution_time?.toFixed(2)}s</p>
            <p>Steps completed: {results.steps_completed}</p>
            {results.final_output_size && (
              <p>Final output size: {(results.final_output_size / 1024).toFixed(1)} KB</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
