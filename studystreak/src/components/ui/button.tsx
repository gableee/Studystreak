/**
 * Button Component - A flexible, accessible button component
 * 
 * This file implements a customizable Button component that follows best practices
 * for accessibility and styling. It leverages the button variants defined in the
 * button-variants.ts file for consistent styling across the application.
 * 
 * @module components/ui/button
 */

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"
import { buttonVariants, type ButtonVariantProps } from "./button-variants"

/**
 * Props for the Button component.
 * 
 * @interface ButtonProps
 * @extends {React.ButtonHTMLAttributes<HTMLButtonElement>} - All standard HTML button attributes
 * @extends {ButtonVariantProps} - Style variant props (variant, size)
 * @property {boolean} [asChild] - When true, renders children directly with button's props
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantProps {
  asChild?: boolean
}

/**
 * A versatile button component with multiple style variants.
 * 
 * @example
 * // Basic usage
 * <Button>Click me</Button>
 * 
 * @example
 * // With variants
 * <Button variant="outline" size="sm">Small Outline Button</Button>
 * 
 * @example
 * // As a child component (e.g., rendering a Link as a button)
 * <Button asChild>
 *   <Link to="/dashboard">Go to Dashboard</Link>
 * </Button>
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
