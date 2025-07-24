'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { getInitials } from '@/lib/utils'
import { getPhotoPublicUrl } from '@/lib/supabase'
import { User, Star, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PNMCard({ pnm, vote, onVote, isVotingEnabled }) {
  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false)
  const { id, first_name, last_name, major, year, photo_url } = pnm
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
    <Card className="relative group overflow-hidden hover:shadow-lg transition-shadow">
      <Link href={`/admin/pnms/${id}/edit`}>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Button
            size="icon"
            variant="secondary"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </Link>
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={fullName}
                fill
                sizes="64px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-lg truncate">{fullName}</h3>
            <p className="text-sm text-gray-500 truncate">{major}</p>
            <p className="text-sm text-gray-500">{year}</p>
          </div>
        </div>
      </CardContent>
      {isVotingEnabled && (
        <CardFooter className="p-4 bg-gray-50 border-t">
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                onClick={(e) => handleStarClick(e, score)}
                className={`p-1 rounded-full hover:bg-gray-200 transition-colors ${vote === score ? 'text-yellow-400' : 'text-gray-400'
                  }`}
              >
                <Star className="w-5 h-5" fill={vote === score ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
        </CardFooter>
      )}
    </Card>
  )
} 