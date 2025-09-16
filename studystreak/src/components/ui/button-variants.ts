/**
 * Button Variants - Style definitions for buttons using Class Variance Authority
 * 
 * This file defines all styling variations for buttons in the application. It uses
 * Class Variance Authority (CVA) to generate Tailwind class names based on props.
 * 
 * @module components/ui/button-variants
 */

import { cva, type VariantProps } from "class-variance-authority"

/**
 * A function that generates button class names based on variants and sizes.
 * 
 * @example
 * // Using in a component
 * <div className={buttonVariants({ variant: "outline", size: "sm" })}>
 *   Content
 * </div>
 * 
 * @param options - Object containing variant and size options
 * @returns A string of Tailwind classes
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * Type definition for button variant props.
 * 
 * This type is derived from the buttonVariants configuration and provides
 * type-safety when using button styling props.
 * 
 * @example
 * function MyComponent({ variant, size }: ButtonVariantProps) {
 *   return <div className={buttonVariants({ variant, size })}>Content</div>
 * }
 */
export type ButtonVariantProps = VariantProps<typeof buttonVariants>