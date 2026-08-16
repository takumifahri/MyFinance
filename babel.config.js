module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    // Agar file migrasi .sql bisa di-import oleh drizzle/migrations.js
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
