import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { ProtectedActionForm } from './ProtectedActionForm';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { postCommand, CommandContext } from '../../lib/commandClient';
import { useStrings } from '../../hooks/useStrings';
import { useQuery } from '../../hooks/useQuery';
import { WithdrawalConfirmationModal } from '../modals/WithdrawalConfirmationModal';
import { CURRENCIES, getCurrencyByCode, formatCurrency } from '../../config/currencies';
import {
  queryBalances,
  queryWhitelistedWallets,
  queryWhitelistedPix,
  type AccountBalance,
  type WhitelistedWallet,
  type WhitelistedPix,
} from '../../lib/queries';

export function WithdrawalRequestForm() {
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('');
  const [withdrawalType, setWithdrawalType] = useState<'same' | 'brl'>('same');
  const [confirmationUrl, setConfirmationUrl] = useState('');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const { t } = useStrings();

  // ========================================================================
  // QUERIES
  // ========================================================================

  // Category A: Manual refresh only (critical before withdrawal)
  const {
    data: balancesData,
    loading: balancesLoading,
    error: balancesError,
    refetch: refetchBalances,
  } = useQuery<{ accounts: AccountBalance[] }>(queryBalances);

  // Category B: Load once when opening withdraw page
  const {
    data: walletsData,
    loading: walletsLoading,
    error: walletsError,
  } = useQuery<{ wallets: WhitelistedWallet[] }>(queryWhitelistedWallets);

  const {
    data: pixData,
    loading: pixLoading,
    error: pixError,
  } = useQuery<{ pix_addresses: WhitelistedPix[] }>(queryWhitelistedPix);

  // ========================================================================
  // DERIVED STATE
  // ========================================================================

  const accountsData = useMemo(() => {
    return balancesData?.accounts || [];
  }, [balancesData]);

  const whitelistedWallets = useMemo(() => {
    return walletsData?.wallets?.filter(w => w.status === 'active') || [];
  }, [walletsData]);

  const pixAddresses = useMemo(() => {
    return pixData?.pix_addresses?.filter(p => p.status === 'active') || [];
  }, [pixData]);

  // Get the selected account details
  const selectedAccountDetails = useMemo(() => {
    return accountsData.find((account) => account.id === selectedAccount);
  }, [accountsData, selectedAccount]);

  const selectedCurrency = useMemo(() => {
    if (!selectedAccountDetails) return null;
    return getCurrencyByCode(selectedAccountDetails.currency_code);
  }, [selectedAccountDetails]);

  // Filter wallets based on withdrawal type and selected account network
  const filteredWallets = useMemo(() => {
    if (!selectedAccountDetails || !selectedCurrency) return [];

    if (withdrawalType === 'same') {
      // For same-currency withdrawals, filter wallets by matching network
      return whitelistedWallets.filter(
        (wallet) => wallet.network === selectedCurrency.network
      );
    } else {
      // For BRL withdrawals, show PIX addresses
      return pixAddresses;
    }
  }, [selectedAccountDetails, selectedCurrency, withdrawalType, whitelistedWallets, pixAddresses]);

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const handleWithdrawal = async (
    data: Record<string, FormDataEntryValue>,
    context: CommandContext
  ) => {
    const payload = {
      ...data,
      account: selectedAccount,
      wallet: selectedWallet,
      withdrawalType,
    };

    const response = await postCommand('withdrawals/request', payload, context);

    // If API returns a confirmation URL, open it in modal
    if (response?.url) {
      setConfirmationUrl(response.url);
      setShowConfirmationModal(true);
    }

    // Refetch balances after successful withdrawal
    refetchBalances();
  };

  const handleCloseConfirmation = () => {
    setShowConfirmationModal(false);
    setConfirmationUrl('');

    // Reset form after closing confirmation modal
    setSelectedAccount('');
    setSelectedWallet('');
    setWithdrawalType('same');
  };

  // Reset wallet when withdrawal type or account changes
  useEffect(() => {
    setSelectedWallet('');
  }, [withdrawalType, selectedAccount]);

  // ========================================================================
  // HELPERS
  // ========================================================================

  const formatBalance = (balance: string, currency: string) => {
    if (currency === 'BRL') {
      return `R$ ${balance}`;
    }
    return `${balance} ${currency}`;
  };

  const formatRelativeTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  // Error state for critical data
  if (balancesError && !balancesData) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 space-y-3">
        <h3 className="font-medium text-destructive">Unable to load accounts</h3>
        <p className="text-sm text-muted-foreground">
          We couldn't load your account balances. Please refresh the page and try again.
        </p>
        <button
          onClick={() => refetchBalances()}
          className="inline-flex items-center gap-2 px-4 h-9 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="size-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <WithdrawalConfirmationModal
        isOpen={showConfirmationModal}
        onClose={handleCloseConfirmation}
        confirmationUrl={confirmationUrl}
      />

      <ProtectedActionForm
        title={t('form.withdraw.title')}
        description={t('form.withdraw.description')}
        onSubmit={handleWithdrawal}
        requiresMFA={true}
        actionDescription="Withdraw funds to external address"
      >
        <div className="space-y-4">
          {/* Account Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="account">{t('form.withdraw.account')}</Label>
              {balancesData && (
                <button
                  onClick={() => refetchBalances()}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  title="Refresh balances"
                  type="button"
                >
                  <RefreshCw className="size-3" />
                  Refresh
                </button>
              )}
            </div>

            {balancesLoading ? (
              <div className="h-10 bg-muted animate-pulse rounded-md" />
            ) : (
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger id="account">
                  <SelectValue placeholder={t('form.withdraw.account')} />
                </SelectTrigger>
                <SelectContent>
                  {accountsData.length > 0 ? (
                    accountsData.map((account) => {
                      const currencyInfo = getCurrencyByCode(account.currency_code);

                      return (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center justify-between gap-4 w-full">
                            <span className="text-sm">
                              {currencyInfo?.pretty_name || account.currency_code}
                            </span>
                            <span
                              className="text-xs text-muted-foreground font-mono"
                              style={{ fontFamily: 'Manrope' }}
                            >
                              {formatBalance(account.balance, currencyInfo?.currency || 'USDT')}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })
                  ) : (
                    <SelectItem value="none" disabled>
                      No accounts available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">{t('form.withdraw.account.helper')}</p>
          </div>

          {/* Withdrawal Type - Only show for non-BRL accounts */}
          {selectedAccountDetails && selectedCurrency && selectedCurrency.currency !== 'BRL' && (
            <div className="space-y-2">
              <Label htmlFor="withdrawal-type">{t('form.withdraw.type')}</Label>
              <Select
                value={withdrawalType}
                onValueChange={(value: 'same' | 'brl') => setWithdrawalType(value)}
              >
                <SelectTrigger id="withdrawal-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="same">
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="text-sm font-medium">
                        {t('form.withdraw.type.same')} ({selectedCurrency.currency})
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t('form.withdraw.type.same.helper', { network: selectedCurrency.network })}
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="brl">
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="text-sm font-medium">{t('form.withdraw.type.brl')}</span>
                      <span className="text-xs text-muted-foreground">
                        {t('form.withdraw.type.brl.helper')}
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {withdrawalType === 'brl' && (
                <p className="text-xs text-muted-foreground">{t('form.withdraw.type.brl.helper')}</p>
              )}
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">{t('form.withdraw.amount')}</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              placeholder="0.00"
              step="0.01"
              required
              disabled={!selectedAccount}
            />
            {selectedAccountDetails && selectedCurrency && (
              <p className="text-xs text-muted-foreground">
                Available: {formatBalance(selectedAccountDetails.balance, selectedCurrency.currency)}
              </p>
            )}
            {!selectedAccount && (
              <p className="text-xs text-muted-foreground">{t('form.withdraw.amount.helper')}</p>
            )}
          </div>

          {/* Wallet/PIX Selection */}
          <div className="space-y-2">
            <Label htmlFor="wallet">
              {withdrawalType === 'brl' ? t('form.withdraw.wallet.pix') : t('form.withdraw.wallet')}
            </Label>

            {(withdrawalType === 'same' ? walletsLoading : pixLoading) ? (
              <div className="h-10 bg-muted animate-pulse rounded-md" />
            ) : (
              <>
                <Select value={selectedWallet} onValueChange={setSelectedWallet} disabled={!selectedAccount}>
                  <SelectTrigger id="wallet">
                    <SelectValue
                      placeholder={
                        withdrawalType === 'brl'
                          ? t('form.withdraw.wallet.placeholder.pix')
                          : t('form.withdraw.wallet.placeholder')
                      }
                    >
                      {selectedWallet && (
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium truncate">
                            {filteredWallets.find((w) => w.id === selectedWallet)?.label}
                          </span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {filteredWallets.length > 0 ? (
                      filteredWallets.map((wallet) => (
                        <SelectItem key={wallet.id} value={wallet.id}>
                          <div className="flex flex-col items-start gap-0.5 py-1 min-w-0">
                            <span className="text-sm font-medium">{wallet.label}</span>
                            <span className="text-xs text-muted-foreground font-mono truncate max-w-[260px]">
                              {withdrawalType === 'brl'
                                ? (wallet as any).address
                                : `${wallet.address.slice(0, 12)}...${wallet.address.slice(-8)}`}
                            </span>
                            {withdrawalType === 'brl' && (wallet as any).type && (
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                {(wallet as any).type} key
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        {selectedAccount
                          ? withdrawalType === 'brl'
                            ? t('form.withdraw.wallet.none.pix')
                            : t('form.withdraw.wallet.none')
                          : t('form.withdraw.amount.helper')}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>

                {/* Error states for whitelists */}
                {withdrawalType === 'same' && walletsError && (
                  <p className="text-xs text-destructive">Unable to load whitelisted wallets. Please retry.</p>
                )}
                {withdrawalType === 'brl' && pixError && (
                  <p className="text-xs text-destructive">Unable to load PIX addresses. Please retry.</p>
                )}

                {/* Full address display */}
                {selectedWallet && (
                  <div className="rounded-md bg-muted/30 p-2.5">
                    <p className="text-xs text-muted-foreground font-mono break-all leading-relaxed">
                      {withdrawalType === 'brl'
                        ? pixAddresses.find((p) => p.id === selectedWallet)?.address
                        : whitelistedWallets.find((w) => w.id === selectedWallet)?.address}
                    </p>
                    {withdrawalType === 'brl' && pixAddresses.find((p) => p.id === selectedWallet)?.type && (
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">
                        {pixAddresses.find((p) => p.id === selectedWallet)?.type} key
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">{t('form.withdraw.note')}</Label>
            <Input
              id="note"
              name="note"
              type="text"
              placeholder="Add a note..."
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">Optional - Max 500 characters</p>
          </div>
        </div>
      </ProtectedActionForm>
    </>
  );
}