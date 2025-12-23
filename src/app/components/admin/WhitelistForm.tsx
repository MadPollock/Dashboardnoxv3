import React from 'react';
import { ProtectedActionForm } from './ProtectedActionForm';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { postCommand, CommandContext } from '../../lib/commandClient';
import { useStrings } from '../../hooks/useStrings';
import { getCryptoCurrencies, getUniqueCurrencies, getNetworksForCurrency, getCurrencyCodeByPair } from '../../config/currencies';

interface WhitelistFormProps {
  groupId: string;
  existingAddresses?: Array<{ currency: string; network: string }>;
  onSuccess?: () => void;
}

export function WhitelistForm({ groupId, existingAddresses = [], onSuccess }: WhitelistFormProps) {
  const [selectedCurrency, setSelectedCurrency] = React.useState('');
  const [selectedNetwork, setSelectedNetwork] = React.useState('');
  const { t } = useStrings();

  const handleWhitelist = async (
    data: Record<string, FormDataEntryValue>,
    context: CommandContext
  ) => {
    // Get the actual currency_code to send to API
    const currency_code = getCurrencyCodeByPair(selectedCurrency, selectedNetwork);

    if (!currency_code) {
      throw new Error('Invalid currency and network combination');
    }

    const payload = {
      ...data,
      groupId,
      currency_code, // Send currency_code (e.g., "TRX_USDT_S2UZ")
      // Also include for backwards compatibility or logging
      currency: selectedCurrency,
      network: selectedNetwork,
    };

    await postCommand('whitelist/address/add', payload, context);
    if (onSuccess) {
      onSuccess();
    }
  };

  // Get unique base currencies (USDT, USDC, BTC) - exclude BRL
  const allCurrencies = getUniqueCurrencies().filter(c => c !== 'BRL');

  // Filter out currencies that have ALL networks already used
  const availableCurrencies = allCurrencies.filter(currency => {
    const allNetworks = getNetworksForCurrency(currency);
    const usedNetworks = existingAddresses
      .filter(addr => addr.currency === currency)
      .map(addr => addr.network);
    
    // Currency is available if at least one network is not used yet
    return usedNetworks.length < allNetworks.length;
  });

  // Get available networks for selected currency (filter out already-used ones)
  const availableNetworks = selectedCurrency
    ? getNetworksForCurrency(selectedCurrency).filter(network => {
        return !existingAddresses.some(
          addr => addr.currency === selectedCurrency && addr.network === network
        );
      })
    : [];

  // Count how many networks are available for display
  const availableNetworkCount = availableNetworks.length;

  // Reset network when currency changes
  React.useEffect(() => {
    setSelectedNetwork('');
  }, [selectedCurrency]);

  return (
    <ProtectedActionForm
      title={t('form.whitelist.title')}
      description={t('form.whitelist.description')}
      onSubmit={handleWhitelist}
      requiresMFA={true}
      actionDescription="Add address to whitelist"
      hideCard={!!onSuccess}
    >
      <div className="space-y-4">
        {/* Show info banner if some currencies are fully used */}
        {availableCurrencies.length < allCurrencies.length && (
          <div className="bg-muted/50 border border-border rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Some currencies are hidden because all networks have been used in this group.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currency">{t('form.whitelist.currency')}</Label>
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger id="currency">
                <SelectValue placeholder={t('form.whitelist.currency')} />
              </SelectTrigger>
              <SelectContent>
                {availableCurrencies.length > 0 ? (
                  availableCurrencies.map((currency) => {
                    const allNetworks = getNetworksForCurrency(currency);
                    const usedCount = existingAddresses.filter(
                      addr => addr.currency === currency
                    ).length;
                    
                    return (
                      <SelectItem key={currency} value={currency}>
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span>{currency}</span>
                          {usedCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ({usedCount}/{allNetworks.length} used)
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })
                ) : (
                  <SelectItem value="none" disabled>
                    All currencies fully used in this group
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {availableCurrencies.length === 0 && (
              <p className="text-xs text-muted-foreground">
                This group has addresses for all available currency+network combinations.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="network">{t('form.whitelist.network')}</Label>
            <Select 
              value={selectedNetwork} 
              onValueChange={setSelectedNetwork}
              disabled={!selectedCurrency || availableNetworkCount === 0}
            >
              <SelectTrigger id="network">
                <SelectValue placeholder={t('form.whitelist.network')} />
              </SelectTrigger>
              <SelectContent>
                {!selectedCurrency ? (
                  <SelectItem value="none" disabled>
                    Select currency first
                  </SelectItem>
                ) : availableNetworks.length > 0 ? (
                  availableNetworks.map((network) => (
                    <SelectItem key={network} value={network}>
                      {network}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    All {selectedCurrency} networks used
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {selectedCurrency && availableNetworkCount === 0 && (
              <p className="text-xs text-muted-foreground">
                All networks for {selectedCurrency} already have addresses in this group.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="whitelist-address">{t('form.whitelist.address')}</Label>
          <Input
            id="whitelist-address"
            name="address"
            type="text"
            placeholder={selectedNetwork ? `Enter ${selectedNetwork} address` : "Select currency and network first"}
            required
            className="font-mono text-sm"
            disabled={!selectedNetwork}
          />
          {selectedNetwork && (
            <p className="text-xs text-muted-foreground">
              {`${selectedNetwork} ${t('form.whitelist.address.helper')}`}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="whitelist-reason">{t('form.whitelist.reason')}</Label>
          <Textarea
            id="whitelist-reason"
            name="reason"
            placeholder="Enter reason for whitelisting..."
            required
            rows={3}
          />
        </div>
      </div>
    </ProtectedActionForm>
  );
}