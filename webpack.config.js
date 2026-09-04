const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './src/index.js',
  target: 'web', // Compile for browser-like environments (including Google Apps Script's V8 engine)
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'qr-styled.gas.js',
    library: {
      name: 'QrStyled',
      type: 'umd', // Universal Module Definition
      export: 'generateQrPngWithLogo' // Directly export this core function globally
    },
    globalObject: 'this'
  },
  resolve: {
    fallback: {
      // Polyfill Node core modules for Google Apps Script environment
      zlib: require.resolve('pako'), // Replaces Node's native zlib with pure JS pako
      buffer: require.resolve('buffer/'),
      stream: require.resolve('stream-browserify'),
      fs: false // Deactivate fs core module (not available in GAS; use Google Drive APIs instead)
    }
  },
  plugins: [
    // Provide a global Buffer polyfill
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer']
    })
  ],
  mode: 'production',
  optimization: {
    minimize: true // Minify output to fit comfortably within Apps Script file limits
  }
};
