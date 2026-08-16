const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Metro perlu memperlakukan .sql sebagai source agar migrasi Drizzle ikut ter-bundle.
config.resolver.sourceExts.push('sql');

// --- Dukungan web untuk expo-sqlite (alpha) ---------------------------------
// SQLite di web berjalan sebagai WebAssembly dan memerlukan SharedArrayBuffer,
// yang hanya aktif kalau halaman di-serve cross-origin isolated.
// Target utama app ini tetap Android/iOS; web sekadar untuk cek cepat di browser.
config.resolver.assetExts.push('wasm');

config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    return middleware(req, res, next);
  };
};

module.exports = config;
