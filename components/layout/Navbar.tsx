'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { LogOut, User, Users, Settings, ChevronDown, PanelLeft, PanelRight } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getInitials } from '@/lib/utils'
import ProfileDialog from '@/components/profile/ProfileDialog'

interface NavItem {
  href: string
  label: string
  icon: JSX.Element
  roles: string[]
}

interface NavbarProps {
  user: SupabaseUser | null
}

export default function Navbar({ user }: NavbarProps) {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userMetadata, setUserMetadata] = useState<any>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClientComponentClient()

  // Get current panel state if on candidate page
  const isCandidatePage = pathname?.startsWith('/candidate/')
  const currentPanelOpen = isCandidatePage ? searchParams.get('panelOpen') === 'true' : false

  useEffect(() => {
    async function getUserData() {
      if (!user?.id) return
      
      const { data, error } = await supabase
        .from('users_metadata')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (!error && data) {
        setUserRole(data.role)
        setUserMetadata(data)
      }
    }

    getUserData()
  }, [user, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const navItems: NavItem[] = [
    { 
      href: '/gallery', 
      label: 'Gallery', 
      icon: <Users className="h-4 w-4 mr-2" />, 
      roles: ['admin', 'brother'] 
    },
    { 
      href: '/candidate', 
      label: 'Candidate', 
      icon: <User className="h-4 w-4 mr-2" />, 
      roles: ['admin', 'brother'] 
    },
    { 
      href: '/admin', 
      label: 'Admin', 
      icon: <Settings className="h-4 w-4 mr-2" />, 
      roles: ['admin'] 
    },
  ]

  const isActivePath = (href: string) => {
    if (href === '/gallery' && pathname === '/') return true
    if (href === '/candidate' && pathname.startsWith('/candidate/')) return true
    return pathname === href
  }

  const togglePanel = () => {
    if (!isCandidatePage) return
    const params = new URLSearchParams(searchParams as any)
    if (currentPanelOpen) {
      params.set('panelOpen', 'false')
    } else {
      params.set('panelOpen', 'true')
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <>
      <nav className="bg-white border-b relative z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              {isCandidatePage && (
                <button
                  onClick={togglePanel}
                  className="p-2 rounded-md hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors z-50 relative"
                  aria-label="Toggle panel"
                >
                  {currentPanelOpen ? (
                    <PanelLeft className="h-4 w-4" />
                  ) : (
                    <PanelRight className="h-4 w-4" />
                  )}
                </button>
              )}
              {navItems.map((item) => {
                if (!item.roles.includes(userRole || '')) return null
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                      isActivePath(item.href)
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                )
              })}
            </div>
            <div className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {userMetadata ? getInitials(userMetadata.first_name, userMetadata.last_name) : '?'}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>
      <ProfileDialog 
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userMetadata={userMetadata}
      />
    </>
  )
} 