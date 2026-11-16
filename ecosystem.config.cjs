module.exports = {
  apps: [
    {
      name: 'nova-md',
      script: 'src/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_restarts: 20,
      restart_delay: 4000,
      max_memory_restart: '500M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
