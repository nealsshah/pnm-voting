'use client'

import { useState, useEffect } from 'react'

export default function VoteChart({ distribution }) {
  const total = distribution.reduce((sum, count) => sum + count, 0)
  
  // Get max count for scaling
  const maxCount = Math.max(...distribution)
  
  return (
    <div className="space-y-2">
      {distribution.map((count, index) => {
        const score = index + 1
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0
        const width = maxCount > 0 ? Math.max((count / maxCount) * 100, 2) : 0
        
        return (
          <div key={score} className="flex items-center gap-2">
            <div className="w-6 text-sm text-right font-medium">{score}</div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div 
                className="bg-blue-500 h-2.5 rounded-full" 
                style={{ width: `${width}%` }}
              ></div>
            </div>
            <div className="w-10 text-xs text-gray-500 text-right">{percentage}%</div>
            <div className="w-8 text-xs text-gray-500 text-right">({count})</div>
          </div>
        )
      })}
    </div>
  )
} 