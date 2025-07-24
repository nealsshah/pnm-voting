'use client'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { RotateCw, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRoundStatus } from '@/contexts/RoundStatusContext'

export default function RoundStatusBadge({ withTimer = true }) {
  const { currentRound, isLoadingRound, roundChanged } = useRoundStatus()
  // No countdown or scheduled next round is tracked in the simplified schema

  if (isLoadingRound) {
    return (
      <Badge variant="outline" className="px-3 py-1">
        <RotateCw className="h-3 w-3 mr-1 animate-spin" />
        Loading...
      </Badge>
    )
  }

  if (!currentRound) {
    return (
      <Badge variant="outline" className="px-3 py-1">
        <AlertCircle className="h-3 w-3 mr-1" />
        No Active Round
      </Badge>
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
        <Card className="px-3 py-2 bg-primary text-primary-foreground rounded-md shadow-sm flex items-center">
          <div className="flex flex-col">
            <div className="text-sm font-medium flex items-center">
              Current Round: {currentRound.name}
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
} 