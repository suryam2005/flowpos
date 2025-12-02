#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting FlowPOS Development Environment...\n');

// Start backend server
console.log('📡 Starting backend server...');
const backend = spawn('node', ['server-final.js'], {
  cwd: path.join(__dirname, '..', 'flowpos-backend'),
  stdio: 'inherit'
});

// Wait a bit for backend to start
setTimeout(() => {
  console.log('\n📱 Starting Expo development server...');

  // Start Expo
  const expo = spawn('npx', ['expo', 'start', '--clear'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });

  // Handle process cleanup
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down development servers...');
    backend.kill();
    expo.kill();
    process.exit();
  });

  backend.on('close', (code) => {
    console.log(`Backend server exited with code ${code}`);
    expo.kill();
    process.exit();
  });

  expo.on('close', (code) => {
    console.log(`Expo server exited with code ${code}`);
    backend.kill();
    process.exit();
  });

}, 2000);