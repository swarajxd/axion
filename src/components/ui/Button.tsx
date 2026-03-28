import { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export const Button = ({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '', 
  ...props 
}: ButtonProps) => {
  const baseStyles = 'inline-flex items-center justify-center font-headline font-semibold transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-full';
  
  const variants = {
    primary: 'glow-cta',
    secondary: 'bg-surface-container-high text-on-surface hover:bg-outline-variant/20',
    outline: 'border-2 border-primary/20 text-primary hover:bg-primary/5',
    ghost: 'text-on-surface-variant hover:text-primary hover:bg-primary/5',
  };
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-10 py-5 text-lg',
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
