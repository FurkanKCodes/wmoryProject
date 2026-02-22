// plugins/withRNFBNonModularHeadersFix.js
const { withPodfile } = require("@expo/config-plugins");

function addOrMergePostInstall(podfile, block) {
  // Podfile'da post_install yoksa ekle, varsa içine merge etmeye çalış.
  if (!podfile.includes("post_install do |installer|")) {
    return podfile + `\n\npost_install do |installer|\n${block}\nend\n`;
  }

  // Basit/sağlam yaklaşım: post_install'in SONUNA block ekle (end'den hemen önce).
  return podfile.replace(/\nend\s*$/m, `\n${block}\nend`);
}

module.exports = function withRNFBNonModularHeadersFix(config) {
  return withPodfile(config, (config) => {
    const block = `
  # --- RNFirebase non-modular header fix (Expo managed) ---
  installer.pods_project.targets.each do |t|
    # RNFirebase target'ları genelde RNFB... diye başlar
    if t.name.start_with?('RNFB')
      t.build_configurations.each do |c|
        # Non-modular header include'larını allow et (framework içinde React header'ları yüzünden patlıyor)
        c.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'

        # -Werror yüzünden build fail oluyor, RNFB target'larında warnings-as-errors kapat
        c.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
      end
    end
  end
  # --- end fix ---
`;
    config.modResults.contents = addOrMergePostInstall(
      config.modResults.contents,
      block
    );
    return config;
  });
};
