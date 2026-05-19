import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const KEY_ACCESS = 'nexus.access_token';
const KEY_REFRESH = 'nexus.refresh_token';
const KEY_USER = 'nexus.user';

const AuthContext = createContext({
  user: null,
  accessToken: null,
  refreshToken: null,
  hydrated: false,
  signIn: async () => {},
  signOut: async () => {},
  updateTokens: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [user, setUser] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [a, r, u] = await Promise.all([
          SecureStore.getItemAsync(KEY_ACCESS),
          SecureStore.getItemAsync(KEY_REFRESH),
          SecureStore.getItemAsync(KEY_USER),
        ]);
        if (a) setAccessToken(a);
        if (r) setRefreshToken(r);
        if (u) {
          try { setUser(JSON.parse(u)); } catch {}
        }
      } catch {}
      setHydrated(true);
    })();
  }, []);

  const signIn = useCallback(async ({ access_token, refresh_token, user: u }) => {
    await Promise.all([
      SecureStore.setItemAsync(KEY_ACCESS, access_token || ''),
      refresh_token ? SecureStore.setItemAsync(KEY_REFRESH, refresh_token) : Promise.resolve(),
      u ? SecureStore.setItemAsync(KEY_USER, JSON.stringify(u)) : Promise.resolve(),
    ]);
    setAccessToken(access_token || null);
    if (refresh_token) setRefreshToken(refresh_token);
    if (u) setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(KEY_ACCESS).catch(() => {}),
      SecureStore.deleteItemAsync(KEY_REFRESH).catch(() => {}),
      SecureStore.deleteItemAsync(KEY_USER).catch(() => {}),
    ]);
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  const updateTokens = useCallback(async ({ access_token, refresh_token }) => {
    if (access_token) {
      await SecureStore.setItemAsync(KEY_ACCESS, access_token);
      setAccessToken(access_token);
    }
    if (refresh_token) {
      await SecureStore.setItemAsync(KEY_REFRESH, refresh_token);
      setRefreshToken(refresh_token);
    }
  }, []);

  const value = useMemo(
    () => ({ user, accessToken, refreshToken, hydrated, signIn, signOut, updateTokens }),
    [user, accessToken, refreshToken, hydrated, signIn, signOut, updateTokens],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
