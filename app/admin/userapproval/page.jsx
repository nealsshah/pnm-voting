'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkRole, setBulkRole] = useState('brother')
  const [processing, setProcessing] = useState(false)
  const [roleChangeDialog, setRoleChangeDialog] = useState({
    isOpen: false,
    userId: null,
    newRole: null,
    userName: '',
  })
  const [denyDialog, setDenyDialog] = useState({
    isOpen: false,
    userId: null,
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

  const deleteUser = async (userId) => {
    if (processing) return

    setProcessing(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error?.error || 'Failed to delete user')
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

  const openDenyDialog = (userId, userName) => {
    setDenyDialog({ isOpen: true, userId, userName })
  }

  // Bulk selection helpers
  const toggleSelect = (id, checked) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id))
  }

  // bulk approve helpers
  const approveUsers = async (ids) => {
    if (processing || ids.length === 0) return

    setProcessing(true)
    try {
      const { error } = await supabase
        .from('users_metadata')
        .update({ role: bulkRole })
        .in('id', ids)

      if (error) throw error

      const approvedUsers = pendingUsers.filter(u => ids.includes(u.id))
      setPendingUsers(pendingUsers.filter(u => !ids.includes(u.id)))
      setActiveUsers([...approvedUsers, ...activeUsers])
      // deselect any approved ids
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)))

      toast({
        title: 'Users Approved',
        description: `${approvedUsers.length} users have been approved as ${bulkRole}.`,
      })
    } catch (error) {
      console.error('Error approving users:', error)
      toast({
        title: 'Error',
        description: 'Failed to approve users.',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleApproveSelected = () => {
    approveUsers(selectedIds)
  }

  const handleApproveAll = () => {
    const allIds = pendingUsers.map(u => u.id)
    approveUsers(allIds)
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">User Approval & Management</h1>
        <p className="mt-2 text-muted-foreground text-gray-600 dark:text-gray-300">
          Approve new users and manage existing user roles
        </p>
      </div>

      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
        <CardContent>
          <div className="space-y-6">
            <div className="border-b pb-4 mt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Pending Approval</h3>
                {pendingUsers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={bulkRole}
                      onValueChange={setBulkRole}
                      disabled={processing}
                    >
                      <SelectTrigger className="w-[110px] h-8 text-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brother">Brother</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={handleApproveSelected}
                      disabled={processing || selectedIds.length === 0}
                    >
                      Approve Selected
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleApproveAll}
                      disabled={processing || pendingUsers.length === 0}
                    >
                      Approve All
                    </Button>
                  </div>
                )}
              </div>
              {loading ? (
                <p className="text-gray-500 dark:text-gray-400">Loading users...</p>
              ) : pendingUsers.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No pending users.</p>
              ) : (
                <div className="max-h-96 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-md">
                  {pendingUsers.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between gap-2 py-2 px-3 bg-yellow-50 dark:bg-yellow-900/20"
                    >
                      <Checkbox
                        checked={selectedIds.includes(user.id)}
                        onCheckedChange={(checked) => toggleSelect(user.id, checked)}
                        disabled={processing}
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">{user.first_name} {user.last_name}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-300">{user.email}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">Registered: {formatDate(user.created_at)}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApproveUser(user.id, 'brother')}
                          disabled={processing}
                        >
                          <UserCheck className="mr-1 h-4 w-4" />Brother
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleApproveUser(user.id, 'admin')}
                          disabled={processing}
                        >
                          <UserCheck className="mr-1 h-4 w-4" />Admin
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openDenyDialog(user.id, `${user.first_name} ${user.last_name}`)}
                          disabled={processing}
                        >
                          <UserX className="mr-1 h-4 w-4" />Deny
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-gray-100">Active Users</h3>
              {loading ? (
                <p className="text-gray-500 dark:text-gray-400">Loading users...</p>
              ) : activeUsers.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No active users.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50">
                        <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300 text-sm">Name</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300 text-sm">Email</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300 text-sm">Role</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300 text-sm">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeUsers.map(user => (
                        <tr key={user.id} className="border-t border-gray-200 dark:border-gray-800">
                          <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{user.first_name} {user.last_name}</td>
                          <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{user.email}</td>
                          <td className="px-4 py-2">
                            <Select
                              defaultValue={user.role}
                              onValueChange={(value) => handleRoleSelect(user.id, value, `${user.first_name} ${user.last_name}`)}
                              disabled={processing}
                            >
                              <SelectTrigger className="w-[140px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="brother">Brother</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-2 text-gray-500 dark:text-gray-400 text-sm">{formatDate(user.created_at)}</td>
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
        <AlertDialogContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-100">Change User Role</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700 dark:text-gray-300">
              Are you sure you want to change {roleChangeDialog.userName}'s role to {roleChangeDialog.newRole}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleRoleChange(roleChangeDialog.userId, roleChangeDialog.newRole)}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deny user dialog */}
      <AlertDialog open={denyDialog.isOpen} onOpenChange={() => setDenyDialog({ isOpen: false, userId: null, userName: '' })}>
        <AlertDialogContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-100">Deny User</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700 dark:text-gray-300">
              Are you sure you want to deny {denyDialog.userName}? This action
              will permanently remove the account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={processing}
              onClick={() => {
                deleteUser(denyDialog.userId)
                setDenyDialog({ isOpen: false, userId: null, userName: '' })
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 