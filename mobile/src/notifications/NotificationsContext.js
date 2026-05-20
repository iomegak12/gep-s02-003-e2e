import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const NotificationsContext = createContext({
  items: [],
  unreadCount: 0,
  token: null,
  permissionGranted: false,
  pendingDeepLink: null,
  add: () => {},
  markAllRead: () => {},
  setToken: () => {},
  setPermissionGranted: () => {},
  setPendingDeepLink: () => {},
  clear: () => {},
});

export const useNotifications = () => useContext(NotificationsContext);

export function NotificationsProvider({ children }) {
  const [items, setItems] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const [token, setToken] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [pendingDeepLink, setPendingDeepLink] = useState(null);

  const add = useCallback((item) => {
    setItems((prev) => [item, ...prev].slice(0, 50));
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds(new Set(items.map((i) => i.id)));
  }, [items]);

  const clear = useCallback(() => {
    setItems([]);
    setReadIds(new Set());
  }, []);

  const unreadCount = useMemo(
    () => items.filter((i) => !readIds.has(i.id)).length,
    [items, readIds],
  );

  const value = useMemo(
    () => ({
      items,
      unreadCount,
      token,
      permissionGranted,
      pendingDeepLink,
      add,
      markAllRead,
      setToken,
      setPermissionGranted,
      setPendingDeepLink,
      clear,
    }),
    [items, unreadCount, token, permissionGranted, pendingDeepLink, add, markAllRead, clear],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
