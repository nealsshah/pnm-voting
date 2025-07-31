'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function TestThemePage() {
    const { theme, setTheme, resolvedTheme } = useTheme()

    return (
        <div className="container mx-auto p-8 space-y-6">
            <h1 className="text-3xl font-bold">Theme Test Page</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Current Theme Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 border rounded-lg">
                            <h3 className="font-semibold mb-2">Selected Theme</h3>
                            <p className="text-sm text-muted-foreground">{theme}</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                            <h3 className="font-semibold mb-2">Resolved Theme</h3>
                            <p className="text-sm text-muted-foreground">{resolvedTheme}</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                            <h3 className="font-semibold mb-2">System Preference</h3>
                            <p className="text-sm text-muted-foreground">
                                {typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light'}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-semibold">Theme Options</h3>
                        <div className="flex gap-2">
                            <Button
                                variant={theme === 'light' ? 'default' : 'outline'}
                                onClick={() => setTheme('light')}
                            >
                                Light
                            </Button>
                            <Button
                                variant={theme === 'dark' ? 'default' : 'outline'}
                                onClick={() => setTheme('dark')}
                            >
                                Dark
                            </Button>
                            <Button
                                variant={theme === 'system' ? 'default' : 'outline'}
                                onClick={() => setTheme('system')}
                            >
                                System
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Theme Preview</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-foreground">
                        This text should change color based on the current theme.
                        The background should also adapt to the selected theme.
                    </p>
                    <div className="mt-4 p-4 bg-background border rounded-lg">
                        <p className="text-muted-foreground">
                            This is a muted text that should also adapt to the theme.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
} 