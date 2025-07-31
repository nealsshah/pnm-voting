'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme()

    return (
        <DropdownMenuItem
            onClick={toggleTheme}
            className="w-full justify-start"
        >
            {theme === 'light' ? (
                <Moon className="mr-2 h-4 w-4" />
            ) : (
                <Sun className="mr-2 h-4 w-4" />
            )}
            <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
        </DropdownMenuItem>
    )
} 