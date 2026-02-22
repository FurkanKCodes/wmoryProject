const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = (config) => {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfile = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');

      if (!contents.includes('$RNFirebaseAsStaticFramework = true')) {
        contents = "$RNFirebaseAsStaticFramework = true\n" + contents;
        fs.writeFileSync(podfile, contents);
      }

      return config;
    },
  ]);
};