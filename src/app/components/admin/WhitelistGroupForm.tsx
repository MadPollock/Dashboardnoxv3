import React from 'react';
import { ProtectedActionForm } from './ProtectedActionForm';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { postCommand, CommandContext } from '../../lib/commandClient';
import { useStrings } from '../../hooks/useStrings';

interface WhitelistGroupFormProps {
  onSuccess?: () => void;
}

export function WhitelistGroupForm({ onSuccess }: WhitelistGroupFormProps) {
  const { t } = useStrings();

  const handleCreateGroup = async (
    data: Record<string, FormDataEntryValue>,
    context: CommandContext
  ) => {
    await postCommand('whitelist/group/create', data, context);
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <ProtectedActionForm
      title={t('form.whitelistGroup.title')}
      description={t('form.whitelistGroup.description')}
      onSubmit={handleCreateGroup}
      requiresMFA={true}
      actionDescription="Create whitelisting group"
      hideCard={!!onSuccess}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="group-label">{t('form.whitelistGroup.label')}</Label>
          <Input
            id="group-label"
            name="label"
            type="text"
            placeholder="e.g., Treasury Wallets"
            required
          />
          <p className="text-xs text-muted-foreground">
            {t('form.whitelistGroup.label.helper')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="group-reason">{t('form.whitelistGroup.reason')}</Label>
          <Textarea
            id="group-reason"
            name="reason"
            placeholder="Enter reason for creating this group..."
            required
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            {t('form.whitelistGroup.reason.helper')}
          </p>
        </div>
      </div>
    </ProtectedActionForm>
  );
}
