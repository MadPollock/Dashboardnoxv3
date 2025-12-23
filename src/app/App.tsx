import { ReactNode, useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { Auth0Provider } from '@auth0/auth0-react';
import { AuthProvider, isMockAuthEnabled } from './contexts/AuthContext';
import { getAuth0Config } from './config/runtime';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardView } from './views/DashboardView';
import { AnalyticsView } from './views/AnalyticsView';
import { TransactionsView } from './views/TransactionsView';
import { StatementView } from './views/StatementView';
import { ReputationStatementView } from './views/ReputationStatementView';
import { AccountsView } from './views/AccountsView';
import { WithdrawView } from './views/WithdrawView';
import { WhitelistView } from './views/WhitelistView';
import { AddUserView } from './views/AddUserView';
import { CompanyProfileView } from './views/CompanyProfileView';
import { TemplatesView } from './views/TemplatesView';
import { DisputesView } from './views/DisputesView';
import { DashboardSettingsView } from './views/DashboardSettingsView';
import { SecurityView } from './views/SecurityView';
import { SupportView } from './components/admin/SupportView';
import { APIIntegrationView } from './views/APIIntegrationView';
import { ReceivePaymentModal } from './components/modals/ReceivePaymentModal';
import { useOnboardingSync } from './hooks/useOnboardingSync';

// Auth0Provider wrapper (only used if not in mock mode)
// Defined outside App component to prevent recreation on every render
function Auth0Wrapper({ children }: { children: ReactNode }) {
  const mockAuthEnabled = isMockAuthEnabled();
  
  if (mockAuthEnabled) {
    return <>{children}</>;
  }

  // Get Auth0 config from runtime config
  const auth0Config = getAuth0Config();

  return (
    <Auth0Provider
      domain={auth0Config.domain}
      clientId={auth0Config.clientId}
      authorizationParams={{
        redirect_uri: auth0Config.redirectUri || window.location.origin,
        audience: auth0Config.audience,
      }}
    >
      {children}
    </Auth0Provider>
  );
}

// Component that uses auth hooks (must be inside AuthProvider)
// Defined outside App component to prevent recreation on every render
interface AppContentProps {
  activeNav: string;
  onNavChange: (nav: string) => void;
  onOpenReceivePayment: () => void;
  renderView: () => ReactNode;
}

function AppContent({ activeNav, onNavChange, onOpenReceivePayment, renderView }: AppContentProps) {
  // Sync onboarding state on mount
  useOnboardingSync();

  return (
    <DashboardLayout 
      activeNav={activeNav} 
      onNavChange={onNavChange}
      onOpenReceivePayment={onOpenReceivePayment}
    >
      {renderView()}
    </DashboardLayout>
  );
}

export default function App() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [analyticsDateRange, setAnalyticsDateRange] = useState<{ from: string; to: string } | null>(null);
  const [isReceivePaymentOpen, setIsReceivePaymentOpen] = useState(false);

  const navigateToAnalytics = (dateRange?: { from: string; to: string }) => {
    if (dateRange) {
      setAnalyticsDateRange(dateRange);
    } else {
      setAnalyticsDateRange(null);
    }
    setActiveNav('analytics');
  };

  const renderView = () => {
    switch (activeNav) {
      case 'dashboard':
        return <DashboardView onNavigate={setActiveNav} onNavigateToAnalytics={navigateToAnalytics} />;
      case 'transactions':
        return <TransactionsView />;
      case 'statement':
        return <StatementView />;
      case 'reputation-statement':
        return <ReputationStatementView onBack={() => setActiveNav('company-profile')} />;
      case 'analytics':
        return <AnalyticsView initialDateRange={analyticsDateRange} />;
      case 'accounts':
        return <AccountsView />;
      case 'withdraw':
        return <WithdrawView />;
      case 'whitelist':
        return <WhitelistView />;
      case 'company-profile':
        return <CompanyProfileView onNavigate={setActiveNav} />;
      case 'add-user':
        return <AddUserView />;
      case 'templates':
        return <TemplatesView />;
      case 'disputes':
        return <DisputesView />;
      case 'dashboard-settings':
        return <DashboardSettingsView />;
      case 'security':
        return <SecurityView />;
      case 'support':
        return <SupportView />;
      case 'api-integration':
        return <APIIntegrationView />;
      default:
        return <DashboardView onNavigate={setActiveNav} onNavigateToAnalytics={navigateToAnalytics} />;
    }
  };

  return (
    <Auth0Wrapper>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthProvider>
          <AppContent 
            activeNav={activeNav} 
            onNavChange={setActiveNav}
            onOpenReceivePayment={() => setIsReceivePaymentOpen(true)}
            renderView={renderView}
          />
          
          {/* Receive Payment Modal */}
          <ReceivePaymentModal 
            isOpen={isReceivePaymentOpen} 
            onClose={() => setIsReceivePaymentOpen(false)} 
          />
        </AuthProvider>
      </ThemeProvider>
    </Auth0Wrapper>
  );
}