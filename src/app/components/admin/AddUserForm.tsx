import React from 'react';
import { ProtectedActionForm } from './ProtectedActionForm';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { postCommand, CommandContext } from '../../lib/commandClient';
import { useStrings } from '../../hooks/useStrings';

export function AddUserForm() {
  const { t } = useStrings();

  const handleAddUser = async (
    data: Record<string, FormDataEntryValue>,
    context: CommandContext
  ) => {
    const payload = {
      name: data.name,
      email: data.email,
      role: data.role,
    };

    await postCommand('users/add', payload, context);
  };

  return (
    <ProtectedActionForm
      title={t('form.addUser.title')}
      description={t('form.addUser.description')}
      onSubmit={handleAddUser}
      requiresMFA={true}
      actionDescription="Create new user account"
      successMessage={t('form.addUser.success')}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="user-name">{t('form.addUser.name')}</Label>
          <Input
            id="user-name"
            name="name"
            type="text"
            placeholder="John Doe"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-email">{t('form.addUser.email')}</Label>
          <Input
            id="user-email"
            name="email"
            type="email"
            placeholder="john@example.com"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-role">{t('form.addUser.role')}</Label>
          <select
            id="user-role"
            name="role"
            required
            className="w-full px-3 py-2 bg-white dark:bg-gray-950 border rounded-md"
          >
            <option value="">{t('form.addUser.role.placeholder')}</option>
            <option value="admin">{t('form.addUser.role.admin')}</option>
            <option value="operator">{t('form.addUser.role.operator')}</option>
            <option value="analyst">{t('form.addUser.role.analyst')}</option>
            <option value="developer">{t('form.addUser.role.developer')}</option>
          </select>
        </div>
      </div>
    </ProtectedActionForm>
  );
}