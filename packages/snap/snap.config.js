// eslint-disable-next-line node/global-require
const through = require('through2');
const envify = require('envify/custom');
require('dotenv').config();

module.exports = {
  cliOptions: {
    port: 8080,
    src: './src/index.ts',
    transpilationMode: 'localOnly',
  },
  bundlerCustomizer: (bundler) => {
    bundler.transform('brfs');
    bundler.transform(function () {
      let data = '';
      return through(
        function (buffer, _encoding, callback) {
          data += buffer;
          callback();
        },
        function (callback) {
          this.push("globalThis.Buffer = require('buffer/').Buffer;");
          this.push(data);
          callback();
        },
      );
    });
    bundler.transform(
      envify({
        DEFAULT_TARI_INDEXER_URL: process.env.DEFAULT_TARI_INDEXER_URL,
      }),
    );
  },
};