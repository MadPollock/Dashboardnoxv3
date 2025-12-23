import React, { useState, useMemo } from 'react';
import { WhitelistGroupForm } from '../components/admin/WhitelistGroupForm';
import { WhitelistForm } from '../components/admin/WhitelistForm';
import { PIXWhitelistForm } from '../components/admin/PIXWhitelistForm';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Lock, Plus, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { Banner } from '../components/ui/banner';
import { useStrings } from '../hooks/useStrings';
import { useQuery } from '../hooks/useQuery';
import {
  queryWhitelistGroups,
  queryPIXKeys,
  type WhitelistGroup,
  type PIXKey,
} from '../lib/queries';

export function WhitelistView() {
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [activeAddressDialog, setActiveAddressDialog] = useState<string | null>(null);
  const [isPixDialogOpen, setIsPixDialogOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'group-1': true,
  });
  const [activeTab, setActiveTab] = useState('pix');

  const { t } = useStrings();

  // ========================================================================
  // QUERIES
  // ========================================================================

  // Load whitelist groups when crypto tab is active
  const {
    data: groupsData,
    loading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups,
  } = useQuery<{ groups: WhitelistGroup[] }>(
    queryWhitelistGroups,
    undefined,
    { enabled: activeTab === 'crypto' }
  );

  // Load PIX keys when PIX tab is active
  const {
    data: pixData,
    loading: pixLoading,
    error: pixError,
    refetch: refetchPix,
  } = useQuery<{ pix_keys: PIXKey[]; total_count: number; max_allowed: number }>(
    queryPIXKeys,
    undefined,
    { enabled: activeTab === 'pix' }
  );

  // ========================================================================
  // DERIVED STATE
  // ========================================================================

  const whitelistGroups = useMemo(() => {
    return groupsData?.groups || [];
  }, [groupsData]);

  const pixKeys = useMemo(() => {
    return pixData?.pix_keys || [];
  }, [pixData]);

  const pixKeysCount = pixData?.total_count || 0;
  const maxPixKeys = pixData?.max_allowed || 5;
  const canAddMorePixKeys = pixKeysCount < maxPixKeys;

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleGroupCreated = () => {
    setIsGroupDialogOpen(false);
    refetchGroups();
  };

  const handleAddressAdded = () => {
    setActiveAddressDialog(null);
    refetchGroups();
  };

  const handlePIXKeyAdded = () => {
    setIsPixDialogOpen(false);
    refetchPix();
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div>
        <h1 style={{ fontFamily: 'Manrope' }}>{t('whitelist.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('whitelist.subtitle')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="pix">{t('whitelist.pix.title')}</TabsTrigger>
          <TabsTrigger value="crypto">{t('whitelist.crypto.title')}</TabsTrigger>
        </TabsList>

        {/* PIX Keys Tab */}
        <TabsContent value="pix" className="space-y-4 mt-6">
          <div
            className="bg-card rounded-md border border-border overflow-hidden"
            style={{ boxShadow: 'var(--shadow-sm)' }}
          >
            <div className="p-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2
                      style={{ fontFamily: 'Manrope', fontSize: '18px', fontWeight: 600 }}
                      className="text-base sm:text-lg"
                    >
                      {t('whitelist.pix.subtitle')}
                    </h2>
                    {pixData && (
                      <Badge variant="secondary">
                        {t('whitelist.pix.limit', { count: pixKeysCount })}
                      </Badge>
                    )}
                  </div>
                </div>

                <Dialog open={isPixDialogOpen} onOpenChange={setIsPixDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="flex items-center gap-2 w-full sm:w-auto"
                      disabled={!canAddMorePixKeys || pixLoading}
                    >
                      <Lock className="size-4" />
                      <Plus className="size-4" />
                      <span className="hidden sm:inline">{t('whitelist.pix.addKey')}</span>
                      <span className="sm:hidden">Add PIX Key</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle style={{ fontFamily: 'Manrope' }}>
                        {t('whitelist.pix.addKey')}
                      </DialogTitle>
                    </DialogHeader>
                    <PIXWhitelistForm onSuccess={handlePIXKeyAdded} />
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="p-4">
              <Banner
                variant="warning"
                title=""
                description={t('whitelist.pix.disclaimer')}
                className="mb-4"
              />

              {pixLoading ? (
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
                  ))}
                </div>
              ) : pixError ? (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 space-y-3">
                  <p className="text-sm text-destructive">
                    Unable to load PIX keys. Please try again.
                  </p>
                  <button
                    onClick={() => refetchPix()}
                    className="inline-flex items-center gap-2 px-4 h-9 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <RefreshCw className="size-4" />
                    Retry
                  </button>
                </div>
              ) : pixKeys.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">{t('whitelist.pix.noKeys')}</p>
                  <p className="text-xs mt-1">{t('whitelist.pix.noKeys.hint')}</p>
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('form.whitelist.label')}</TableHead>
                        <TableHead>PIX Key</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="hidden md:table-cell">
                          {t('whitelist.table.status')}
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">
                          {t('whitelist.table.reason')}
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">
                          {t('whitelist.table.added')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pixKeys.map((pixKey) => (
                        <TableRow key={pixKey.id}>
                          <TableCell className="font-medium">{pixKey.label}</TableCell>
                          <TableCell className="font-mono text-xs">{pixKey.pix_key}</TableCell>
                          <TableCell className="text-sm">
                            <Badge variant="outline">{pixKey.type}</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant={pixKey.status === 'active' ? 'default' : 'secondary'}>
                              {pixKey.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-xs truncate">
                            {pixKey.reason}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                            {pixKey.added_date}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Crypto Wallets Tab */}
        <TabsContent value="crypto" className="space-y-4 mt-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 style={{ fontFamily: 'Manrope', fontSize: '18px', fontWeight: 600 }}>
                {t('whitelist.crypto.subtitle')}
              </h2>
            </div>

            <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2" disabled={groupsLoading}>
                  <Lock className="size-4" />
                  <Plus className="size-4" />
                  {t('whitelist.createGroup')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle style={{ fontFamily: 'Manrope' }}>
                    {t('form.whitelistGroup.title')}
                  </DialogTitle>
                </DialogHeader>
                <WhitelistGroupForm onSuccess={handleGroupCreated} />
              </DialogContent>
            </Dialog>
          </div>

          {/* Explanatory Banner */}
          <Banner
            variant="info"
            title={t('whitelist.banner.title')}
            description={
              <div className="space-y-2">
                <p>
                  <strong>Step 1:</strong> {t('whitelist.banner.step1')}
                </p>
                <p>
                  <strong>Step 2:</strong> {t('whitelist.banner.step2')}
                </p>
                <p className="text-xs">{t('whitelist.banner.note')}</p>
              </div>
            }
          />

          {/* Groups List */}
          {groupsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 bg-muted animate-pulse rounded-md"
                  style={{ boxShadow: 'var(--shadow-sm)' }}
                />
              ))}
            </div>
          ) : groupsError ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 space-y-3">
              <p className="text-sm text-destructive">
                Unable to load whitelist groups. Please try again.
              </p>
              <button
                onClick={() => refetchGroups()}
                className="inline-flex items-center gap-2 px-4 h-9 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="size-4" />
                Retry
              </button>
            </div>
          ) : whitelistGroups.length === 0 ? (
            <div
              className="bg-card rounded-md border border-border p-12 text-center"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              <p className="text-muted-foreground">{t('whitelist.empty.title')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('whitelist.empty.subtitle')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {whitelistGroups.map((group) => {
                const isExpanded = expandedGroups[group.id];

                return (
                  <div
                    key={group.id}
                    className="bg-card rounded-md border border-border overflow-hidden"
                    style={{ boxShadow: 'var(--shadow-sm)' }}
                  >
                    <Collapsible open={isExpanded} onOpenChange={() => toggleGroup(group.id)}>
                      <div className="p-4 flex items-center justify-between border-b border-border">
                        <CollapsibleTrigger className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity">
                          {isExpanded ? (
                            <ChevronDown className="size-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="size-5 text-muted-foreground" />
                          )}
                          <div className="text-left flex-1">
                            <h3 style={{ fontFamily: 'Manrope', fontSize: '16px', fontWeight: 500 }}>
                              {group.label}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-0.5">{group.reason}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('whitelist.group.created')}: {group.created_date} •{' '}
                              {group.addresses.length}{' '}
                              {group.addresses.length === 1
                                ? t('whitelist.group.addresses')
                                : t('whitelist.group.addresses_plural')}
                            </p>
                          </div>
                        </CollapsibleTrigger>

                        <Dialog
                          open={activeAddressDialog === group.id}
                          onOpenChange={(open) => setActiveAddressDialog(open ? group.id : null)}
                        >
                          <DialogTrigger asChild>
                            <Button size="sm" className="flex items-center gap-2 ml-4">
                              <Lock className="size-3.5" />
                              <Plus className="size-3.5" />
                              {t('whitelist.addAddress')}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle style={{ fontFamily: 'Manrope' }}>
                                {t('whitelist.group.addAddressTo', { groupName: group.label })}
                              </DialogTitle>
                            </DialogHeader>
                            <WhitelistForm
                              groupId={group.id}
                              existingAddresses={group.addresses.map((addr) => ({
                                currency: addr.currency,
                                network: addr.network,
                              }))}
                              onSuccess={handleAddressAdded}
                            />
                          </DialogContent>
                        </Dialog>
                      </div>

                      <CollapsibleContent>
                        <div className="p-4">
                          {group.addresses.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <p className="text-sm">{t('whitelist.group.noAddresses')}</p>
                              <p className="text-xs mt-1">{t('whitelist.group.noAddresses.hint')}</p>
                            </div>
                          ) : (
                            <div className="overflow-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>{t('whitelist.table.address')}</TableHead>
                                    <TableHead>{t('whitelist.table.currency')}</TableHead>
                                    <TableHead>{t('whitelist.table.network')}</TableHead>
                                    <TableHead>{t('whitelist.table.status')}</TableHead>
                                    <TableHead>{t('whitelist.table.reason')}</TableHead>
                                    <TableHead>{t('whitelist.table.added')}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {group.addresses.map((addr) => (
                                    <TableRow key={addr.id}>
                                      <TableCell className="font-mono text-xs">
                                        {addr.address.slice(0, 10)}...{addr.address.slice(-8)}
                                      </TableCell>
                                      <TableCell className="text-sm">{addr.currency}</TableCell>
                                      <TableCell className="text-sm">
                                        <Badge variant="outline">{addr.network}</Badge>
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          variant={addr.status === 'active' ? 'default' : 'secondary'}
                                        >
                                          {addr.status}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                                        {addr.reason}
                                      </TableCell>
                                      <TableCell className="text-sm text-muted-foreground">
                                        {addr.added_date}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}