import React, { useState } from 'react';
import { Card } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useStrings } from '../hooks/useStrings';

// Types
interface BalanceState {
  available: string;
  locked: string;
  toReceive: string;
  blocked: string;
}

interface NetworkAccount {
  id: string;
  network: string;
  internalCode: string;
  balances: BalanceState;
  transactions: Transaction[];
}

interface CurrencyGroup {
  currency: string;
  accounts: NetworkAccount[];
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  debit?: string;
  credit?: string;
  resultingBalance: string;
}

// Mock data
const accountsData: CurrencyGroup[] = [
  {
    currency: 'USDT',
    accounts: [
      {
        id: 'usdt-trx',
        network: 'TRX',
        internalCode: 'ACC-USDT-TRX-001',
        balances: {
          available: '12,480.90',
          locked: '1,200.00',
          toReceive: '450.50',
          blocked: '0.00',
        },
        transactions: [
          {
            id: 'tx1',
            date: '2025-12-17 14:32',
            description: 'Payment received from merchant #3421',
            credit: '1,450.00',
            resultingBalance: '12,480.90',
          },
          {
            id: 'tx2',
            date: '2025-12-17 11:20',
            description: 'Withdrawal to external wallet',
            debit: '2,500.00',
            resultingBalance: '11,030.90',
          },
          {
            id: 'tx3',
            date: '2025-12-17 09:15',
            description: 'Payment received from merchant #2891',
            credit: '890.00',
            resultingBalance: '13,530.90',
          },
        ],
      },
      {
        id: 'usdt-sol',
        network: 'SOL',
        internalCode: 'ACC-USDT-SOL-002',
        balances: {
          available: '8,320.45',
          locked: '0.00',
          toReceive: '120.00',
          blocked: '0.00',
        },
        transactions: [
          {
            id: 'tx4',
            date: '2025-12-17 13:45',
            description: 'Payment received from merchant #4521',
            credit: '320.45',
            resultingBalance: '8,320.45',
          },
        ],
      },
      {
        id: 'usdt-erc20',
        network: 'ERC-20',
        internalCode: 'ACC-USDT-ERC-003',
        balances: {
          available: '5,670.20',
          locked: '890.00',
          toReceive: '0.00',
          blocked: '0.00',
        },
        transactions: [],
      },
    ],
  },
  {
    currency: 'BTC',
    accounts: [
      {
        id: 'btc-main',
        network: 'Mainnet',
        internalCode: 'ACC-BTC-MAIN-004',
        balances: {
          available: '0.45892100',
          locked: '0.00000000',
          toReceive: '0.02340000',
          blocked: '0.00000000',
        },
        transactions: [
          {
            id: 'tx5',
            date: '2025-12-17 10:30',
            description: 'Payment received from merchant #1234',
            credit: '0.02300000',
            resultingBalance: '0.45892100',
          },
        ],
      },
    ],
  },
  {
    currency: 'USDC',
    accounts: [
      {
        id: 'usdc-erc20',
        network: 'ERC-20',
        internalCode: 'ACC-USDC-ERC-005',
        balances: {
          available: '3,240.00',
          locked: '0.00',
          toReceive: '0.00',
          blocked: '0.00',
        },
        transactions: [],
      },
      {
        id: 'usdc-sol',
        network: 'SOL',
        internalCode: 'ACC-USDC-SOL-006',
        balances: {
          available: '1,890.50',
          locked: '0.00',
          toReceive: '0.00',
          blocked: '0.00',
        },
        transactions: [
          {
            id: 'tx6',
            date: '2025-12-17 08:15',
            description: 'Payment received from merchant #9871',
            credit: '450.50',
            resultingBalance: '1,890.50',
          },
        ],
      },
    ],
  },
];

