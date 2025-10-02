"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="peer sr-only"
          {...props}
        />
        <div
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-200 ease-in-out cursor-pointer",
            "border-border/60 bg-background/50 hover:border-primary/50 hover:bg-background",
            "peer-checked:border-primary peer-checked:bg-primary peer-checked:shadow-sm",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2",
            "dark:border-white/20 dark:bg-card/30 dark:hover:border-primary/60",
            "dark:peer-checked:bg-primary dark:peer-checked:border-primary",
            className
          )}
          onClick={() => onCheckedChange?.(!checked)}
        >
          <Check
            className={cn(
              "h-3.5 w-3.5 text-primary-foreground transition-all duration-200 ease-in-out",
              checked ? "scale-100 opacity-100" : "scale-0 opacity-0"
            )}
            strokeWidth={3}
          />
        </div>
      </div>
    )
  }
)

Checkbox.displayName = "Checkbox"