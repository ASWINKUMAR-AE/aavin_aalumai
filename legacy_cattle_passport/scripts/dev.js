/**
 * Aavin Smart Cattle Passport - Unified Dev Runner
 * Auto-detects LAN IP, displays Expo Go QR Code in Terminal, and runs Backend + Expo concurrently.
 */
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const qrcode = require('qrcode-terminal');

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254')) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const localIp = getLocalIp();
const expoUrl = `exp://${localIp}:8081`;
const metroWebUrl = `http://localhost:8081`;
const portalWebUrl = `http://localhost:4000/qr-portal`;
const portalLanUrl = `http://${localIp}:4000/qr-portal`;
const backendApiUrl = `http://${localIp}:4000/api/v1`;

function openBrowser(url) {
  const startCmd = process.platform === 'win32' ? 'start ""' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  try {
    require('child_process').exec(`${startCmd} "${url}"`);
  } catch (_) {}
}

console.clear();
console.log('\x1b[36m%s\x1b[0m', '========================================================================');
console.log('\x1b[1m\x1b[32m%s\x1b[0m', '  🐄 AAVIN SMART CATTLE PASSPORT — UNIFIED SYSTEM RUNNER');
console.log('\x1b[36m%s\x1b[0m', '========================================================================');
console.log(`  📱 Scan this QR Code with the \x1b[1mExpo Go\x1b[0m app (Android) or Camera (iOS):\n`);

qrcode.generate(expoUrl, { small: true }, (qr) => {
  console.log(qr);
});

console.log('\x1b[32m%s\x1b[0m', `  🌐 Web QR Portal (Local):    ${portalWebUrl}`);
console.log('\x1b[32m%s\x1b[0m', `  🌐 Web QR Portal (LAN):      ${portalLanUrl}`);
console.log('\x1b[33m%s\x1b[0m', `  📱 Expo Go Mobile App:       ${expoUrl}`);
console.log(`  💻 Metro Dev Tools:          ${metroWebUrl}`);
console.log(`  🚀 Backend API & WebSocket:  ${backendApiUrl}`);
console.log('\x1b[36m%s\x1b[0m', '------------------------------------------------------------------------');
console.log(`  ✨ Automatically opening Web QR Portal in browser in 2 seconds...`);
console.log('\x1b[36m%s\x1b[0m', '========================================================================\n');

// Auto open Web QR Portal in browser
setTimeout(() => {
  openBrowser(portalWebUrl);
}, 2000);

// Run Concurrently
const concurrently = require('concurrently');

concurrently(
  [
    {
      command: 'npm --prefix backend run dev',
      name: 'BACKEND_WEB',
      prefixColor: 'blue',
    },
    {
      command: 'npx expo start -g --host lan',
      name: 'EXPO_MOBILE',
      prefixColor: 'green',
    },
  ],
  {
    prefix: 'name',
    killOthers: ['failure', 'success'],
    restartTries: 0,
  }
).result.then(
  () => process.exit(0),
  (err) => {
    console.error('Process error:', err);
    process.exit(1);
  }
);
