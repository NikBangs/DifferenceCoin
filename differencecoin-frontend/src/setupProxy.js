const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api/node1',
    createProxyMiddleware({
      target: 'http://localhost:10000',
      changeOrigin: true,
      pathRewrite: {
        '^/api/node1': '',
      },
    })
  );

  app.use(
    '/api/node2',
    createProxyMiddleware({
      target: 'http://192.168.29.193:10001',
      changeOrigin: true,
      pathRewrite: {
        '^/api/node2': '',
      },
    })
  );
}; 