import React from 'react';
import { Activity, Clock } from 'lucide-react';

export type SyncStatus = 'live' | 'syncing';

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  lastSync?: Date;
}

export function SyncStatusIndicator({ status, lastSync }: SyncStatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
      {status === 'live' ? (
        <>
          <span className="size-1.5 bg-foreground/60 rounded-full" />
          <span className="text-xs text-muted-foreground">Live</span>
        </>
      ) : (
        <>
          <span className="size-1.5 bg-muted-foreground/60 rounded-full animate-pulse" />
          <span className="text-xs text-muted-foreground">Syncing</span>
        </>
      )}
      {lastSync && (
        <span className="text-xs text-muted-foreground/70 ml-1">
          {lastSync.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}