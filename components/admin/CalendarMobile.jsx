'use client'

import { format, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export function CalendarMobile({ events }) {
  if (!events || events.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No events scheduled. Add your first event to see it here.
      </div>
    )
  }
  
  // Group events by month
  const eventsByMonth = events.reduce((acc, event) => {
    const date = parseISO(event.starts_at)
    const monthKey = format(date, 'MMMM yyyy')
    
    if (!acc[monthKey]) {
      acc[monthKey] = []
    }
    
    acc[monthKey].push(event)
    return acc
  }, {})
  
  return (
    <div className="space-y-6">
      {Object.entries(eventsByMonth).map(([month, monthEvents]) => (
        <div key={month} className="space-y-3">
          <h3 className="font-medium text-lg">{month}</h3>
          
          <div className="space-y-2">
            {monthEvents.map(event => {
              const date = parseISO(event.starts_at)
              const isPast = date < new Date()
              const roundStatus = event.rounds?.[0]?.status || 'unknown'
              
              return (
                <Card 
                  key={event.id} 
                  className={`shadow-sm ${isPast ? 'opacity-60' : ''}`}
                >
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{event.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(date, 'EEE, MMM d • h:mm a')}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        roundStatus === 'open' ? 'default' :
                        roundStatus === 'closed' ? 'secondary' :
                        'outline'
                      }
                    >
                      {roundStatus}
                    </Badge>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
} 