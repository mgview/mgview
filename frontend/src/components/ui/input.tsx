import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils.ts';

const inputVariants = cva(
  'flex h-7 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      focusVariant: {
        ring: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        soft: 'transition-colors focus:border-ring focus:bg-accent focus:outline-none focus:ring-0 focus-visible:ring-0',
      },
    },
    defaultVariants: {
      focusVariant: 'ring',
    },
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, focusVariant, ...props }, ref) => (
    <input
      type={type}
      className={cn(inputVariants({ focusVariant }), className)}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export { Input };
