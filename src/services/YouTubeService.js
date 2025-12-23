const { shell } = require('electron')
const { google } = require('googleapis')
const http = require('http')
const crypto = require('crypto')
const { Readable } = require('stream')
const environment = require('../config/environment')
const YouTubeAccountManager = require('./YouTubeAccountManager')

class YouTubeService {
  constructor() {
    this.oauth2Client = null
    this.youtube = null
    this.isAuthenticatedFlag = false
    this.accessToken = null
    this.refreshToken = null
    this.tokenExpiry = null
  }

  initializeOAuthClient() {
    if (!this.oauth2Client) {
      const { OAuth2 } = google.auth
      this.oauth2Client = new OAuth2(
        environment.google.clientId,
        environment.google.clientSecret,
        'http://localhost:3000/oauth2callback'
      )
    }
    return this.oauth2Client
  }

  async authenticate() {
    const port = 3000
    const redirectUri = `http://localhost:${port}/oauth2callback`

    const state = crypto.randomBytes(32).toString('hex')
    const codeVerifier = crypto.randomBytes(32).toString('base64url')
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')

    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ]

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: environment.google.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'consent'
    }).toString()}`

    const authCode = await this.startLocalServerAndGetCode(authUrl, port, state)
    const tokens = await this.exchangeCodeForTokens({
      code: authCode,
      redirectUri,
      codeVerifier
    })

    this.accessToken = tokens.access_token
    this.refreshToken = tokens.refresh_token
    this.tokenExpiry = Date.now() + tokens.expires_in * 1000
    this.isAuthenticatedFlag = true

    const authClient = this.initializeOAuthClient()
    authClient.setCredentials(tokens)
    this.oauth2Client = authClient
    this.youtube = google.youtube({ version: 'v3', auth: authClient })

    return {
      success: true,
      accessToken: this.accessToken,
      refreshToken: this.refreshToken
    }
  }

  async startLocalServerAndGetCode(authUrl, port, expectedState) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        server.close()
        reject(new Error('Authentication timeout'))
      }, 120000)

      const server = http.createServer((req, res) => {
        try {
          if (req.url.startsWith('/oauth2callback')) {
            const url = new URL(req.url, `http://127.0.0.1:${port}`)
            const error = url.searchParams.get('error')
            const code = url.searchParams.get('code')

            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>StreamSnap — Authorization Complete</title>
  <style>
    :root { --bg:#fef2f2; --card:#ffffff; --muted:#6b7280; --accent1:#ef4444; --accent2:#ec4899; --brand:#dc2626; }
    html,body { height:100%; margin:0; font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background:var(--bg); color:#0f172a; }
    .wrap { min-height:100%; display:flex; align-items:center; justify-content:center; padding:28px; box-sizing:border-box; }
    .card { background:var(--card); padding:28px; border-radius:12px; box-shadow: 0 8px 30px rgba(2,6,23,0.08); text-align:center; max-width:520px; width:100%; }
    .icon { width:72px; height:72px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 12px; background:linear-gradient(135deg,var(--accent1),var(--accent2)); color:white; font-size:36px; }
    h1 { margin:0 0 8px; font-size:20px; font-weight:600; }
    p { margin:0 0 16px; color:var(--muted); line-height:1.4; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="icon">✅</div>
      <h1>Authorization complete</h1>
      <p>StreamSnap received your authorization successfully. You can close this page and return to the app.</p>
    </div>
  </div>
</body>
</html>
            `)

            clearTimeout(timeout)
            server.close()

            if (error) {
              reject(new Error(`OAuth error: ${error}`))
            } else if (code) {
              resolve(code)
            } else {
              reject(new Error('No authorization code received'))
            }
          } else {
            res.writeHead(404)
            res.end()
          }
        } catch (err) {
          clearTimeout(timeout)
          server.close()
          reject(err)
        }
      })

      server.listen(port, () => {
        shell.openExternal(authUrl)
      })

      server.on('error', err => {
        clearTimeout(timeout)
        reject(err)
      })
    })
  }

  async exchangeCodeForTokens({ code, redirectUri, codeVerifier }) {
    const tokenUrl = 'https://oauth2.googleapis.com/token'
    const body = new URLSearchParams({
      client_id: environment.google.clientId,
      client_secret: environment.google.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier
    })

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Token exchange failed: ${response.status} - ${errorData}`)
    }

    return response.json()
  }

  setTokens(tokens) {
    this.accessToken = tokens.access_token
    this.refreshToken = tokens.refresh_token
    this.tokenExpiry = tokens.expiry_date
    this.isAuthenticatedFlag = true

    const authClient = this.initializeOAuthClient()
    authClient.setCredentials(tokens)
    this.youtube = google.youtube({ version: 'v3', auth: authClient })
  }

  async refreshAccessToken(accountId) {
    const account = YouTubeAccountManager.getAccountById(accountId)
    if (!account || !account.refreshToken) {
      throw new Error('No refresh token available')
    }

    const authClient = this.initializeOAuthClient()
    authClient.setCredentials({
      refresh_token: account.refreshToken
    })

    const { credentials } = await authClient.refreshAccessToken()

    YouTubeAccountManager.updateAccount(accountId, {
      accessToken: credentials.access_token,
      tokenExpiry: credentials.expiry_date
    })

    return credentials.access_token
  }

  async ensureValidAccessToken(accountId) {
    const account = YouTubeAccountManager.getAccountById(accountId)
    if (!account) return false

    const now = Date.now()
    if (account.tokenExpiry && now < account.tokenExpiry - 60000) {
      return true
    }

    try {
      await this.refreshAccessToken(accountId)
      return true
    } catch (error) {
      return false
    }
  }

  async uploadVideo(accountId, videoData, title, description, options = {}) {
    try {
      await this.ensureValidAccessToken(accountId)

      const account = YouTubeAccountManager.getAccountById(accountId)
      if (!account) {
        throw new Error('Account not found')
      }

      const authClient = this.initializeOAuthClient()
      authClient.setCredentials({
        access_token: account.accessToken,
        refresh_token: account.refreshToken
      })

      const youtube = google.youtube({ version: 'v3', auth: authClient })

      const privacyStatus = options.privacy || 'private'

      const videoBuffer = Buffer.from(videoData)
      const videoStream = Readable.from(videoBuffer)

      const response = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: title,
            description: description || 'Uploaded with StreamSnap',
            categoryId: '22'
          },
          status: {
            privacyStatus: privacyStatus
          }
        },
        media: {
          mimeType: 'video/webm',
          body: videoStream
        }
      })

      if (options.playlistId) {
        try {
          await youtube.playlistItems.insert({
            part: ['snippet'],
            requestBody: {
              snippet: {
                playlistId: options.playlistId,
                resourceId: {
                  kind: 'youtube#video',
                  videoId: response.data.id
                }
              }
            }
          })
        } catch (playlistError) {}
      }

      return {
        success: true,
        videoId: response.data.id,
        videoUrl: `https://www.youtube.com/watch?v=${response.data.id}`
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async getPlaylists(accountId) {
    try {
      await this.ensureValidAccessToken(accountId)

      const account = YouTubeAccountManager.getAccountById(accountId)
      if (!account) {
        throw new Error('Account not found')
      }

      const authClient = this.initializeOAuthClient()
      authClient.setCredentials({
        access_token: account.accessToken,
        refresh_token: account.refreshToken
      })

      const youtube = google.youtube({ version: 'v3', auth: authClient })

      const response = await youtube.playlists.list({
        part: ['snippet'],
        mine: true,
        maxResults: 50
      })

      if (response.data.items) {
        return {
          success: true,
          playlists: response.data.items.map(playlist => ({
            id: playlist.id,
            title: playlist.snippet.title,
            thumbnail: playlist.snippet.thumbnails?.default?.url
          }))
        }
      }

      return { success: true, playlists: [] }
    } catch (error) {
      return { success: false, error: error.message, playlists: [] }
    }
  }

  async getChannelInfo(accessTokenOrAccountId) {
    try {
      let authClient = this.initializeOAuthClient()

      if (typeof accessTokenOrAccountId === 'string' && accessTokenOrAccountId.length < 100) {
        const account = YouTubeAccountManager.getAccountById(accessTokenOrAccountId)
        if (!account) {
          throw new Error('Account not found')
        }
        await this.ensureValidAccessToken(accessTokenOrAccountId)

        authClient.setCredentials({
          access_token: account.accessToken,
          refresh_token: account.refreshToken
        })
      } else {
        authClient.setCredentials({
          access_token: accessTokenOrAccountId
        })
      }

      const youtube = google.youtube({ version: 'v3', auth: authClient })

      const response = await youtube.channels.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        mine: true
      })

      if (response.data.items && response.data.items.length > 0) {
        const channel = response.data.items[0]
        return {
          success: true,
          channelId: channel.id,
          channelName: channel.snippet.title,
          thumbnail: channel.snippet.thumbnails?.default?.url
        }
      }

      const peopleResponse = await fetch('https://people.googleapis.com/v1/people/me?personFields=emailAddresses', {
        headers: {
          Authorization: `Bearer ${authClient.credentials.access_token}`
        }
      })

      if (peopleResponse.ok) {
        const peopleData = await peopleResponse.json()
      }

      shell.openExternal('https://www.youtube.com/create_channel')

      return {
        success: false,
        error:
          'No YouTube channel found. A browser window has been opened to create one. After creating your channel, please try again.',
        needsChannel: true
      }
    } catch (error) {}
  }

  isAuthenticated() {
    return this.isAuthenticatedFlag
  }

  signOut() {
    this.oauth2Client = null
    this.youtube = null
    this.isAuthenticatedFlag = false
    this.accessToken = null
    this.refreshToken = null
    this.tokenExpiry = null
  }
}

module.exports = YouTubeService
