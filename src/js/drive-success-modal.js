class DriveSuccessModal {
  constructor() {
    this.modal = null
  }

  show(accountName, webViewLink, fileName) {
    try {
      const modalHTML = `<div class="modal-overlay"><div class="modal-content"><div class="modal-header"><div class="success-icon">✅</div><h2 class="modal-title">Uploaded to Drive!</h2><p class="modal-subtitle">Your video has been saved to ${accountName}</p></div><div class="modal-info"><div class="info-item"><p class="info-label">File Name:</p><p class="info-value">${fileName}</p></div>${webViewLink ? `<div class="info-item"><p class="info-label">Drive Link:</p><p class="info-value link-value">${webViewLink}</p></div>` : ''}</div><div class="modal-actions">${webViewLink ? `<button id="driveModalCopyBtn" class="btn btn-secondary">📋 Copy Link</button><button id="driveModalOpenBtn" class="btn btn-primary">Open in Drive</button>` : ''}<button id="driveModalCloseBtn" class="btn btn-secondary">Close</button></div></div></div>`

      const modalContainer = document.createElement('div')
      modalContainer.innerHTML = modalHTML.trim()

      const modalElement = modalContainer.firstElementChild

      if (!modalElement) {
        throw new Error('Modal element not created')
      }

      document.body.appendChild(modalElement)
      this.modal = modalElement
      this.setupEventListeners(webViewLink)
    } catch (error) {
      throw error
    }
  }

  setupEventListeners(webViewLink) {
    const copyBtn = document.getElementById('driveModalCopyBtn')
    const openBtn = document.getElementById('driveModalOpenBtn')
    const closeBtn = document.getElementById('driveModalCloseBtn')

    if (copyBtn && webViewLink) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(webViewLink)
          copyBtn.textContent = '✅ Copied!'
          setTimeout(() => {
            copyBtn.textContent = '📋 Copy Link'
          }, 2000)
        } catch (error) {
          copyBtn.textContent = '❌ Failed'
          setTimeout(() => {
            copyBtn.textContent = '📋 Copy Link'
          }, 2000)
        }
      })
    }

    if (openBtn && webViewLink) {
      openBtn.addEventListener('click', async () => {
        await window.electronAPI.openExternal(webViewLink)
      })
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.close()
      })
    }

    if (this.modal) {
      this.modal.addEventListener('click', e => {
        if (e.target === this.modal) {
          this.close()
        }
      })
    }
  }

  close() {
    if (this.modal) {
      this.modal.remove()
      this.modal = null
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DriveSuccessModal
}
