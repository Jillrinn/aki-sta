import React from 'react';

export const BrowserRouter = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export const Routes = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export const Route = ({ element }: { element: React.ReactNode; path: string }) => {
  return <>{element}</>;
};

export const Link = ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => {
  return <a href={to} className={className}>{children}</a>;
};