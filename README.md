# PWIN Tracker

Electron desktop app for tracking proposal PWIN assessments.

## Run in development

```bash
npm install
npm start
```

## Build a Windows installer

Run these commands on a Windows machine:

```bash
npm install
npm run dist
```

That creates a Windows NSIS installer in the `release` folder. Electron recommends packaging apps for distribution, and Electron Forge is the official recommended packaging tool, but Electron Builder is also a widely used packaging tool for Windows installers. The default Windows installer target in electron-builder is NSIS.

## Optional unpacked folder only

```bash
npm install
npm run pack
```

That creates an unpacked app folder in `release` without an installer.

## Notes

The Windows app icon is `assets/tek-annoa-logo.ico`.
The top right header logo is `assets/tek-annoa-logo.jpg`.
User data is stored in Electron's `userData` folder as `pwin-opportunities.json`.
