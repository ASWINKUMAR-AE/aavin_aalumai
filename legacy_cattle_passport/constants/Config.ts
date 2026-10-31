import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getDefaultApiUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 1. Automatically extract host LAN IP from Expo dev server
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:4000/api/v1`;
    }
  }

  // 2. Default to detected local LAN IP
  return 'http://10.110.44.105:4000/api/v1';
};

export const Config = {
  DEFAULT_API_URL: getDefaultApiUrl(),
  STORAGE_KEYS: {
    API_URL: 'aavin_api_url',
    AUTH_TOKEN: 'aavin_auth_token',
    REFRESH_TOKEN: 'aavin_refresh_token',
    USER_DATA: 'aavin_user_data',
    OFFLINE_QUEUE: 'aavin_offline_queue',
    LANGUAGE: 'aavin_language_pref',
    THEME_MODE: 'aavin_theme_mode',
  },
  APP_VERSION: '1.0.0',
  MADURAI_ECOSYSTEM_NAME: 'Aavin Madurai District Milk Union',
};
