class DriveAccountsManager {
  constructor() {
    this.browseBtn = null
    this.manageBtn = null
  }

  init() {
    this.browseBtn = document.getElementById('browseDriveBtn')
    this.manageBtn = document.getElementById('manageDriveAccountsBtn')

    if (this.browseBtn) {
      this.browseBtn.addEventListener('click', () => this.handleBrowseClick())
    }

    if (this.manageBtn) {
      this.manageBtn.addEventListener('click', () => this.handleManageClick())
    }
  }

  async handleBrowseClick() {
    try {
      if (window.electronAPI && window.electronAPI.driveAccountsOpen) {
        await window.electronAPI.driveAccountsOpen()
      } else {
      }
    } catch (error) {}
  }

  async handleManageClick() {
    try {
      if (window.electronAPI && window.electronAPI.driveAccountsOpen) {
        await window.electronAPI.driveAccountsOpen()
      }
    } catch (error) {}
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const manager = new DriveAccountsManager()
  manager.init()
})
