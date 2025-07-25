"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (
    <ToastPrimitives.Viewport
        ref={ref}
        className={cn(
            "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
            className
        )}
        {...props}
    />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const Toast = React.forwardRef(({ className, variant, ...props }, ref) => {
    return (
        <ToastPrimitives.Root
            ref={ref}
            className={cn(
                "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
                {
                    "border-gray-200 bg-white text-gray-950": variant === "default",
                    "bg-gray-950 text-gray-50 border-gray-800": variant === "destructive",
                    "border-green-800 bg-green-700 text-gray-50": variant === "success",
                },
                className
            )}
            {...props}
        />
    )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
    <ToastPrimitives.Action
        ref={ref}
        className={cn(
            "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-transparent px-3 text-sm font-medium ring-offset-white transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-gray-700 group-[.destructive]:hover:border-gray-600 group-[.destructive]:hover:bg-gray-600 group-[.destructive]:hover:text-gray-50 group-[.destructive]:focus:ring-gray-600",
            className
        )}
        {...props}
    />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef(({ className, ...props }, ref) => (
    <ToastPrimitives.Close
        ref={ref}
        className={cn(
            "absolute right-2 top-2 rounded-md p-1 text-gray-500 opacity-0 transition-opacity hover:text-gray-950 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-gray-300 group-[.destructive]:hover:text-gray-50 group-[.destructive]:focus:ring-gray-400 group-[.destructive]:focus:ring-offset-gray-800",
            className
        )}
        toast-close=""
        {...props}
    >
        <X className="h-4 w-4" />
    </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
    <ToastPrimitives.Title
        ref={ref}
        className={cn("text-sm font-semibold", className)}
        {...props}
    />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
    <ToastPrimitives.Description
        ref={ref}
        className={cn("text-sm opacity-90", className)}
        {...props}
    />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

export {
    ToastProvider,
    ToastViewport,
    Toast,
    ToastTitle,
    ToastDescription,
    ToastClose,
    ToastAction,
} 