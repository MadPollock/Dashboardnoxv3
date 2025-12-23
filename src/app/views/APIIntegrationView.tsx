import React from 'react';
import { ExternalLink, Key, AlertTriangle, CheckCircle, Clock, XCircle, Lock, Plus, FileCode, BookOpen, Webhook, Network } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Banner } from '../components/ui/banner';
import { useStrings } from '../hooks/useStrings';
import { useAuth } from '../contexts/AuthContext';
import { queryAPIKeys, APIKey, APIKeysResponse } from '../lib/queries';
import { createAPIKey, disableAPIKey, CreateAPIKeyPayload, DisableAPIKeyPayload } from '../lib/commands';
import { useQuery, useMutation } from '../hooks/useQuery';
import { toast } from 'sonner';

type APIKeyStatus = 'active' | 'waiting_approval' | 'disabled';

interface ResourceCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}

function ResourceCard({ title, description, icon, href }: ResourceCardProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative bg-card rounded-md p-6 border border-border hover:border-primary/20 transition-all hover:shadow-lg hover:scale-[1.02] duration-200"
    >
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold" style={{ fontFamily: 'Manrope' }}>
              {title}
            </h3>
            <ExternalLink className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </a>
  );
}

export function APIIntegrationView() {
  const { t } = useStrings();
  const { loginWithMFA } = useAuth();

  // Query API keys using useQuery hook
  const {
    data: apiKeysData,
    isLoading,
    error,
    refetch,
  } = useQuery<APIKeysResponse>(
    ['apiKeys'],
    () => queryAPIKeys(),
    {
      refetchOnMount: true,
      staleTime: 60000, // 1 minute
    }
  );

  const apiKeys = apiKeysData?.api_keys || [];

  // Mutation for creating API key
  const createMutation = useMutation(
    ({ payload, accessToken }: { payload: CreateAPIKeyPayload; accessToken: string }) =>
      createAPIKey(payload, { accessToken }),
    {
    onSuccess: (response) => {
      toast.success('API key created successfully. It will be sent to your email once approved.');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create API key: ${error.message}`);
    },
  });

  // Mutation for disabling API key
  const disableMutation = useMutation(
    ({ payload, accessToken }: { payload: DisableAPIKeyPayload; accessToken: string }) =>
      disableAPIKey(payload, { accessToken }),
    {
    onSuccess: () => {
      toast.success('API key disabled successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to disable API key: ${error.message}`);
    },
  });

  const handleCreateAPIKey = async () => {
    // In a real implementation, this would show a form to collect key details
    // For now, we'll use default values
    const payload: CreateAPIKeyPayload = {
      name: `API Key ${new Date().toISOString().split('T')[0]}`,
      environment: 'production',
      permissions: ['read:payments', 'write:payments'],
      ip_whitelist: [],
      rate_limit: 1000,
    };

    try {
      const mfaToken = await loginWithMFA();

      // Execute mutation with MFA-verified token
      await createMutation.mutateAsync({
        payload,
        accessToken: mfaToken,
      });
    } catch (error) {
      console.error('MFA verification failed:', error);
    }
  };

  const handleDisableAPIKey = async (keyId: string) => {
    try {
      const mfaToken = await loginWithMFA();

      // Execute mutation with MFA-verified token
      await disableMutation.mutateAsync({
        payload: {
          api_key_id: keyId,
          reason: 'Disabled by user',
        },
        accessToken: mfaToken,
      });
    } catch (error) {
      console.error('MFA verification failed:', error);
    }
  };

  const getStatusBadge = (status: APIKeyStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#ff4c00', color: 'white' }}>
            <CheckCircle className="size-3.5" />
            {t('api.status.active')}
          </span>
        );
      case 'waiting_approval':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#ffb400', color: 'white' }}>
            <Clock className="size-3.5" />
            {t('api.status.waitingApproval')}
          </span>
        );
      case 'disabled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
            <XCircle className="size-3.5" />
            {t('api.status.disabled')}
          </span>
        );
    }
  };

  const resources = [
    {
      title: t('api.resources.codeReference.title'),
      description: t('api.resources.codeReference.description'),
      icon: <FileCode className="size-6 text-muted-foreground" />,
      href: '#', // TODO: Add actual Code Reference URL
    },
    {
      title: t('api.resources.implementationGuide.title'),
      description: t('api.resources.implementationGuide.description'),
      icon: <BookOpen className="size-6 text-muted-foreground" />,
      href: '#', // TODO: Add actual Implementation Guide URL
    },
    {
      title: t('api.resources.webhooksGuide.title'),
      description: t('api.resources.webhooksGuide.description'),
      icon: <Webhook className="size-6 text-muted-foreground" />,
      href: '#', // TODO: Add actual Webhooks Guide URL
    },
    {
      title: t('api.resources.flowsGuide.title'),
      description: t('api.resources.flowsGuide.description'),
      icon: <Network className="size-6 text-muted-foreground" />,
      href: '#', // TODO: Add actual Flows Guide URL
    },
  ];

  return (
    <>
      <div className="min-h-screen bg-background p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="font-semibold" style={{ fontFamily: 'Manrope' }}>
              {t('api.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('api.subtitle')}
            </p>
          </div>

          {/* Resources Grid */}
          <div>
            <h2 className="font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>
              {t('api.resources.title')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resources.map((resource, index) => (
                <ResourceCard key={index} {...resource} />
              ))}
            </div>
          </div>

          {/* API Keys Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold" style={{ fontFamily: 'Manrope' }}>
                {t('api.keys.title')}
              </h2>
              <Button
                onClick={handleCreateAPIKey}
                variant="write"
                className="gap-2"
              >
                <Lock className="size-4" />
                <Plus className="size-4" />
                {t('api.keys.create')}
              </Button>
            </div>

            {/* Warning Banner */}
            <Banner
              variant="info"
              title={t('api.keys.warning.title')}
              description={t('api.keys.warning.description')}
            />

            {/* API Keys List */}
            <div className="bg-card rounded-md border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                        {t('api.keys.table.name')}
                      </th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                        {t('api.keys.table.key')}
                      </th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                        {t('api.keys.table.status')}
                      </th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                        {t('api.keys.table.created')}
                      </th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                        {t('api.keys.table.createdBy')}
                      </th>
                      <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">
                        {t('api.keys.table.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {apiKeys.map((apiKey) => (
                      <tr key={apiKey.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-medium">{apiKey.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                            {apiKey.key_masked}
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(apiKey.status)}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {new Date(apiKey.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {apiKey.created_by}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {apiKey.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDisableAPIKey(apiKey.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              {t('api.keys.disable')}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {apiKeys.length === 0 && (
                <div className="text-center py-12">
                  <Key className="size-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">
                    {t('api.keys.empty')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}