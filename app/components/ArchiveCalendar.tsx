'use client';

import Link from 'next/link';
import { useState } from 'react';

interface ArchiveCalendarProps {
  editionDates: string[];  // ['2026-02-05', '2026-02-04', ...]
  initialMonth?: Date;
}

// Helper to get all days in a month
function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

// Helper to get the day of week for the first day of month (0 = Sunday)
function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

// Format date as YYYY-MM-DD
function formatDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Format month name
function formatMonth(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function ArchiveCalendar({ editionDates, initialMonth }: ArchiveCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (initialMonth) return initialMonth;
    // Default to the most recent edition's month, or current month
    if (editionDates.length > 0) {
      const mostRecent = new Date(editionDates[0]);
      return new Date(mostRecent.getFullYear(), mostRecent.getMonth(), 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const editionSet = new Set(editionDates);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfWeek(year, month);

  // Create empty slots for days before the first of the month
  const emptySlots = Array(firstDayOfWeek).fill(null);

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const today = formatDateStr(new Date());

  return (
    <div className="max-w-2xl mx-auto">
      {/* Month header with navigation */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={goToPreviousMonth}
          className="text-2xl px-4 py-2 border border-black bg-white hover:bg-black hover:text-[#f4f1ea] transition-colors"
          aria-label="Previous month"
        >
          ←
        </button>
        <h2 className="font-blackletter text-3xl md:text-4xl text-center">
          {formatMonth(currentMonth)}
        </h2>
        <button
          onClick={goToNextMonth}
          className="text-2xl px-4 py-2 border border-black bg-white hover:bg-black hover:text-[#f4f1ea] transition-colors"
          aria-label="Next month"
        >
          →
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-bold text-xs md:text-sm uppercase tracking-wider py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {/* Empty slots before first day */}
        {emptySlots.map((_, idx) => (
          <div key={`empty-${idx}`} className="aspect-square" />
        ))}

        {/* Day cells */}
        {daysInMonth.map(day => {
          const dateStr = formatDateStr(day);
          const hasEdition = editionSet.has(dateStr);
          const isToday = dateStr === today;
          const isFuture = day > new Date();

          if (hasEdition) {
            return (
              <Link
                key={dateStr}
                href={`/archives/${dateStr}`}
                className={`
                  aspect-square border-2 border-black bg-white p-1 md:p-2
                  hover:bg-amber-50 card-lift-on-hover
                  flex flex-col items-center justify-center
                  transition-all duration-200
                  ${isToday ? 'ring-2 ring-offset-2 ring-black' : ''}
                `}
              >
                <span className="font-mono text-lg md:text-xl font-bold">{day.getDate()}</span>
                <span className="text-[8px] md:text-[10px] uppercase tracking-wider mt-0.5 text-green-700 font-bold">
                  Edition
                </span>
              </Link>
            );
          }

          return (
            <div
              key={dateStr}
              className={`
                aspect-square border border-gray-300 p-1 md:p-2
                flex flex-col items-center justify-center
                ${isFuture ? 'bg-gray-50 opacity-30' : 'bg-gray-100 opacity-60'}
              `}
            >
              <span className="font-mono text-sm md:text-base text-gray-400">{day.getDate()}</span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-8 flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-black bg-white" />
          <span>Edition Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border border-gray-300 bg-gray-100" />
          <span>No Edition</span>
        </div>
      </div>
    </div>
  );
}
