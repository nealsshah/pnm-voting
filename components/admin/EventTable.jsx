'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { format, parseISO } from 'date-fns'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar as CalendarIcon, Trash2, GripVertical, Check, X, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

function SortableRow({ event, onDelete, onSave, isPast }) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(event.name)
  const [date, setDate] = useState(
    event.starts_at ? parseISO(event.starts_at) : new Date()
  )
  const [time, setTime] = useState(
    event.starts_at ? format(parseISO(event.starts_at), 'HH:mm') : '12:00'
  )
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: event.id })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  
  const handleStartEdit = () => {
    if (isPast) return // Don't allow editing past events
    setIsEditing(true)
  }
  
  const handleSave = () => {
    // Combine date and time
    const [hours, minutes] = time.split(':').map(Number)
    const datetime = new Date(date)
    datetime.setHours(hours, minutes, 0, 0)
    
    onSave(event.id, {
      name,
      starts_at: datetime.toISOString()
    })
    setIsEditing(false)
  }
  
  const handleCancel = () => {
    setName(event.name)
    setDate(parseISO(event.starts_at))
    setTime(format(parseISO(event.starts_at), 'HH:mm'))
    setIsEditing(false)
  }
  
  const roundStatus = event.rounds?.[0]?.status || 'unknown'
  
  return (
    <TableRow 
      ref={setNodeRef} 
      style={style} 
      className={isPast ? 'opacity-60' : ''}
    >
      <TableCell>
        {!isPast && (
          <div 
            {...attributes}
            {...listeners}
            className="cursor-grab hover:text-primary"
          >
            <GripVertical className="h-5 w-5" />
          </div>
        )}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-[250px]"
          />
        ) : (
          <div 
            className={!isPast ? "cursor-pointer hover:text-primary" : ""}
            onClick={handleStartEdit}
          >
            {event.name}
          </div>
        )}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <div className="flex items-center space-x-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="pl-3 text-left font-normal flex">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : 'Pick a date'}
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
          </div>
        ) : (
          <div 
            className={!isPast ? "cursor-pointer hover:text-primary" : ""}
            onClick={handleStartEdit}
          >
            {format(parseISO(event.starts_at), 'MMM d, yyyy')}
          </div>
        )}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="max-w-[120px]"
          />
        ) : (
          <div 
            className={!isPast ? "cursor-pointer hover:text-primary" : ""}
            onClick={handleStartEdit}
          >
            {format(parseISO(event.starts_at), 'h:mm a')}
          </div>
        )}
      </TableCell>
      <TableCell>
        <Badge 
          variant={
            roundStatus === 'open' ? 'default' :
            roundStatus === 'closed' ? 'secondary' :
            'outline'
          }
        >
          {roundStatus}
        </Badge>
      </TableCell>
      <TableCell>
        {isEditing ? (
          <div className="flex space-x-2">
            <Button size="icon" variant="outline" onClick={handleSave}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex space-x-2">
            {!isPast && (
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        )}
        
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Event</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the "{event.name}" event? 
                This will also delete the associated voting round and all votes.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(event.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}

export function EventTable({ events, onUpdate, onDeleteSuccess }) {
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const now = new Date()
  
  const handleSaveEvent = async (id, data) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({
          name: data.name,
          starts_at: data.starts_at
        })
        .eq('id', id)
      
      if (error) throw error
      
      // Update local state
      const updatedEvents = events.map(event => 
        event.id === id 
          ? { ...event, name: data.name, starts_at: data.starts_at }
          : event
      )
      
      onUpdate(updatedEvents)
      
      toast({
        title: "Event updated",
        description: "Changes have been saved successfully",
      })
      
    } catch (error) {
      toast({
        title: "Error updating event",
        description: error.message,
        variant: "destructive"
      })
    }
  }
  
  const handleDeleteEvent = async (id) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      // Update local state
      onUpdate(events.filter(event => event.id !== id))
      
      toast({
        title: "Event deleted",
        description: "Event and associated round have been removed",
      })
      
      if (onDeleteSuccess) onDeleteSuccess()
      
    } catch (error) {
      toast({
        title: "Error deleting event",
        description: error.message,
        variant: "destructive"
      })
    }
  }
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]"></TableHead>
          <TableHead>Event Name</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Round Status</TableHead>
          <TableHead className="w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
              No events scheduled. Click "Add Event" to create the first event.
            </TableCell>
          </TableRow>
        ) : (
          events.map(event => (
            <SortableRow
              key={event.id}
              event={event}
              onDelete={handleDeleteEvent}
              onSave={handleSaveEvent}
              isPast={new Date(event.starts_at) < now}
            />
          ))
        )}
      </TableBody>
    </Table>
  )
} 