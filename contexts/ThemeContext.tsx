'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
    theme: Theme
    toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('light')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        // Check for saved theme preference or default to light mode
        const savedTheme = localStorage.getItem('theme') as Theme
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

        if (savedTheme) {
            setTheme(savedTheme)
        } else if (prefersDark) {
            setTheme('dark')
        }
        setMounted(true)
    }, [])

    useEffect(() => {
        // Update the document class when theme changes
        const root = window.document.documentElement
        root.classList.remove('light', 'dark')
        root.classList.add(theme)
        localStorage.setItem('theme', theme)
    }, [theme])

    const toggleTheme = () => {
        setTheme(prev => {
            const next = prev === 'light' ? 'dark' : 'light'
            const root = window.document.documentElement
            root.classList.remove('light', 'dark')
            root.classList.add(next)
            localStorage.setItem('theme', next)
            return next
        })
    }

    if (!mounted) return null

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
} 