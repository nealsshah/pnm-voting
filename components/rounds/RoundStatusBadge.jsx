'use client'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { RotateCw, AlertCircle, Activity, Clock, Play } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRoundStatus } from '@/contexts/RoundStatusContext'

export default function RoundStatusBadge({ withTimer = true }) {
  const { currentRound, isLoadingRound, roundChanged } = useRoundStatus()
  // No countdown or scheduled next round is tracked in the simplified schema

  if (isLoadingRound) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        <Card className="px-3 py-2 bg-blue-50 border-blue-200 rounded-md shadow-sm flex items-center gap-2">
          <div className="relative">
            <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse"></div>
            <div className="absolute inset-0 h-3 w-3 rounded-full bg-blue-400 animate-ping"></div>
          </div>
          <div className="flex items-center gap-2">
            <RotateCw className="h-4 w-4 text-blue-600 animate-spin" />
            <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">Loading...</span>
          </div>
        </Card>
      </motion.div>
    )
  }

  if (!currentRound) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        <Card className="px-3 py-2 bg-gray-50 border-gray-200 rounded-md shadow-sm flex items-center gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-bold text-gray-600 uppercase tracking-wider">No Active Round</span>
          </div>
        </Card>
      </motion.div>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        key={currentRound.id}
        initial={roundChanged ? { opacity: 0, scale: 0.9 } : false}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        <Card className="px-3 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 rounded-md shadow-sm flex items-center gap-2 group hover:shadow-md transition-all duration-300">
          <div className="relative">
            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
            <div className="absolute inset-0 h-3 w-3 rounded-full bg-green-400 animate-ping"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-green-600 uppercase tracking-wider">LIVE</span>
              <span className="text-sm font-semibold text-green-700">{currentRound.name}</span>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
} 