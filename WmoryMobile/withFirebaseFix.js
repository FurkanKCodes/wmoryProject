const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withFirebaseFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      let podfile = fs.readFileSync(podfilePath, "utf8");

      const flag = "CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES";

      if (!podfile.includes(flag)) {
        // Inject our fix INSIDE the existing post_install block
        podfile = podfile.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['${flag}'] = 'YES'
    end
  end`
        );
        fs.writeFileSync(podfilePath, podfile);
      }

      return config;
    },
  ]);
};