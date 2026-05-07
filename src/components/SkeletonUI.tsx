import React from 'react';

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`bg-white rounded-3xl p-6 shadow-sm border border-gray-100 ${className}`}>
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded-full w-3/4 mb-4"></div>
      <div className="h-3 bg-gray-200 rounded-full w-1/2 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded-full w-2/3"></div>
    </div>
  </div>
);

export const SkeletonList: React.FC<{ items?: number; className?: string }> = ({ 
  items = 3, 
  className = "" 
}) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="bg-white rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded-full w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded-full w-1/2"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonTask: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`bg-white rounded-2xl p-4 border border-gray-100 ${className}`}>
    <div className="animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 bg-gray-200 rounded-lg mt-0.5"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded-full w-4/5 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded-full w-1/3"></div>
        </div>
      </div>
    </div>
  </div>
);

export const SkeletonHabit: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`bg-white rounded-2xl p-4 border border-gray-100 ${className}`}>
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 bg-gray-200 rounded-full w-1/3"></div>
        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
    </div>
  </div>
);

export const SkeletonNote: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`bg-white rounded-2xl p-4 border border-gray-100 ${className}`}>
    <div className="animate-pulse">
      <div className="h-5 bg-gray-200 rounded-full w-2/3 mb-3"></div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded-full w-full"></div>
        <div className="h-3 bg-gray-200 rounded-full w-4/5"></div>
        <div className="h-3 bg-gray-200 rounded-full w-3/5"></div>
      </div>
      <div className="flex gap-2 mt-3">
        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
      </div>
    </div>
  </div>
);

export const SkeletonBudget: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`bg-white rounded-2xl p-4 border border-gray-100 ${className}`}>
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 bg-gray-200 rounded-full w-1/3"></div>
        <div className="h-4 bg-gray-200 rounded-full w-1/4"></div>
      </div>
      <div className="h-2 bg-gray-200 rounded-full w-full mb-2"></div>
      <div className="h-2 bg-gray-200 rounded-full w-3/4"></div>
    </div>
  </div>
);

export const SkeletonCalendar: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`bg-white rounded-2xl p-4 border border-gray-100 ${className}`}>
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded-full w-1/3 mb-4"></div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 28 }).map((_, i) => (
          <div key={i} className="h-8 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
    </div>
  </div>
);

export const SkeletonShopping: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`bg-white rounded-2xl p-4 border border-gray-100 ${className}`}>
    <div className="animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 bg-gray-200 rounded-lg"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded-full w-3/4"></div>
        </div>
        <div className="h-6 bg-gray-200 rounded-full w-12"></div>
      </div>
    </div>
  </div>
);

export const SkeletonLoader: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`${sizeClasses[size]} border-2 border-indigo-600 border-t-transparent rounded-full animate-spin`}></div>
  );
};
