import React, { useEffect, useState } from 'react';
import { AddUserForm } from '../components/admin/AddUserForm';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { useStrings } from '../hooks/useStrings';
import { queryTeamUsers, TeamUser } from '../lib/queries';

export function AddUserView() {
  const strings = useStrings();
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await queryTeamUsers();
        setUsers(data);
      } catch (error) {
        console.error('Failed to load team users:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadUsers();
  }, []);

  const getRoleLabel = (role: string): string => {
    const roleKey = `userManagement.role.${role}`;
    return strings.t(roleKey);
  };

  const getStatusLabel = (status: string): string => {
    const statusKey = `userManagement.status.${status}`;
    return strings.t(statusKey);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div>
        <h1 style={{ fontFamily: 'Manrope' }}>{strings.t('userManagement.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {strings.t('userManagement.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AddUserForm />

        <div className="bg-card rounded-md border border-border p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontFamily: 'Manrope', fontSize: '18px', fontWeight: 500 }} className="mb-4">
            {strings.t('userManagement.currentUsers.title')}
          </h2>
          <div className="overflow-auto">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{strings.t('userManagement.table.user')}</TableHead>
                    <TableHead>{strings.t('userManagement.table.role')}</TableHead>
                    <TableHead>{strings.t('userManagement.table.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-8">
                            <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getRoleLabel(user.role)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                          {getStatusLabel(user.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}