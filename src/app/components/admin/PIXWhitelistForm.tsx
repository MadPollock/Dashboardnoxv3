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

// PIX key types
const pixKeyTypes = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'random', label: 'Random Key' },
];

interface PIXWhitelistFormProps {
  onSuccess?: () => void;
}

export function PIXWhitelistForm({ onSuccess }: PIXWhitelistFormProps) {
  const [keyType, setKeyType] = React.useState('');
  const { t } = useStrings();

  const handleWhitelist = async (
    data: Record<string, FormDataEntryValue>,
    context: CommandContext
  ) => {
    const payload = {
      ...data,
      keyType,
    };

    await postCommand('whitelist/pix/add', payload, context);
    if (onSuccess) {
      onSuccess();
    }
  };

  const getPlaceholder = () => {
    switch (keyType) {
      case 'email':
        return 'email@example.com';
      case 'phone':
        return '+55 11 98765-4321';
      case 'cpf':
        return '123.456.789-00';
      case 'cnpj':
        return '12.345.678/0001-90';
      case 'random':
        return 'Random PIX key';
      default:
        return 'Select key type first';
    }
  };

  return (
    <ProtectedActionForm
      title={t('form.whitelist.title')}
      description={t('form.whitelist.description')}
      onSubmit={handleWhitelist}
      requiresMFA={true}
      actionDescription="Add PIX key to whitelist"
      hideCard={!!onSuccess}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pix-key-type">PIX Key Type</Label>
          <Select value={keyType} onValueChange={setKeyType}>
            <SelectTrigger id="pix-key-type">
              <SelectValue placeholder="Select PIX key type" />
            </SelectTrigger>
            <SelectContent>
              {pixKeyTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pix-key">PIX Key</Label>
          <Input
            id="pix-key"
            name="pixKey"
            type="text"
            placeholder={getPlaceholder()}
            required
            disabled={!keyType}
          />
          {keyType && (
            <p className="text-xs text-muted-foreground">
              {t('form.whitelist.address.pix')}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="pix-label">Label</Label>
          <Input
            id="pix-label"
            name="label"
            type="text"
            placeholder="e.g., Company Main Account"
            required
          />
          <p className="text-xs text-muted-foreground">
            {t('form.whitelist.label.helper')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pix-reason">{t('form.whitelist.reason')}</Label>
          <Textarea
            id="pix-reason"
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
