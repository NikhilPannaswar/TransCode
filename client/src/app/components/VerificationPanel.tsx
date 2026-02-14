'use client'

import { useState } from 'react'

interface VerificationPanelProps {
  originalHash: string
  decodedHash?: string
}

export default function VerificationPanel({
  originalHash,
  decodedHash
}: VerificationPanelProps) {
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null)

  const verifyHash = async () => {
    if (!decodedHash || !originalHash) return

    setIsVerifying(true)
    try {
      const response = await fetch('http://localhost:8000/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          original_hash: originalHash,
          decoded_hash: decodedHash
        })
      })

      if (!response.ok) {
        throw new Error('Verification failed')
      }

      const result = await response.json()
      setVerificationResult(result.matches)
    } catch (error) {
      console.error('Error verifying hash:', error)
      setVerificationResult(false)
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="bg-slate-700 border border-slate-600 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        🔐 Hash Verification
      </h3>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-slate-400">Original File Hash:</label>
          <div className="bg-slate-800 p-3 rounded font-mono text-xs text-green-400 break-all">
            {originalHash}
          </div>
        </div>

        {decodedHash && (
          <>
            <div>
              <label className="text-sm text-slate-400">Decoded File Hash:</label>
              <div className="bg-slate-800 p-3 rounded font-mono text-xs text-blue-400 break-all">
                {decodedHash}
              </div>
            </div>

            <button
              onClick={verifyHash}
              disabled={isVerifying}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-all"
            >
              {isVerifying ? '🔄 Verifying...' : '✓ Verify Match'}
            </button>

            {verificationResult !== null && (
              <div
                className={`p-4 rounded-lg ${
                  verificationResult
                    ? 'bg-green-900/20 border border-green-700'
                    : 'bg-red-900/20 border border-red-700'
                }`}
              >
                <p
                  className={`font-medium ${
                    verificationResult ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {verificationResult ? '✅ Verified - Hashes Match!' : '❌ Mismatch - Files Differ!'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
