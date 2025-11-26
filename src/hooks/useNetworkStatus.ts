import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);

  useEffect(() => {
    
    const unsubscribe = NetInfo.addEventListener(state => {
      console.log('[NetworkStatus] Connection type:', state.type);
      console.log('[NetworkStatus] Is connected?', state.isConnected);
      console.log('[NetworkStatus] Is internet reachable?', state.isInternetReachable);
      
      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable);
    });

    
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable);
    });

    
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    isConnected,
    isInternetReachable,
    isOnline: isConnected === true && isInternetReachable !== false,
  };
};
