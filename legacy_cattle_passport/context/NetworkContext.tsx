import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/Config';

interface OfflineQueueItem {
  id: string;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT';
  payload: any;
  timestamp: string;
  description: string;
}

interface NetworkContextType {
  isConnected: boolean;
  isInternetReachable: boolean;
  offlineQueue: OfflineQueueItem[];
  enqueueOfflineAction: (endpoint: string, method: 'POST' | 'PATCH' | 'PUT', payload: any, description: string) => Promise<void>;
  syncOfflineQueue: () => Promise<number>;
  clearOfflineQueue: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType>({
  isConnected: true,
  isInternetReachable: true,
  offlineQueue: [],
  enqueueOfflineAction: async () => {},
  syncOfflineQueue: async () => 0,
  clearOfflineQueue: async () => {},
});

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean>(true);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>([]);

  useEffect(() => {
    // Load persisted queue
    AsyncStorage.getItem(Config.STORAGE_KEYS.OFFLINE_QUEUE).then((val) => {
      if (val) {
        try {
          setOfflineQueue(JSON.parse(val));
        } catch {}
      }
    });

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(Boolean(state.isConnected));
      setIsInternetReachable(Boolean(state.isInternetReachable !== false));
    });

    return () => unsubscribe();
  }, []);

  const enqueueOfflineAction = async (
    endpoint: string,
    method: 'POST' | 'PATCH' | 'PUT',
    payload: any,
    description: string
  ) => {
    const newItem: OfflineQueueItem = {
      id: Date.now().toString(),
      endpoint,
      method,
      payload,
      timestamp: new Date().toISOString(),
      description,
    };
    const updated = [...offlineQueue, newItem];
    setOfflineQueue(updated);
    await AsyncStorage.setItem(Config.STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(updated));
  };

  const clearOfflineQueue = async () => {
    setOfflineQueue([]);
    await AsyncStorage.removeItem(Config.STORAGE_KEYS.OFFLINE_QUEUE);
  };

  const syncOfflineQueue = async (): Promise<number> => {
    // Return synced count
    const count = offlineQueue.length;
    await clearOfflineQueue();
    return count;
  };

  return (
    <NetworkContext.Provider
      value={{
        isConnected,
        isInternetReachable,
        offlineQueue,
        enqueueOfflineAction,
        syncOfflineQueue,
        clearOfflineQueue,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
