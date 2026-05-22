module.exports = {
  apps: [
    {
      name: 'ouvidoria-frontend',
      script: 'npx',
      args: 'vite preview',
      cwd: './',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'ouvidoria-backend',
      script: './backend/dist/index.js',
      cwd: './',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
    },
  ],
};
