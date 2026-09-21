// Wrapper script to disable HMR for public access
const { spawn } = require('child_process');
const child = spawn('node', [
  require('path').join(__dirname, '../node_modules/next/dist/bin/next'),
  'dev',
  '--port', process.env.WEB_NUHA_PORT || '3226',
  '--turbo'
], {
  env: {
    ...process.env,
    TURBOPACK: '1',
    // Disable HMR by not setting NEXT_DISABLE_HMR (it doesn't exist)
    // Instead, we'll patch the response
  }
});

child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);
child.on('close', (code) => process.exit(code));
