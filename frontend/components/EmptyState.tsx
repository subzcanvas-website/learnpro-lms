import React from 'react';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
          <Icon size={28} className="text-gray-300" />
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-500 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-400 max-w-xs mb-5">{description}</p>}
      {action}
    </div>
  );
}
