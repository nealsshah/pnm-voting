'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
    theme: Theme
    setTheme: (theme: Theme) => void
    resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('system')
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        // Check for saved theme preference or default to system
        const savedTheme = localStorage.getItem('theme') as Theme
        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
            setTheme(savedTheme)
        }
        setMounted(true)
    }, [])

    useEffect(() => {
        // Determine the actual theme to apply
        let actualTheme: 'light' | 'dark'

        if (theme === 'system') {
            actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        } else {
            actualTheme = theme
        }

        setResolvedTheme(actualTheme)

        // Update the document class
        const root = window.document.documentElement
        root.classList.remove('light', 'dark')
        root.classList.add(actualTheme)
        localStorage.setItem('theme', theme)
    }, [theme])

    // Listen for system theme changes when in system mode
    useEffect(() => {
        if (theme !== 'system') return

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        const handleChange = () => {
            const actualTheme = mediaQuery.matches ? 'dark' : 'light'
            setResolvedTheme(actualTheme)

            const root = window.document.documentElement
            root.classList.remove('light', 'dark')
            root.classList.add(actualTheme)
        }

        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [theme])

    if (!mounted) return null

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
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