import React from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  Users, 
  Settings, 
  Wallet,
  UserPlus,
  ListChecks,
  ChevronLeft,
  ChevronRight,
  Zap,
  FileText,
  Building2,
  FileUser,
  Shield,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Code,
  ArrowDownToLine,
  LayoutTemplate
} from 'lucide-react';
import { useIsSidebarCollapsed, useUserPreferences } from '../../store/userPreferences';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import type { RBACRole } from '../../contexts/AuthContext';
import { useStrings } from '../../hooks/useStrings';
import { useTheme } from 'next-themes';
import symbolLogo from 'figma:asset/bab8c4cff754030103d6382906a69768e5a801a9.png';
import lightModeLogo from 'figma:asset/fe720ed8608a9c49040d131fde8a68a1ca7bc972.png';
import darkModeLogo from 'figma:asset/73419ddf34e24ed756a8005e641b11ece8a42ee9.png';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  allowedRoles?: RBACRole[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  // No group - Top level
  {
    title: '',
    items: [
      { id: 'dashboard', label: 'nav.overview', icon: <LayoutDashboard className="size-5" /> },
    ],
  },
  // Operations
  {
    title: 'nav.section.operations',
    items: [
      { 
        id: 'withdraw', 
        label: 'nav.withdraw', 
        icon: <ArrowDownToLine className="size-5" />,
        allowedRoles: ['admin'],
      },
      { 
        id: 'whitelist', 
        label: 'nav.whitelist', 
        icon: <ListChecks className="size-5" />,
        allowedRoles: ['admin'],
      },
      { 
        id: 'templates', 
        label: 'nav.templates', 
        icon: <LayoutTemplate className="size-5" />,
        allowedRoles: ['admin'],
      },
      { 
        id: 'disputes', 
        label: 'nav.disputes', 
        icon: <AlertTriangle className="size-5" />,
      },
    ],
  },
  // Reports
  {
    title: 'nav.section.reports',
    items: [
      { id: 'analytics', label: 'nav.analytics', icon: <BarChart3 className="size-5" /> },
      { id: 'transactions', label: 'nav.payments', icon: <Wallet className="size-5" /> },
      { id: 'statement', label: 'nav.statement', icon: <FileText className="size-5" /> },
      { id: 'accounts', label: 'nav.accounts', icon: <Building2 className="size-5" /> },
    ],
  },
  // Developers
  {
    title: 'nav.section.developers',
    items: [
      { id: 'api-integration', label: 'nav.apiIntegration', icon: <Code className="size-5" /> },
    ],
  },
  // My Company
  {
    title: 'nav.section.myCompany',
    items: [
      { 
        id: 'company-profile', 
        label: 'nav.companyProfile', 
        icon: <FileUser className="size-5" />,
      },
      { 
        id: 'add-user', 
        label: 'nav.addUser', 
        icon: <UserPlus className="size-5" />,
        allowedRoles: ['admin'],
      },
    ],
  },
  // Settings
  {
    title: 'nav.section.settings',
    items: [
      { id: 'dashboard-settings', label: 'nav.dashboardSettings', icon: <Settings className="size-5" /> },
      { id: 'security', label: 'nav.security', icon: <Shield className="size-5" /> },
    ],
  },
  // Support - Standalone at bottom
  {
    title: '',
    items: [
      { id: 'support', label: 'nav.support', icon: <HelpCircle className="size-5" /> },
    ],
  },
];

interface SidebarProps {
  activeNav: string;
  onNavChange: (navId: string) => void;
  forceExpanded?: boolean;
}

export function Sidebar({ activeNav, onNavChange, forceExpanded = false }: SidebarProps) {
  const isCollapsed = useIsSidebarCollapsed();
  const toggleSidebar = useUserPreferences((state) => state.toggleSidebar);
  const { hasRole } = useAuth();
  const { t } = useStrings();
  const { theme } = useTheme();
  
  // On mobile sheet, always show expanded
  const showExpanded = forceExpanded || !isCollapsed;

  return (
    <aside className={`h-screen bg-card border-r flex flex-col transition-all duration-300 ${forceExpanded ? 'w-full' : (isCollapsed ? 'w-20' : 'w-64')}`}>
      {/* Logo - Crossramp Branding - Minimal, monochrome */}
      <div className="h-16 border-b flex items-center px-6 justify-between">
        {showExpanded ? (
          <img 
            src={theme === 'dark' ? darkModeLogo : lightModeLogo} 
            alt="Crossramp" 
            className="h-8 w-auto"
          />
        ) : (
          <img 
            src={symbolLogo} 
            alt="Crossramp" 
            className="size-9 mx-auto"
          />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {navSections.map((section, index) => {
          // Filter items by role permissions
          const visibleItems = section.items.filter((item) => !item.allowedRoles || hasRole(item.allowedRoles));
          
          // Skip empty sections
          if (visibleItems.length === 0) {
            return null;
          }

          return (
            <div key={section.title || `section-${index}`}>
              {showExpanded && section.title && (
                <h3 className="px-3 mb-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  {t(section.title)}
                </h3>
              )}
              <ul className="space-y-1">
                {visibleItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => onNavChange(item.id)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                        ${activeNav === item.id 
                          ? 'bg-accent text-foreground border-l-2 border-primary' 
                          : 'hover:bg-muted/40 text-sidebar-foreground border-l-2 border-transparent'
                        }
                        ${!showExpanded ? 'justify-center' : ''}
                        ${item.id === 'support' ? 'border border-primary/20 bg-primary/5 hover:bg-primary/10' : ''}
                      `}
                      title={!showExpanded ? item.label : undefined}
                    >
                      <span className="flex-shrink-0">
                        {item.icon}
                      </span>
                      {showExpanded && (
                        <span className={`text-sm ${activeNav === item.id ? 'font-medium' : ''}`} style={{ fontFamily: 'Manrope' }}>{t(item.label)}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Collapse Toggle Button */}
      {!forceExpanded && (
        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-center hover:bg-sidebar-accent"
            onClick={toggleSidebar}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
          </Button>
        </div>
      )}
    </aside>
  );
}