# Football Database - Build Instructions

## 🚀 Quick Start

### For Windows Users:

1. **Double-click `build-windows.bat`** - This will automatically:
   - Clean previous builds
   - Install dependencies
   - Build the React app
   - Build the Electron app

2. **Or use the installer builder:**
   - Double-click `build-installer.bat` to create installer files

### Manual Build Steps:

```bash
# 1. Install dependencies
npm install

# 2. Build React application
npm run build

# 3. Build Electron application
npm run build-win

# 4. Run the application
npm run electron
```

## 🔧 Troubleshooting

### If you see a white screen:

1. **Check if build directory exists:**
   ```bash
   dir build
   ```
   You should see `index.html` and `static` folder.

2. **Rebuild the application:**
   ```bash
   npm run build
   ```

3. **Check for errors in console:**
   - Press `F12` in the app to open DevTools
   - Look for any red error messages

### If build fails:

1. **Clear everything and start fresh:**
   ```bash
   rmdir /s /q build
   rmdir /s /q dist
   rmdir /s /q node_modules
   npm install
   npm run build
   ```

2. **Check Node.js version:**
   ```bash
   node --version
   ```
   Should be 16.x or higher.

3. **Check if all files are present:**
   - `package.json`
   - `src/` folder
   - `electron/` folder
   - `public/` folder

## 📁 Generated Files

After successful build, you'll find:

- `dist/Football Database Setup.exe` - NSIS installer
- `dist/Football Database 1.0.0.exe` - Portable version
- `build/` - React build files
- `build/index.html` - Main HTML file
- `build/static/` - CSS and JS files

## 🐛 Debug Mode

The app includes debug mode for troubleshooting:

1. **Enable debug mode:**
   - The app automatically enables debug mode in production
   - Check console for detailed error messages

2. **Debug information includes:**
   - App version and system info
   - Build directory status
   - File existence checks
   - React app loading status

## 📞 Support

If you continue to have issues:

1. Check the console output for error messages
2. Ensure all required files are present
3. Try running in development mode: `npm run electron-dev`
4. Check Windows Defender isn't blocking files

## 🔄 Development Mode

For development and testing:

```bash
# Start React development server
npm start

# In another terminal, start Electron
npm run electron-dev
```

This runs the app in development mode with hot reloading.
