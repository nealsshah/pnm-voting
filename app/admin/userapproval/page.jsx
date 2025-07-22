'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { formatDate } from '@/lib/utils'
import { UserCheck, UserX, Users } from 'lucide-react'

export default function UserApproval() {
  const [pendingUsers, setPendingUsers] = useState([])
  const [activeUsers, setActiveUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [roleChangeDialog, setRoleChangeDialog] = useState({
    isOpen: false,
    userId: null,
    newRole: null,
    userName: '',
  })
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)

        // Fetch pending users
        const { data: pendingData, error: pendingError } = await supabase
          .from('users_metadata')
          .select('*')
          .eq('role', 'pending')

        if (pendingError) throw pendingError

        // Fetch all active users (brothers and admins)
        const { data: activeData, error: activeError } = await supabase
          .from('users_metadata')
          .select('*')
          .in('role', ['brother', 'admin'])
          .order('created_at', { ascending: false })

        if (activeError) throw activeError

        setPendingUsers(pendingData || [])
        setActiveUsers(activeData || [])
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
      setActiveUsers([user, ...activeUsers])

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

  const handleRoleChange = async (userId, newRole) => {
    if (processing) return

    setProcessing(true)
    try {
      const { error } = await supabase
        .from('users_metadata')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      // Update local state
      setActiveUsers(activeUsers.map(user =>
        user.id === userId ? { ...user, role: newRole } : user
      ))

      toast({
        title: 'Role Updated',
        description: `User role has been updated to ${newRole}.`,
      })
    } catch (error) {
      console.error('Error updating role:', error)
      toast({
        title: 'Error',
        description: 'Failed to update user role.',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
      setRoleChangeDialog({ isOpen: false, userId: null, newRole: null, userName: '' })
    }
  }

  const handleRoleSelect = (userId, newRole, userName) => {
    setRoleChangeDialog({
      isOpen: true,
      userId,
      newRole,
      userName,
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage user roles and approvals
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
                        <h4 className="font-medium">{user.first_name} {user.last_name}</h4>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <p className="text-sm text-gray-500">
                          Registered: {formatDate(user.created_at)}
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
                          variant="secondary"
                          onClick={() => handleApproveUser(user.id, 'admin')}
                          disabled={processing}
                          className="w-full sm:w-auto"
                        >
                          <UserCheck className="mr-2 h-4 w-4" />
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
              <h3 className="text-lg font-medium mb-3">Active Users</h3>
              {loading ? (
                <p className="text-gray-500">Loading users...</p>
              ) : activeUsers.length === 0 ? (
                <p className="text-gray-500">No active users.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left font-medium text-gray-500 text-sm">Name</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 text-sm">Email</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 text-sm">Role</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 text-sm">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeUsers.map(user => (
                        <tr key={user.id} className="border-t">
                          <td className="px-4 py-2 font-medium">{user.first_name} {user.last_name}</td>
                          <td className="px-4 py-2">{user.email}</td>
                          <td className="px-4 py-2">
                            <Select
                              defaultValue={user.role}
                              onValueChange={(value) => handleRoleSelect(user.id, value, `${user.first_name} ${user.last_name}`)}
                              disabled={processing}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="brother">Brother</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-2 text-gray-500 text-sm">{formatDate(user.created_at)}</td>
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

      <AlertDialog open={roleChangeDialog.isOpen} onOpenChange={() => setRoleChangeDialog({ isOpen: false, userId: null, newRole: null, userName: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change User Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change {roleChangeDialog.userName}'s role to {roleChangeDialog.newRole}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleRoleChange(roleChangeDialog.userId, roleChangeDialog.newRole)}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 