export function AccountsView() {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('usdt-trx');

  // Find selected account
  const selectedAccount = accountsData
    .flatMap((group) => group.accounts)
    .find((acc) => acc.id === selectedAccountId);

  const selectedCurrency = accountsData.find((group) =>
    group.accounts.some((acc) => acc.id === selectedAccountId)
  )?.currency;

  // Helper function to calculate total balance
  const calculateTotal = (balances: BalanceState): number => {
    const parseBalance = (str: string) => parseFloat(str.replace(/,/g, '')) || 0;
    return (
      parseBalance(balances.available) +
      parseBalance(balances.locked) +
      parseBalance(balances.toReceive) +
      parseBalance(balances.blocked)
    );
  };

  // Helper function to format balance
  const formatBalance = (value: number, currency: string): string => {
    if (currency === 'BTC') {
      return value.toFixed(8);
    }
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const strings = useStrings();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div>
        <h1 style={{ fontFamily: 'Manrope' }}>{strings.t('accounts.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {strings.t('accounts.subtitle')}
        </p>
      </div>

      {/* Mobile Account Selector Dropdown */}
      <div className="lg:hidden">
        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {accountsData.map((currencyGroup) => (
              <SelectGroup key={currencyGroup.currency}>
                {currencyGroup.accounts.map((account) => {
                  const totalBalance = calculateTotal(account.balances);
                  return (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center justify-between gap-4 w-full">
                        <span className="text-sm">
                          {currencyGroup.currency} · {account.network}
                        </span>
                        <span
                          className="text-xs text-muted-foreground font-mono"
                          style={{ fontFamily: 'Manrope' }}
                        >
                          {formatBalance(totalBalance, currencyGroup.currency)}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Accounts List (Desktop Only) */}
        <div className="hidden lg:block lg:col-span-4 space-y-6">
          {accountsData.map((currencyGroup) => (
            <div key={currencyGroup.currency} className="space-y-2">
              {/* Currency Header */}
              <h3
                style={{ fontFamily: 'Manrope', fontSize: '13px' }}
                className="text-muted-foreground px-2 uppercase tracking-wide"
              >
                {currencyGroup.currency}
              </h3>

              {/* Network Accounts */}
              <div className="space-y-1">
                {currencyGroup.accounts.map((account) => {
                  const isSelected = selectedAccountId === account.id;
                  const totalBalance = calculateTotal(account.balances);
                  return (
                    <button
                      key={account.id}
                      onClick={() => setSelectedAccountId(account.id)}
                      className={`
                        w-full text-left px-4 py-3 rounded-xl transition-all
                        ${
                          isSelected
                            ? 'bg-accent border-l-2 border-primary'
                            : 'hover:bg-muted/40 border-l-2 border-transparent'
                        }
                      `}
                    >
                      <div className="space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p
                            className={`text-sm ${
                              isSelected ? 'text-foreground font-medium' : 'text-foreground'
                            }`}
                          >
                            {currencyGroup.currency} · {account.network}
                          </p>
                          <p
                            className="text-xs text-muted-foreground font-mono"
                            style={{ fontFamily: 'Manrope' }}
                          >
                            {formatBalance(totalBalance, currencyGroup.currency)}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          {account.internalCode}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Right Column - Account Details */}
        {selectedAccount && (
          <div className="lg:col-span-8 space-y-6">
            {/* Account Details Panel */}
            <Card className="p-6">
              {/* Panel Title */}
              <div className="mb-6 px-2">
                <h2 style={{ fontFamily: 'Manrope' }} className="text-foreground mb-1">
                  {selectedCurrency} · {selectedAccount.network}
                </h2>
                <p className="text-xs text-muted-foreground font-mono">
                  {selectedAccount.internalCode}
                </p>
              </div>

              {/* Balance Breakdown */}
              <div className="space-y-4 px-2">
                <h3
                  style={{ fontFamily: 'Manrope', fontSize: '14px' }}
                  className="text-foreground"
                >
                  {strings.t('accounts.balanceBreakdown')}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Available Balance */}
                  <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                    <p className="text-xs text-muted-foreground">{strings.t('accounts.balance.available')}</p>
                    <p
                      style={{ fontFamily: 'Manrope', fontSize: '20px', fontWeight: 500 }}
                      className="text-foreground"
                    >
                      {selectedAccount.balances.available}
                    </p>
                    <p className="text-xs text-muted-foreground">{selectedCurrency}</p>
                  </div>

                  {/* Locked Balance */}
                  <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                    <p className="text-xs text-muted-foreground">{strings.t('accounts.balance.locked')}</p>
                    <p
                      style={{ fontFamily: 'Manrope', fontSize: '20px', fontWeight: 500 }}
                      className="text-foreground"
                    >
                      {selectedAccount.balances.locked}
                    </p>
                    <p className="text-xs text-muted-foreground">{selectedCurrency}</p>
                  </div>

                  {/* To Receive Balance */}
                  <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                    <p className="text-xs text-muted-foreground">{strings.t('accounts.balance.toReceive')}</p>
                    <p
                      style={{ fontFamily: 'Manrope', fontSize: '20px', fontWeight: 500 }}
                      className="text-foreground"
                    >
                      {selectedAccount.balances.toReceive}
                    </p>
                    <p className="text-xs text-muted-foreground">{selectedCurrency}</p>
                  </div>

                  {/* Blocked Balance */}
                  <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                    <p className="text-xs text-muted-foreground">{strings.t('accounts.balance.blocked')}</p>
                    <p
                      style={{ fontFamily: 'Manrope', fontSize: '20px', fontWeight: 500 }}
                      className="text-foreground"
                    >
                      {selectedAccount.balances.blocked}
                    </p>
                    <p className="text-xs text-muted-foreground">{selectedCurrency}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Recent Transactions Section */}
            <Card className="p-6">
              <h3
                style={{ fontFamily: 'Manrope', fontSize: '14px' }}
                className="text-foreground mb-4 px-2"
              >
                {strings.t('accounts.transactions.title')}
              </h3>

              {selectedAccount.transactions.length > 0 ? (
                <div className="overflow-x-auto px-2">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 text-xs text-muted-foreground font-normal">
                          {strings.t('accounts.transactions.table.date')}
                        </th>
                        <th className="text-left py-3 px-2 text-xs text-muted-foreground font-normal">
                          {strings.t('accounts.transactions.table.description')}
                        </th>
                        <th className="text-right py-3 px-2 text-xs text-muted-foreground font-normal">
                          {strings.t('accounts.transactions.table.debit')}
                        </th>
                        <th className="text-right py-3 px-2 text-xs text-muted-foreground font-normal">
                          {strings.t('accounts.transactions.table.credit')}
                        </th>
                        <th className="text-right py-3 px-2 text-xs text-muted-foreground font-normal">
                          {strings.t('accounts.transactions.table.resultingBalance')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAccount.transactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-border/50 last:border-0">
                          <td className="py-3 px-2 text-xs text-muted-foreground">
                            {tx.date}
                          </td>
                          <td className="py-3 px-2 text-sm text-foreground">{tx.description}</td>
                          <td className="py-3 px-2 text-sm text-foreground text-right font-mono">
                            {tx.debit || '—'}
                          </td>
                          <td className="py-3 px-2 text-sm text-foreground text-right font-mono">
                            {tx.credit || '—'}
                          </td>
                          <td
                            className="py-3 px-2 text-sm text-foreground text-right font-mono"
                            style={{ fontFamily: 'Manrope', fontWeight: 500 }}
                          >
                            {tx.resultingBalance}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-foreground mb-1">
                    {strings.t('accounts.transactions.empty.title')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {strings.t('accounts.transactions.empty.subtitle')}
                  </p>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}