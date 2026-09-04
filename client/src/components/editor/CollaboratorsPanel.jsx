import { useState } from 'react';
import {
  Users,
  Wifi,
  WifiOff,
  UserPlus,
  X,
} from 'lucide-react';

import { Avatar } from '../common/Avatar.jsx';
import { ROLE_LABELS, ROLES } from '../../constants/roles.js';
import { useSocket } from '../../hooks/useSocket.js';
import { documentApi } from '../../services/api/documentApi.js';

export function CollaboratorsPanel({
  documentId,
  documentRole,
  collaborators,
  typingUsers,
}) {
  const { connected } = useSocket();

  const [showAddForm, setShowAddForm] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(ROLES.EDITOR);

  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isOwner = documentRole === ROLES.OWNER;

  const handleAddCollaborator = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError('Please enter an email address.');
      return;
    }

    if (!documentId) {
      setError('Document ID is missing.');
      return;
    }

    try {
      setAdding(true);

      await documentApi.addCollaborator(documentId, {
        email: trimmedEmail,
        role,
      });

      setSuccess(`${trimmedEmail} was added as ${role}.`);
      setEmail('');
    } catch (err) {
      console.error('[Collaborators] Failed to add:', err);

      setError(
        err?.message || 'Failed to add collaborator.'
      );
    } finally {
      setAdding(false);
    }
  };

  const closeForm = () => {
    if (adding) return;

    setShowAddForm(false);
    setEmail('');
    setError('');
    setSuccess('');
  };

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-l border-[var(--border)] bg-surface-elevated">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-brand-600" />

          <span className="text-sm font-semibold text-[var(--text-primary)]">
            Active
          </span>
        </div>

        <span
          className={`flex items-center gap-1 text-xs ${
            connected
              ? 'text-emerald-600'
              : 'text-amber-600'
          }`}
          title={connected ? 'Connected' : 'Reconnecting...'}
        >
          {connected ? (
            <Wifi className="h-3.5 w-3.5" />
          ) : (
            <WifiOff className="h-3.5 w-3.5" />
          )}

          {connected ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Add collaborator */}
      {isOwner && (
        <div className="border-b border-[var(--border)] p-3">
          {!showAddForm ? (
            <button
              type="button"
              onClick={() => {
                setShowAddForm(true);
                setError('');
                setSuccess('');
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              <UserPlus className="h-4 w-4" />
              Add Collaborator
            </button>
          ) : (
            <form
              onSubmit={handleAddCollaborator}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  Add Collaborator
                </span>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={adding}
                  className="rounded p-1 text-[var(--text-muted)] hover:bg-surface-muted disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                disabled={adding}
                className="w-full rounded-lg border border-[var(--border)] bg-surface px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-brand-500"
              />

              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                disabled={adding}
                className="w-full rounded-lg border border-[var(--border)] bg-surface px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-brand-500"
              >
                <option value={ROLES.EDITOR}>
                  Editor
                </option>

                <option value={ROLES.VIEWER}>
                  Viewer
                </option>
              </select>

              {error && (
                <p className="text-xs text-red-600">
                  {error}
                </p>
              )}

              {success && (
                <p className="text-xs text-emerald-600">
                  {success}
                </p>
              )}

              <button
                type="submit"
                disabled={adding}
                className="w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {adding ? 'Adding...' : 'Add Collaborator'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Active collaborators */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {collaborators.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--text-muted)]">
            No collaborators online
          </p>
        ) : (
          collaborators.map((c) => (
            <div
              key={c.socketId || c.userId}
              className="flex items-center gap-3 rounded-lg p-2 hover:bg-surface-muted"
            >
              <Avatar
                name={c.displayName}
                src={c.photoURL}
                online={c.status === 'online'}
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {c.displayName}

                  {typingUsers?.includes(c.userId) && (
                    <span className="ml-1 text-xs text-brand-600 animate-pulse-soft">
                      typing...
                    </span>
                  )}
                </p>

                <p className="text-xs text-[var(--text-muted)]">
                  {ROLE_LABELS[c.role] || 'Collaborator'}
                </p>
              </div>

              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: c.color || '#33a6ff',
                }}
                title="Cursor color"
              />
            </div>
          ))
        )}
      </div>

      {/* Cursor tracking */}
      <div className="border-t border-[var(--border)] p-3">
        <p className="mb-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          Cursor tracking
        </p>

        <div className="rounded-lg border border-dashed border-[var(--border)] p-3 text-center text-xs text-[var(--text-muted)]">
          Live cursor positions will appear here when Firestore sync is enabled
        </div>
      </div>
    </div>
  );
}

export default CollaboratorsPanel;