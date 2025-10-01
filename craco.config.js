const webpack = require('webpack');

module.exports = {
  devServer: {
    // Disable caching in development
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  },
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "buffer": require.resolve("buffer"),
        "https": require.resolve("https-browserify"),
        "http": require.resolve("stream-http"),
        "querystring": require.resolve("querystring-es3"),
        "stream": require.resolve("stream-browserify"),
        "util": require.resolve("util"),
        "crypto": require.resolve("crypto-browserify"),
        "url": require.resolve("url"),
        "os": require.resolve("os-browserify/browser"),
        "path": require.resolve("path-browserify"),
        "zlib": require.resolve("browserify-zlib"),
        "assert": require.resolve("assert"),
        "fs": false,
        "net": false,
        "tls": false,
        "child_process": false,
        // No http2 in renderer
        "http2": false
      };

      webpackConfig.plugins = [
        ...webpackConfig.plugins,
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        }),
      ];

      // Disable caching in development
      if (process.env.NODE_ENV === 'development') {
        webpackConfig.cache = false;
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          removeAvailableModules: false,
          removeEmptyChunks: false,
          splitChunks: false,
        };
      }

      return webpackConfig;
    },
  },
};
