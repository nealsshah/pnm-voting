'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { format, parseISO } from 'date-fns'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EventTable } from '@/components/admin/EventTable'
import { CreateEventForm } from '@/components/admin/CreateEventForm'
import { CalendarMobile } from '@/components/admin/CalendarMobile'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/components/ui/use-toast'

const eventSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  startsAt: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Start time must be a valid date',
  })
})

export function ScheduleManager({ events, userId }) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [localEvents, setLocalEvents] = useState(events || [])
  const [activeView, setActiveView] = useState('table')
  
  const now = new Date()
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  
  useEffect(() => {
    const channel = supabase.channel('events-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'events'
      }, (payload) => {
        router.refresh()
      })
      .subscribe()
      
    return () => {
      channel.unsubscribe()
    }
  }, [supabase, router])
  
  // Function to update event position in database
  const updateEventOrder = async (reorderedEvents) => {
    // This function will update the starts_at fields to maintain chronological order
    // while keeping the relative time differences between events
    try {
      for (let i = 0; i < reorderedEvents.length; i++) {
        const event = reorderedEvents[i]
        
        // Skip past events - they should not be reordered
        if (new Date(event.starts_at) < now) continue
        
        // Update the event in the database
        const { error } = await supabase
          .from('events')
          .update({
            position: i + 1
          })
          .eq('id', event.id)
        
        if (error) throw error
      }
      
      toast({
        title: "Events reordered",
        description: "The event sequence has been updated",
      })
      
      router.refresh()
    } catch (error) {
      toast({
        title: "Error reordering events",
        description: error.message,
        variant: "destructive"
      })
    }
  }
  
  async function handleDragEnd(event) {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setLocalEvents((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over.id)
        
        const reorderedEvents = arrayMove(items, oldIndex, newIndex)
        
        // Start a background update of the database
        updateEventOrder(reorderedEvents)
        
        return reorderedEvents
      })
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Recruitment Schedule</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>Add Event</Button>
      </div>
      
      <Card>
        <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
          <CardHeader>
            <CardTitle>Event Schedule</CardTitle>
            <CardDescription>
              Manage the recruitment event schedule and voting rounds.
              Events are listed in chronological order and automatically create voting rounds.
            </CardDescription>
            <TabsList>
              <TabsTrigger value="table">Table View</TabsTrigger>
              <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="table" className="mt-0">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={localEvents.map(event => event.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <EventTable 
                    events={localEvents} 
                    onUpdate={(updatedEvents) => setLocalEvents(updatedEvents)}
                    onDeleteSuccess={() => router.refresh()}
                  />
                </SortableContext>
              </DndContext>
            </TabsContent>
            <TabsContent value="calendar" className="mt-0">
              <CalendarMobile events={localEvents} />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
      
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Event</DialogTitle>
            <DialogDescription>
              Create a new recruitment event. This will automatically create a voting round.
            </DialogDescription>
          </DialogHeader>
          
          <CreateEventForm 
            onSuccess={() => {
              setIsCreateModalOpen(false)
              router.refresh()
              toast({
                title: "Event created",
                description: "New event and voting round have been created",
              })
            }}
            userId={userId}
          />
        </DialogContent>
      </Dialog>
      
      <Toaster />
    </div>
  )
} 