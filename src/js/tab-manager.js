window.TabManager = class TabManager {
  constructor() {
    this.recordTab = null
    this.settingsTab = null
    this.recordContent = null
    this.settingsContent = null
  }

  init() {
    this.recordTab = document.getElementById('recordTab')
    this.settingsTab = document.getElementById('settingsTab')
    this.recordContent = document.getElementById('recordPanel')
    this.settingsContent = document.getElementById('settingsPanel')

    if (this.recordTab && this.settingsTab && this.recordContent && this.settingsContent) {
      this.setupTabs()
    }
  }

  setupTabs() {
    this.recordTab.addEventListener('click', () => {
      this.showRecordTab()
    })

    this.settingsTab.addEventListener('click', () => {
      this.showSettingsTab()
    })

    this.showRecordTab()
  }

  showRecordTab() {
    this.recordTab.classList.add('active', 'border-blue-500', 'text-blue-600')
    this.recordTab.classList.remove('border-transparent', 'text-gray-500')
    this.settingsTab.classList.remove('active', 'border-blue-500', 'text-blue-600')
    this.settingsTab.classList.add('border-transparent', 'text-gray-500')

    this.recordContent.classList.remove('hidden')
    this.settingsContent.classList.add('hidden')
  }

  showSettingsTab() {
    this.settingsTab.classList.add('active', 'border-blue-500', 'text-blue-600')
    this.settingsTab.classList.remove('border-transparent', 'text-gray-500')
    this.recordTab.classList.remove('active', 'border-blue-500', 'text-blue-600')
    this.recordTab.classList.add('border-transparent', 'text-gray-500')

    this.settingsContent.classList.remove('hidden')
    this.recordContent.classList.add('hidden')
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const tabManager = new window.TabManager()
  tabManager.init()
})
