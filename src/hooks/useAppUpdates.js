//useAppUpdates:
import * as Updates from 'expo-updates';
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

function useUpdatesState() {
  const [status, setStatus] = useState('idle');

  const check = useCallback(async (manual = false) => {
    if (__DEV__ || !Updates.isEnabled) {
      if (manual) setStatus('up-to-date');
      return;
    }
    try {
      setStatus('checking');
      const res = await Updates.checkForUpdateAsync();
      if (!res.isAvailable) {
        setStatus('up-to-date');
        return;
      }
      setStatus('downloading');
      const fetched = await Updates.fetchUpdateAsync();
      setStatus(fetched.isNew ? 'ready' : 'up-to-date');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => sub.remove();
  }, [check]);

  return useMemo(
    () => ({
      status,
      check: () => check(true),
      apply: () => Updates.reloadAsync(),
      channel: Updates.channel,
      updateId: Updates.updateId,
      createdAt: Updates.createdAt,
    }),
    [status, check],
  );
}

const Ctx = createContext(null);

export function UpdatesProvider({ children }) {
  const value = useUpdatesState();
  return createElement(Ctx.Provider, { value }, children);
}

export function useAppUpdates() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppUpdates fuera de UpdatesProvider');
  return v;
}
