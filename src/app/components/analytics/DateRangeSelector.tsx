import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { useStrings } from '../../hooks/useStrings';

export interface DateRange {
  from: string; // ISO 8601 format
  to: string;   // ISO 8601 format
}

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const { t } = useStrings();
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Format date for display when collapsed
  const formatDisplayDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Helper to get date in ISO 8601 format (YYYY-MM-DDTHH:mm)
  const toDateTimeLocal = (isoString: string): string => {
    return isoString.slice(0, 16); // Remove seconds and timezone
  };

  // Helper to convert datetime-local value to ISO 8601
  const toISO8601 = (dateTimeLocal: string): string => {
    return new Date(dateTimeLocal).toISOString();
  };

  // Quick preset buttons
  const applyPreset = (days: number) => {
    const now = new Date();
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    const newRange: DateRange = {
      from: from.toISOString(),
      to: now.toISOString(),
    };

    if (validateRange(newRange)) {
      onChange(newRange);
    }
  };

  // Validate the date range
  const validateRange = (range: DateRange): boolean => {
    const fromDate = new Date(range.from);
    const toDate = new Date(range.to);
    
    // Check if end is after start
    if (toDate <= fromDate) {
      setError(t('analytics.dateRange.error.invalidRange'));
      return false;
    }

    // Check maximum 3 months range (90 days)
    const diffInDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffInDays > 90) {
      setError(t('analytics.dateRange.error.maxRange'));
      return false;
    }

    setError(null);
    return true;
  };

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRange: DateRange = {
      from: toISO8601(e.target.value),
      to: value.to,
    };

    if (validateRange(newRange)) {
      onChange(newRange);
    }
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRange: DateRange = {
      from: value.from,
      to: toISO8601(e.target.value),
    };

    if (validateRange(newRange)) {
      onChange(newRange);
    }
  };

  return (
    <div className="bg-card rounded-md border border-border/50 overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <div className="text-left">
            <h3 className="font-medium text-foreground">{t('analytics.dateRange.label')}</h3>
            {!isExpanded && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {formatDisplayDate(value.from)} — {formatDisplayDate(value.to)}
              </p>
            )}
          </div>
        </div>
        <ChevronDown 
          className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-6 pb-6 pt-2 border-t border-border/50">
          {/* Quick Presets */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => applyPreset(7)}
              className="px-3 py-1.5 text-sm rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
            >
              {t('analytics.dateRange.last7days')}
            </button>
            <button
              onClick={() => applyPreset(30)}
              className="px-3 py-1.5 text-sm rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
            >
              {t('analytics.dateRange.last30days')}
            </button>
            <button
              onClick={() => applyPreset(90)}
              className="px-3 py-1.5 text-sm rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
            >
              {t('analytics.dateRange.last90days')}
            </button>
          </div>

          {/* Custom Date Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">
                {t('analytics.dateRange.from')}
              </label>
              <input
                type="datetime-local"
                value={toDateTimeLocal(value.from)}
                onChange={handleFromChange}
                className="w-full px-3 py-2 bg-input-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-2">
                {t('analytics.dateRange.to')}
              </label>
              <input
                type="datetime-local"
                value={toDateTimeLocal(value.to)}
                onChange={handleToChange}
                className="w-full px-3 py-2 bg-input-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Range Info */}
          <div className="mt-3 text-xs text-muted-foreground">
            {t('analytics.dateRange.custom')} • {t('analytics.dateRange.error.maxRange')}
          </div>
        </div>
      )}
    </div>
  );
}