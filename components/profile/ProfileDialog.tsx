'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { getInitials } from '@/lib/utils'

interface ProfileDialogProps {
  isOpen: boolean
  onClose: () => void
  userMetadata: any
}

export default function ProfileDialog({ isOpen, onClose, userMetadata }: ProfileDialogProps) {
  if (!userMetadata) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-2xl font-medium">
              {getInitials(userMetadata.first_name, userMetadata.last_name)}
            </span>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium">
              {userMetadata.first_name} {userMetadata.last_name}
            </h3>
            <p className="text-sm text-muted-foreground">{userMetadata.email}</p>
          </div>
          <Card className="w-full">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Role</p>
                  <p className="mt-1 capitalize">{userMetadata.role}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                  <p className="mt-1">
                    {new Date(userMetadata.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
} 