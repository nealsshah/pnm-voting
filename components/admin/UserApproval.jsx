'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { UserCheck, UserX, Users } from 'lucide-react'

export default function UserApproval() {
  const [pendingUsers, setPendingUsers] = useState([])
  const [approvedUsers, setApprovedUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        
        // Fetch pending users
        const { data: pendingData, error: pendingError } = await supabase
          .from('users_metadata')
          .select('*, user:id(id, email, created_at)')
          .eq('role', 'pending')
        
        if (pendingError) throw pendingError
        
        // Fetch approved users (brothers)
        const { data: approvedData, error: approvedError } = await supabase
          .from('users_metadata')
          .select('*, user:id(id, email, created_at)')
          .eq('role', 'brother')
          .order('created_at', { ascending: false })
          .limit(10)
        
        if (approvedError) throw approvedError
        
        setPendingUsers(pendingData || [])
        setApprovedUsers(approvedData || [])
      } catch (error) {
        console.error('Error fetching users:', error)
        toast({
          title: 'Error',
          description: 'Failed to load users.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [supabase, toast])

  const handleApproveUser = async (userId, role = 'brother') => {
    if (processing) return
    
    setProcessing(true)
    try {
      const { error } = await supabase
        .from('users_metadata')
        .update({ role })
        .eq('id', userId)
      
      if (error) throw error
      
      // Update local state
      const user = pendingUsers.find(u => u.id === userId)
      setPendingUsers(pendingUsers.filter(u => u.id !== userId))
      
      if (role === 'brother') {
        setApprovedUsers([user, ...approvedUsers])
      }
      
      toast({
        title: 'User Approved',
        description: `User has been approved as a ${role}.`,
      })
    } catch (error) {
      console.error('Error approving user:', error)
      toast({
        title: 'Error',
        description: 'Failed to approve user.',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleDenyUser = async (userId) => {
    if (processing) return
    
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }
    
    setProcessing(true)
    try {
      // Delete user from auth - requires service role
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete user')
      }
      
      // Update local state
      setPendingUsers(pendingUsers.filter(u => u.id !== userId))
      
      toast({
        title: 'User Denied',
        description: 'User has been denied and removed.',
      })
    } catch (error) {
      console.error('Error denying user:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to deny user.',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            User Approval
          </CardTitle>
          <CardDescription>
            Manage user signup requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h3 className="text-lg font-medium mb-3">Pending Approval</h3>
              {loading ? (
                <p className="text-gray-500">Loading users...</p>
              ) : pendingUsers.length === 0 ? (
                <p className="text-gray-500">No pending users.</p>
              ) : (
                <div className="space-y-4">
                  {pendingUsers.map(user => (
                    <div 
                      key={user.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 border rounded-md bg-yellow-50"
                    >
                      <div>
                        <h4 className="font-medium">{user.user.email}</h4>
                        <p className="text-sm text-gray-500">
                          Registered: {formatDate(user.user.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="default" 
                          onClick={() => handleApproveUser(user.id, 'brother')}
                          disabled={processing}
                          className="w-full sm:w-auto"
                        >
                          <UserCheck className="mr-2 h-4 w-4" />
                          Approve as Brother
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => handleApproveUser(user.id, 'admin')}
                          disabled={processing}
                          className="w-full sm:w-auto"
                        >
                          Approve as Admin
                        </Button>
                        <Button 
                          variant="destructive" 
                          onClick={() => handleDenyUser(user.id)}
                          disabled={processing}
                          className="w-full sm:w-auto"
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Deny
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">Recently Approved Brothers</h3>
              {loading ? (
                <p className="text-gray-500">Loading users...</p>
              ) : approvedUsers.length === 0 ? (
                <p className="text-gray-500">No approved brothers yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left font-medium text-gray-500 text-sm">Email</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 text-sm">Role</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 text-sm">Approved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvedUsers.map(user => (
                        <tr key={user.id} className="border-t">
                          <td className="px-4 py-2 font-medium">{user.user.email}</td>
                          <td className="px-4 py-2 capitalize">{user.role}</td>
                          <td className="px-4 py-2 text-gray-500 text-sm">{formatDate(user.updated_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 