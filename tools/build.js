/* Збирає js/cloud.bundle.js з src/cloud.js (Firebase Auth + Firestore). Запуск: npm run build */
const esbuild = require('esbuild'), path = require('path');
esbuild.build({ entryPoints: [path.join(__dirname, '../src/cloud.js')], bundle: true, minify: true, format: 'iife', target: ['es2019'], outfile: path.join(__dirname, '../js/cloud.bundle.js'), legalComments: 'none', logLevel: 'info' })
  .catch(() => process.exit(1));
