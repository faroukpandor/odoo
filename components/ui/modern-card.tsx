import * as React from "react"
import { cn } from "@/lib/utils"

const ModernCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "interactive" | "gradient" }
>(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl transition-all duration-300",
      variant === "default" && "glass-dark",
      variant === "interactive" && "glass-dark hover:glass hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer",
      variant === "gradient" &&
        "bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-md border border-blue-500/20 hover:border-blue-500/40",
      className,
    )}
    {...props}
  />
))
ModernCard.displayName = "ModernCard"

const ModernCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
)
ModernCardHeader.displayName = "ModernCardHeader"

const ModernCardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn("text-2xl font-bold tracking-tight text-slate-50", className)} {...props} />
  ),
)
ModernCardTitle.displayName = "ModernCardTitle"

const ModernCardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <p ref={ref} className={cn("text-sm text-slate-400", className)} {...props} />,
)
ModernCardDescription.displayName = "ModernCardDescription"

const ModernCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
)
ModernCardContent.displayName = "ModernCardContent"

const ModernCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
)
ModernCardFooter.displayName = "ModernCardFooter"

export { ModernCard, ModernCardHeader, ModernCardTitle, ModernCardDescription, ModernCardContent, ModernCardFooter }
