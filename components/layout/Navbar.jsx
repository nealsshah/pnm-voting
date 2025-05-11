'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { LogOut, User, Users, Settings } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

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
  const pathname = usePathname()
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function getUserRole() {
      if (!user?.id) return
      
      const { data, error } = await supabase
        .from('users_metadata')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (!error && data) {
        setUserRole(data.role)
      }
    }

    getUserRole()
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
      label: 'Candidates', 
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

  return (
    <nav className="bg-white border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
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
            <button
              onClick={handleSignOut}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
} 