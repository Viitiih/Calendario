import * as React from "react";
import { cn } from "../lib/utils";

interface SkeletonProps {
  isDarkMode: boolean;
}

// Skeleton para os 3 cards de stats do CalendarView
export function CalendarStatsSkeleton({ isDarkMode }: SkeletonProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "p-3 rounded-2xl border",
            isDarkMode
              ? "bg-white/[0.03] border-white/[0.05]"
              : "bg-white border-slate-200/60 shadow-soft"
          )}
        >
          <div className={cn("w-7 h-7 rounded-lg mb-2", isDarkMode ? "skeleton" : "skeleton-light")} />
          <div className={cn("h-2 w-12 rounded mb-2", isDarkMode ? "skeleton" : "skeleton-light")} />
          <div className={cn("h-3 w-8 rounded", isDarkMode ? "skeleton" : "skeleton-light")} />
        </div>
      ))}
    </div>
  );
}

// Skeleton para o calendário inteiro
export function CalendarGridSkeleton({ isDarkMode }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-[40px] border p-6",
        isDarkMode
          ? "bg-black/40 border-white/[0.03]"
          : "bg-white border-slate-200/60 shadow-premium"
      )}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col gap-2">
          <div className={cn("h-8 w-24 rounded-lg", isDarkMode ? "skeleton" : "skeleton-light")} />
          <div className={cn("h-2 w-10 rounded", isDarkMode ? "skeleton" : "skeleton-light")} />
        </div>
        <div className={cn("h-10 w-24 rounded-2xl", isDarkMode ? "skeleton" : "skeleton-light")} />
      </div>

      {/* Tabs */}
      <div className={cn("h-9 w-full rounded-full mb-6", isDarkMode ? "skeleton" : "skeleton-light")} />

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {[...Array(7)].map((_, i) => (
          <div key={i} className={cn("h-5 rounded", isDarkMode ? "skeleton" : "skeleton-light")} />
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-1.5 gap-x-1">
        {[...Array(35)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "aspect-square rounded-2xl",
              isDarkMode ? "skeleton" : "skeleton-light",
              i % 7 === 0 || i % 7 === 6 ? "opacity-40" : ""
            )}
            style={{ animationDelay: `${i * 20}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

// Skeleton para lista de membros
export function MembersSkeleton({ isDarkMode }: SkeletonProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-2 pb-10">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "h-7 w-24 rounded-full",
            isDarkMode ? "skeleton" : "skeleton-light"
          )}
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  );
}

// Skeleton genérico para qualquer card
export function CardSkeleton({ isDarkMode, className }: SkeletonProps & { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-3xl border p-5",
        isDarkMode
          ? "bg-white/[0.03] border-white/[0.05]"
          : "bg-white border-slate-200/60 shadow-soft",
        className
      )}
    >
      <div className={cn("h-4 w-3/4 rounded mb-3", isDarkMode ? "skeleton" : "skeleton-light")} />
      <div className={cn("h-3 w-1/2 rounded mb-2", isDarkMode ? "skeleton" : "skeleton-light")} />
      <div className={cn("h-3 w-2/3 rounded", isDarkMode ? "skeleton" : "skeleton-light")} />
    </div>
  );
}
