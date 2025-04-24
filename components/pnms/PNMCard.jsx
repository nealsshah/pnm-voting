'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { getInitials } from '@/lib/utils'
import { getPhotoPublicUrl } from '@/lib/supabase'
import { User, Star } from 'lucide-react'

export default function PNMCard({ pnm, vote, onVote, isVotingEnabled }) {
  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false)
  const { first_name, last_name, major, year, photo_url } = pnm
  const fullName = `${first_name || ''} ${last_name || ''}`.trim()
  const initials = getInitials(first_name, last_name)
  const imageUrl = photo_url ? getPhotoPublicUrl(photo_url) : null

  const handleStarClick = (e, score) => {
    e.preventDefault() // Prevent navigation
    e.stopPropagation() // Prevent event bubbling
    if (isVotingEnabled) {
      onVote(pnm.id, score)
    }
  }

  return (
    <Card className="h-full overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer">
      <div className="relative aspect-square w-full bg-gray-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={fullName}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-200">
            <span className="text-4xl font-semibold text-gray-500">{initials}</span>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg truncate">{fullName}</h3>
        <div className="text-sm text-gray-500 space-y-1">
          {major && <p className="truncate">{major}</p>}
          {year && <p>{year}</p>}
        </div>
      </CardContent>
      {isVotingEnabled && (
        <CardFooter className="p-4 pt-0 flex justify-between items-center">
          <div className="flex space-x-1" onClick={(e) => e.preventDefault()}>
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                className="focus:outline-none"
                onClick={(e) => handleStarClick(e, score)}
                aria-label={`Rate ${score} star`}
              >
                <Star
                  className={`h-5 w-5 ${
                    vote && vote.score >= score
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </CardFooter>
      )}
    </Card>
  )
} 