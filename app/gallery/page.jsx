"use client";

import Gallery from './gallery'

export default function CandidatesPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">PNM Gallery</h1>
      </div>
      <Gallery />
    </div>
  )
} 