const fs = require('fs')
const path = require('path')
const { app } = require('electron')

class YouTubeAccountManager {
  static getStoragePath() {
    const userDataPath = app.getPath('userData')
    return path.join(userDataPath, 'youtube-accounts.json')
  }

  static loadAccounts() {
    try {
      const filePath = this.getStoragePath()
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8')
        return JSON.parse(data)
      }
    } catch (error) {}
    return []
  }

  static saveAccounts(accounts) {
    try {
      const filePath = this.getStoragePath()
      fs.writeFileSync(filePath, JSON.stringify(accounts, null, 2), 'utf8')
      return true
    } catch (error) {
      return false
    }
  }

  static listAccounts() {
    return this.loadAccounts()
  }

  static getActiveAccounts() {
    return this.loadAccounts().filter(acc => acc.active !== false)
  }

  static getAccountById(accountId) {
    const accounts = this.loadAccounts()
    return accounts.find(acc => acc.id === accountId)
  }

  static async createAccount(options) {
    const { accessToken, refreshToken, email, channelName, channelId, thumbnail, tokenExpiry } = options

    const accounts = this.loadAccounts()

    const existingIndex = accounts.findIndex(acc => acc.email === email || acc.channelId === channelId)

    if (existingIndex !== -1) {
      accounts[existingIndex] = {
        ...accounts[existingIndex],
        accessToken,
        refreshToken,
        channelName,
        channelId,
        thumbnail,
        tokenExpiry,
        active: true,
        updatedAt: Date.now()
      }
      this.saveAccounts(accounts)
      return accounts[existingIndex]
    }

    const newAccount = {
      id: `yt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      email,
      channelName,
      channelId,
      thumbnail,
      accessToken,
      refreshToken,
      tokenExpiry,
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    accounts.push(newAccount)
    this.saveAccounts(accounts)
    return newAccount
  }

  static async removeAccount(accountId) {
    const accounts = this.loadAccounts()
    const filtered = accounts.filter(acc => acc.id !== accountId)
    this.saveAccounts(filtered)
    return filtered.length < accounts.length
  }

  static async updateAccount(accountId, changes) {
    const accounts = this.loadAccounts()
    const index = accounts.findIndex(acc => acc.id === accountId)

    if (index !== -1) {
      accounts[index] = {
        ...accounts[index],
        ...changes,
        updatedAt: Date.now()
      }
      this.saveAccounts(accounts)
      return accounts[index]
    }

    return null
  }

  static async refreshAllTokens() {
    const YouTubeService = require('./YouTubeService')
    const service = new YouTubeService()
    const accounts = this.getActiveAccounts()
    let refreshedCount = 0

    for (const account of accounts) {
      try {
        await service.refreshAccessToken(account.id)
        refreshedCount++
      } catch (error) {}
    }

    return refreshedCount
  }
}

module.exports = YouTubeAccountManager
