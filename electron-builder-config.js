const path = require('path');

module.exports = {
  appId: 'com.football.database',
  productName: 'Football Database',
  directories: {
    output: 'dist'
  },
  files: [
    'build/**/*',
    'electron/**/*',
    'node_modules/**/*',
    'src/credentials/**/*',
    'package.json'
  ],
  extraFiles: [
    {
      from: 'electron/debug.js',
      to: 'debug.js'
    }
  ],
  extraResources: [
    {
      from: 'src/credentials/',
      to: 'credentials/',
      filter: ['**/*']
    }
  ],
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      },
      {
        target: 'portable',
        arch: ['x64']
      }
    ],
    icon: 'assets/icon.ico',
    publisherName: 'Football Database Team'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Football Database',
    installerIcon: 'assets/icon.ico',
    uninstallerIcon: 'assets/icon.ico',
    installerHeaderIcon: 'assets/icon.ico',
    deleteAppDataOnUninstall: false,
    displayLanguageSelector: false,
    language: '1033',
    artifactName: 'Football Database Setup.${ext}',
    installerLanguages: ['en']
  }
};
