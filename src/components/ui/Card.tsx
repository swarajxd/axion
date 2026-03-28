import { type HTMLAttributes, type ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'flat' | 'outline';
}

export const Card = ({ children, className = '', variant = 'default' }: CardProps) => {
  const variants = {
    default: 'bg-surface-container-lowest shadow-premium hover:shadow-premium-hover',
    flat: 'bg-surface-container-low',
    outline: 'bg-transparent border border-outline-variant/15',
  };

  return (
    <div className={`rounded-lg p-8 transition-all duration-500 ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
};
