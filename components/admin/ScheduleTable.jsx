'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDate } from '@/lib/utils'
import { Edit, Trash2, Plus, Calendar, Save, X } from 'lucide-react'

export default function ScheduleTable() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAddingEvent, setIsAddingEvent] = useState(false)
  const [editingEventId, setEditingEventId] = useState(null)
  const [newEvent, setNewEvent] = useState({ name: '', starts_at: '' })
  const supabase = createClient()
  const { toast } = useToast()

  // Load events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('starts_at')

        if (error) throw error
        setEvents(data || [])
      } catch (error) {
        console.error('Error fetching events:', error)
        toast({
          title: 'Error',
          description: 'Failed to load events.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [supabase, toast])

  const handleAddEvent = async () => {
    try {
      if (!newEvent.name || !newEvent.starts_at) {
        toast({
          title: 'Validation Error',
          description: 'Event name and start time are required.',
          variant: 'destructive',
        })
        return
      }

      // Format date for storage
      const startsAt = new Date(newEvent.starts_at).toISOString()

      const { data, error } = await supabase
        .from('events')
        .insert({ name: newEvent.name, starts_at: startsAt })
        .select()

      if (error) throw error

      setEvents([...events, data[0]])
      setIsAddingEvent(false)
      setNewEvent({ name: '', starts_at: '' })
      
      toast({
        title: 'Event Added',
        description: 'The event has been added successfully.',
      })
    } catch (error) {
      console.error('Error adding event:', error)
      toast({
        title: 'Error',
        description: 'Failed to add event.',
        variant: 'destructive',
      })
    }
  }

  const handleUpdateEvent = async (id) => {
    try {
      const event = events.find(e => e.id === id)
      if (!event.name || !event.starts_at) {
        toast({
          title: 'Validation Error',
          description: 'Event name and start time are required.',
          variant: 'destructive',
        })
        return
      }

      // Format date for storage
      const startsAt = new Date(event.starts_at).toISOString()

      const { data, error } = await supabase
        .from('events')
        .update({ name: event.name, starts_at: startsAt })
        .eq('id', id)
        .select()

      if (error) throw error

      setEvents(events.map(e => e.id === id ? data[0] : e))
      setEditingEventId(null)
      
      toast({
        title: 'Event Updated',
        description: 'The event has been updated successfully.',
      })
    } catch (error) {
      console.error('Error updating event:', error)
      toast({
        title: 'Error',
        description: 'Failed to update event.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteEvent = async (id) => {
    if (!confirm('Are you sure you want to delete this event? This will also delete the associated round.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id)

      if (error) throw error

      setEvents(events.filter(e => e.id !== id))
      
      toast({
        title: 'Event Deleted',
        description: 'The event has been deleted successfully.',
      })
    } catch (error) {
      console.error('Error deleting event:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete event.',
        variant: 'destructive',
      })
    }
  }

  // Check if an event is in the past
  const isEventPast = (startsAt) => {
    return new Date(startsAt) < new Date()
  }

  // Update an event value
  const updateEventField = (id, field, value) => {
    setEvents(events.map(e => {
      if (e.id === id) {
        return { ...e, [field]: value }
      }
      return e
    }))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Recruitment Schedule</CardTitle>
          <CardDescription>Manage recruitment events and rounds</CardDescription>
        </div>
        <Button 
          onClick={() => setIsAddingEvent(!isAddingEvent)} 
          variant={isAddingEvent ? "outline" : "default"}
        >
          {isAddingEvent ? (
            <>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {isAddingEvent && (
          <div className="mb-6 p-4 border rounded-md bg-gray-50">
            <h3 className="text-lg font-medium mb-4">Add New Event</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Name
                </label>
                <Input
                  placeholder="Enter event name"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <Input
                  type="datetime-local"
                  value={newEvent.starts_at}
                  onChange={(e) => setNewEvent({ ...newEvent, starts_at: e.target.value })}
                />
              </div>
              <Button onClick={handleAddEvent}>
                <Save className="mr-2 h-4 w-4" />
                Save Event
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-4">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No events scheduled. Add your first event to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left font-medium text-gray-500 text-sm">Event Name</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 text-sm">Start Time</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 text-sm">Status</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-t">
                    <td className="px-4 py-4">
                      {editingEventId === event.id ? (
                        <Input
                          value={event.name}
                          onChange={(e) => updateEventField(event.id, 'name', e.target.value)}
                        />
                      ) : (
                        <span>{event.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {editingEventId === event.id ? (
                        <Input
                          type="datetime-local"
                          value={event.starts_at ? new Date(event.starts_at).toISOString().slice(0, 16) : ''}
                          onChange={(e) => updateEventField(event.id, 'starts_at', e.target.value)}
                          disabled={isEventPast(event.starts_at)}
                        />
                      ) : (
                        <span className={isEventPast(event.starts_at) ? "text-gray-500" : ""}>
                          {formatDate(event.starts_at)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        isEventPast(event.starts_at) 
                          ? 'bg-gray-100 text-gray-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {isEventPast(event.starts_at) ? 'Past' : 'Upcoming'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {editingEventId === event.id ? (
                        <div className="flex justify-end space-x-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleUpdateEvent(event.id)}
                            disabled={isEventPast(event.starts_at)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setEditingEventId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setEditingEventId(event.id)}
                            disabled={isEventPast(event.starts_at)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-gray-500">
        Note: Past events cannot be edited. Deleting an event will also delete associated rounds and votes.
      </CardFooter>
    </Card>
  )
} 