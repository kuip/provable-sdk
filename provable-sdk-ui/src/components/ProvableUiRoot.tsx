import React from 'react';

export function ProvableUiRoot({
  theme = 'light',
  className,
  children
}: {
  theme?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const classes = ['provable-ui', className].filter(Boolean).join(' ');

  return (
    <div className={classes} data-theme={theme}>
      {children}
    </div>
  );
}
