class FolderPickerModal {
  constructor() {
    this.modal = null
    this.accountId = null
    this.folders = []
    this.filteredFolders = []
    this.currentPage = 0
    this.pageSize = 20
    this.searchQuery = ''
    this.resolveCallback = null
    this.isLoading = false
    this.hasMorePages = true
  }

  async show(accountId) {
    this.accountId = accountId
    this.folders = []
    this.filteredFolders = []
    this.currentPage = 0
    this.searchQuery = ''
    this.hasMorePages = true

    const modalHTML = await this.loadModalHTML()
    const modalContainer = document.createElement('div')
    modalContainer.innerHTML = modalHTML

    this.modal = modalContainer.firstElementChild
    document.body.appendChild(this.modal)

    this.setupEventListeners()
    this.modal.classList.remove('hidden')

    await this.loadInitialFolders()

    return new Promise(resolve => {
      this.resolveCallback = resolve
    })
  }

  async loadModalHTML() {
    return `
      <div class="folder-picker-modal">
        <div class="modal-container">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <h3 style="font-size: 20px; font-weight: 600; color: #1f2937; margin: 0;">Select Drive Folder</h3>
            <button id="folderPickerClose" style="padding: 8px 16px; background-color: #e5e7eb; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; color: #374151; transition: background-color 0.2s;">
              ✕ Cancel
            </button>
          </div>
          
          <div style="margin-bottom: 16px;">
            <input 
              id="folderPickerSearch" 
              type="text"
              placeholder="🔍 Search folders..." 
              style="width: 100%; padding: 12px 16px; border: 2px solid #d1d5db; border-radius: 8px; outline: none; font-size: 14px; transition: border-color 0.2s;"
            />
          </div>
          
          <div id="folderPickerList" style="max-height: 400px; overflow-y: auto; border: 2px solid #e5e7eb; border-radius: 8px; background-color: #f9fafb;">
            <div style="padding: 16px; text-align: center; color: #6b7280;">
              <div class="animate-spin" style="width: 32px; height: 32px; border: 2px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; margin: 0 auto 8px;"></div>
              Loading folders...
            </div>
          </div>
        </div>
      </div>
    `
  }

  setupEventListeners() {
    const closeBtn = this.modal.querySelector('#folderPickerClose')
    const searchInput = this.modal.querySelector('#folderPickerSearch')
    const folderList = this.modal.querySelector('#folderPickerList')

    closeBtn.addEventListener('click', () => this.close(null))

    this.modal.addEventListener('click', e => {
      if (e.target === this.modal) {
        this.close(null)
      }
    })

    let searchTimeout
    searchInput.addEventListener('input', e => {
      clearTimeout(searchTimeout)
      searchTimeout = setTimeout(() => {
        this.searchQuery = e.target.value.trim().toLowerCase()
        this.filterAndRender()
      }, 300)
    })

    folderList.addEventListener('scroll', () => {
      const { scrollTop, scrollHeight, clientHeight } = folderList
      if (scrollTop + clientHeight >= scrollHeight - 50 && !this.isLoading && this.hasMorePages) {
        this.loadMoreFolders()
      }
    })
  }

  async loadInitialFolders() {
    try {
      this.isLoading = true
      const result = await window.electronAPI.getDriveFoldersForAccount(this.accountId)
      const folders = Array.isArray(result) ? result : (result && result.files) || []

      this.folders = folders
      this.filteredFolders = folders
      this.currentPage = 1
      this.hasMorePages = folders.length >= this.pageSize

      this.renderFolders()
    } catch (error) {
      this.showError('Failed to load folders')
      this.renderEmpty('Error loading folders. Please try again.')
    } finally {
      this.isLoading = false
    }
  }

  async loadMoreFolders() {
    if (this.isLoading || !this.hasMorePages) return

    try {
      this.isLoading = true
      this.showLoadingIndicator()

      const result = await window.electronAPI.getDriveFoldersPagedForAccount(this.accountId, {
        page: this.currentPage,
        pageSize: this.pageSize,
        nameQuery: this.searchQuery
      })

      const newFolders = Array.isArray(result) ? result : (result && result.files) || []

      if (newFolders.length > 0) {
        const existingIds = new Set(this.folders.map(f => f.id))
        const uniqueNewFolders = newFolders.filter(f => !existingIds.has(f.id))

        if (uniqueNewFolders.length > 0) {
          this.folders = [...this.folders, ...uniqueNewFolders]
          this.filteredFolders = [...this.filteredFolders, ...uniqueNewFolders]
          this.renderFolders(false)
        }

        this.currentPage++
        this.hasMorePages = newFolders.length >= this.pageSize
      } else {
        this.hasMorePages = false
      }
    } catch (error) {
      this.showError('Failed to load more folders')
    } finally {
      this.isLoading = false
      this.hideLoadingIndicator()
    }
  }

  filterAndRender() {
    if (this.searchQuery) {
      this.filteredFolders = this.folders.filter(folder => folder.name.toLowerCase().includes(this.searchQuery))
    } else {
      this.filteredFolders = this.folders
    }
    this.renderFolders(true)
  }

  renderFolders(clearFirst = true) {
    const folderList = this.modal.querySelector('#folderPickerList')

    if (!this.filteredFolders || this.filteredFolders.length === 0) {
      this.renderEmpty(this.searchQuery ? 'No folders match your search' : 'No folders found')
      return
    }

    if (clearFirst) {
      folderList.innerHTML = ''
    }

    const startIndex = clearFirst ? 0 : folderList.querySelectorAll('.folder-item').length
    const foldersToRender = this.filteredFolders.slice(startIndex)

    foldersToRender.forEach(folder => {
      const folderItem = document.createElement('div')
      folderItem.className = 'folder-item'
      folderItem.innerHTML = `
        <div class="folder-icon">📁</div>
        <div class="folder-name">${this.escapeHtml(folder.name)}</div>
      `

      folderItem.addEventListener('click', () => {
        this.close({ id: folder.id, name: folder.name })
      })

      folderList.appendChild(folderItem)
    })
  }

  renderEmpty(message) {
    const folderList = this.modal.querySelector('#folderPickerList')
    folderList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📂</div>
        <div>${message}</div>
      </div>
    `
  }

  showLoadingIndicator() {
    const folderList = this.modal.querySelector('#folderPickerList')
    const loadingDiv = document.createElement('div')
    loadingDiv.className = 'folder-item-loading'
    loadingDiv.id = 'folderLoadingIndicator'
    loadingDiv.innerHTML =
      '<div class="animate-spin" style="width: 24px; height: 24px; border: 2px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; margin: 0 auto;"></div>'
    folderList.appendChild(loadingDiv)
  }

  hideLoadingIndicator() {
    const indicator = document.getElementById('folderLoadingIndicator')
    if (indicator) {
      indicator.remove()
    }
  }

  showError(message) {
    const toast = document.createElement('div')
    toast.style.cssText =
      'position: fixed; top: 16px; right: 16px; background-color: #ef4444; color: white; padding: 12px 16px; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); z-index: 99999;'
    toast.textContent = message
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 4000)
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  close(result) {
    if (this.modal) {
      this.modal.remove()
      this.modal = null
    }
    if (this.resolveCallback) {
      this.resolveCallback(result)
      this.resolveCallback = null
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FolderPickerModal
}
