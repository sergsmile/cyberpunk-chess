module.exports = {
    experimental: {
      optimizeCss: true,
      optimizeImages: true,
      optimizeFonts: true,
    },
    headers: async () => {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
      ];
    },
    poweredByHeader: false,
    compress: true,
    productionBrowserSourceMaps: false,
  };