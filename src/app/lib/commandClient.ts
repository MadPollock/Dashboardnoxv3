import { User } from '../contexts/AuthContext';
import { getApiBaseUrl } from '../config/runtime';

export interface CommandContext {
  accessToken?: string;
  user: User | null;
}

/**
 * Submit a write-model command via the secured API gateway.
 * Ensures Auth0 access token, user identity, and role are forwarded
 * so the backend can validate authorization.
 * 
 * CONVENTION: All commands use the `/api/commands/` prefix.
 * 
 * MFA PATTERN: Write actions requiring MFA should trigger Auth0 step-up
 * authentication BEFORE calling postCommand. The fresh token with amr:['mfa']
 * claim will authorize the command. NO mfaCode in payload.
 * 
 * @param command - Command path WITHOUT `/api/commands/` prefix (e.g., 'users/add')
 * @param payload - Command payload data
 * @param context - Auth context with access token and user
 * 
 * @example
 * // Creates POST request to: ${apiBaseUrl}/api/commands/users/add
 * await postCommand('users/add', { email: 'user@example.com' }, context);
 * 
 * @example
 * // Creates POST request to: ${apiBaseUrl}/api/commands/whitelist/pix/add
 * await postCommand('whitelist/pix/add', { pixKey: '...' }, context);
 */
export async function postCommand<T = unknown>(
  command: string,
  payload: Record<string, unknown>,
  context: CommandContext
): Promise<T> {
  const commandApiBase = getApiBaseUrl();

  if (!commandApiBase) {
    throw new Error('API Base URL is not configured for command routing');
  }

  if (!context.accessToken) {
    throw new Error('Missing Auth0 access token for secure command submission');
  }

  // CONVENTION: All commands use /api/commands/ prefix
  const url = `${commandApiBase.replace(/\/$/, '')}/api/commands/${command}`;
  const { mfa_code: _mfaCode, ...sanitizedPayload } = payload as Record<string, unknown> & {
    mfa_code?: unknown;
  };

  if (_mfaCode !== undefined) {
    console.warn('Ignoring mfa_code in command payload; MFA is enforced via elevated JWT claims.');
  }

  const enrichedPayload = {
    ...sanitizedPayload,
    userContext: {
      id: context.user?.id,
      role: context.user?.role,
      metadata: context.user?.metadata ?? {},
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${context.accessToken}`,
      'x-user-id': context.user?.id || '',
      'x-user-role': context.user?.role || '',
      'x-user-metadata': JSON.stringify(context.user?.metadata ?? {}),
    },
    body: JSON.stringify(enrichedPayload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Command ${command} failed with status ${response.status}`);
  }

  return response.json().catch(() => undefined as T);
}