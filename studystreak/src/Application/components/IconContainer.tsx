import type { ReactNode } from 'react';

interface IconContainerProps {
  children: ReactNode;
}

export function IconContainer({ children }: IconContainerProps) {
  return (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors bg-white/5 group-hover:bg-white/10">
      {children}
    </div>
  );
}