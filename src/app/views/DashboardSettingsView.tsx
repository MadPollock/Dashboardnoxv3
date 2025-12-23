/**
 * DashboardSettingsView - Dashboard settings and preferences page
 * 
 * This view demonstrates the user preferences store in action.
 * It's a pure UX/UI view with no transactional data.
 */

import React from 'react';
import { PreferencesPanel } from '../components/settings/PreferencesPanel';

export function DashboardSettingsView() {
  return (
    <div className="max-w-4xl mx-auto">
      <PreferencesPanel />
    </div>
  );
}
