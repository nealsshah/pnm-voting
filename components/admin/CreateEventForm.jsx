'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useToast } from '@/components/ui/use-toast'

// Form validation schema
const eventSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  date: z.date({ required_error: 'Please select a date' }),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time'),
})

export function CreateEventForm({ onSuccess, userId }) {
  const [name, setName] = useState('')
  const [date, setDate] = useState(new Date())
  const [time, setTime] = useState('12:00')
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  
  const validateForm = () => {
    try {
      eventSchema.parse({ name, date, time })
      setErrors({})
      return true
    } catch (error) {
      const formattedErrors = {}
      error.errors.forEach((err) => {
        formattedErrors[err.path[0]] = err.message
      })
      setErrors(formattedErrors)
      return false
    }
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsSubmitting(true)
    
    try {
      // Combine date and time
      const [hours, minutes] = time.split(':').map(Number)
      const startsAt = new Date(date)
      startsAt.setHours(hours, minutes, 0, 0)
      
      // Create the event (trigger will auto-create the round)
      const { data, error } = await supabase
        .from('events')
        .insert([{
          name,
          starts_at: startsAt.toISOString(),
          created_by: userId
        }])
        .select()
      
      if (error) throw error
      
      // Reset form
      setName('')
      setDate(new Date())
      setTime('12:00')
      
      if (onSuccess) onSuccess(data)
      
    } catch (error) {
      toast({
        title: "Error creating event",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="event-name">Event Name</Label>
        <Input
          id="event-name"
          placeholder="Meet the Brothers"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, 'PPP') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.date && (
            <p className="text-sm text-destructive">{errors.date}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="event-time">Time</Label>
          <Input
            id="event-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
          {errors.time && (
            <p className="text-sm text-destructive">{errors.time}</p>
          )}
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Event'}
        </Button>
      </div>
    </form>
  )
} 