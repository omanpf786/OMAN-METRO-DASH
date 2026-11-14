import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.oman.metrodash',
  appName: 'MetroDash',
  webDir: 'dist',
  backgroundColor: '#082f49',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#082f49',
  },
};

export default config;
