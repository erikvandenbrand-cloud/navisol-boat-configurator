import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-teal-100 text-teal-700",
        secondary:
          "border-transparent bg-slate-100 text-slate-600",
        destructive:
          "border-transparent bg-red-50 text-red-700",
        outline: "border-slate-200 text-slate-600 bg-white",
        success: "border-transparent bg-green-50 text-green-700",
        warning: "border-transparent bg-amber-50 text-amber-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
