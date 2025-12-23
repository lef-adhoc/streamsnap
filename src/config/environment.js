const path = require('path')
const fs = require('fs')
const { GOOGLE_SCOPES, OAUTH_CONFIG, GOOGLE_URLS } = require('./constants')

try {
  let dotenvPath = path.resolve(process.cwd(), '.env')
  let loaded = false

  if (fs.existsSync(dotenvPath)) {
    require('dotenv').config({ path: dotenvPath })
    loaded = true
  }

  if (!loaded) {
    try {
      const electron = require('electron')
      const appPath = electron.app ? electron.app.getAppPath() : electron.remote && electron.remote.app.getAppPath()
      if (appPath) {
        dotenvPath = path.join(appPath, '.env')
        if (fs.existsSync(dotenvPath)) {
          require('dotenv').config({ path: dotenvPath })
        }
      }
    } catch (e) {}
  }
} catch (e) {}

class Environment {
  constructor() {
    this.loadConfig()
  }

  loadConfig() {
    this.google = {
      clientId:
        process.env.GOOGLE_CLIENT_ID || '498128796531-2ji3a3uojcj39q7bohao555gin28nb1p.apps.googleusercontent.com',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || this.getDefaultClientSecret(),
      scopes: GOOGLE_SCOPES
    }

    this.app = {
      name: 'StreamSnap',
      version: this.getPackageVersion(),
      userDataPath: this.getUserDataPath()
    }

    this.oauth = OAUTH_CONFIG
  }

  getDefaultClientSecret() {
    return process.env.GOOGLE_CLIENT_SECRET || ''
  }

  getPackageVersion() {
    try {
      const packagePath = path.join(__dirname, '../../package.json')
      const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
      return packageData.version
    } catch (error) {
      return '1.0.0'
    }
  }

  getUserDataPath() {
    try {
      const { app } = require('electron')
      if (app && app.getPath) {
        return app.getPath('userData')
      }
    } catch (e) {}
    return path.join(require('os').homedir(), '.streamsnap')
  }

  validateConfig() {
    const errors = []

    if (!this.google.clientId) {
      errors.push('Google Client ID is required')
    }

    if (!this.google.clientSecret) {
      errors.push('Google Client Secret is required')
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`)
    }

    return true
  }

  getGoogleAuthUrl(params) {
    const urlParams = new URLSearchParams({
      client_id: this.google.clientId,
      response_type: 'code',
      scope: this.google.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      ...params
    })
    return `${GOOGLE_URLS.auth}?${urlParams.toString()}`
  }

  getGoogleTokenUrl() {
    return GOOGLE_URLS.token
  }

  getDriveApiBase() {
    return GOOGLE_URLS.driveApi
  }
}

const environment = new Environment()

try {
  environment.validateConfig()
} catch (error) {
  if (environment.isProduction) {
    process.exit(1)
  }
}

module.exports = environment
