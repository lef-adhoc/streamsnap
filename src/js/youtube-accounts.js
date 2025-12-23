class YouTubeAccountsManager {
  constructor() {
    this.manageBtn = null
  }

  init() {
    this.manageBtn = document.getElementById('manageYouTubeAccountsBtn')

    if (this.manageBtn) {
      this.manageBtn.addEventListener('click', () => this.handleManageClick())
    }
  }

  async handleManageClick() {
    try {
      if (window.electronAPI && window.electronAPI.youtubeAccountsOpen) {
        await window.electronAPI.youtubeAccountsOpen()
      }
    } catch (error) {}
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const manager = new YouTubeAccountsManager()
  manager.init()
})
