'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { UserPlus, Users, CalendarDays, CheckCircle, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils'

// Import admin sub-components
import ScheduleTable from './ScheduleTable'
import PNMManagement from './PNMManagement'
import RoundManagement from './RoundManagement'
import UserApproval from './UserApproval'
import CommentModeration from './CommentModeration'

export default function AdminDashboard({ 
  pnmCount, 
  eventCount, 
  pendingUserCount, 
  currentRound,
  rounds,
  userId 
}) {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard 
          title="PNMs" 
          value={pnmCount} 
          description="Total registered PNMs"
          icon={<Users className="h-6 w-6 text-blue-500" />}
        />
        <DashboardCard 
          title="Events" 
          value={eventCount} 
          description="Scheduled recruitment events"
          icon={<CalendarDays className="h-6 w-6 text-green-500" />}
        />
        <DashboardCard 
          title="Pending Users" 
          value={pendingUserCount} 
          description={pendingUserCount === 1 ? "User awaiting approval" : "Users awaiting approval"}
          icon={<UserPlus className="h-6 w-6 text-yellow-500" />}
        />
        <DashboardCard 
          title="Current Round" 
          value={currentRound ? currentRound.event.name : "None"}
          description={currentRound ? `Status: ${currentRound.status}` : "No active round"}
          icon={<Clock className="h-6 w-6 text-purple-500" />}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="pnms">PNMs</TabsTrigger>
          <TabsTrigger value="rounds">Rounds</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Overview of recent system activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-md p-4">
                  <h3 className="font-medium">Upcoming Events</h3>
                  {rounds.filter(r => r.event?.starts_at && new Date(r.event.starts_at) > new Date()).length > 0 ? (
                    <ul className="mt-2 space-y-2">
                      {rounds
                        .filter(r => r.event?.starts_at && new Date(r.event.starts_at) > new Date())
                        .sort((a, b) => new Date(a.event.starts_at) - new Date(b.event.starts_at))
                        .slice(0, 3)
                        .map(round => (
                          <li key={round.id} className="flex justify-between text-sm">
                            <span className="font-medium">{round.event.name}</span>
                            <span className="text-gray-500">{formatDate(round.event.starts_at)}</span>
                          </li>
                        ))
                      }
                    </ul>
                  ) : (
                    <p className="text-gray-500 mt-2">No upcoming events</p>
                  )}
                </div>

                {pendingUserCount > 0 && (
                  <div className="border rounded-md p-4 bg-yellow-50">
                    <h3 className="font-medium flex items-center">
                      <UserPlus className="h-4 w-4 mr-2 text-yellow-500" />
                      User Approval Required
                    </h3>
                    <p className="text-sm mt-2">
                      {pendingUserCount} user{pendingUserCount !== 1 ? 's' : ''} awaiting approval
                    </p>
                    <button 
                      className="text-sm text-blue-600 mt-2"
                      onClick={() => setActiveTab('users')}
                    >
                      Review users
                    </button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <ScheduleTable />
        </TabsContent>

        <TabsContent value="pnms">
          <PNMManagement />
        </TabsContent>

        <TabsContent value="rounds">
          <RoundManagement rounds={rounds} currentRound={currentRound} />
        </TabsContent>

        <TabsContent value="users">
          <UserApproval />
        </TabsContent>

        <TabsContent value="comments">
          <CommentModeration />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function DashboardCard({ title, value, description, icon }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </div>
          <div className="bg-gray-100 p-3 rounded-full">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 