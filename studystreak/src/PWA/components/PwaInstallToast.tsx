import { useEffect, useState } from 'react'

export default function PwaInstallToast() {
  const [installAvailable, setInstallAvailable] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    const onInstall = () => setInstallAvailable(true)
    const onUpdate = () => setUpdateAvailable(true)
    const onOffline = () => console.info('PWA offline ready')

    window.addEventListener('pwa-install-available', onInstall as EventListener)
    window.addEventListener('pwa-update-available', onUpdate as EventListener)
    window.addEventListener('pwa-offline-ready', onOffline as EventListener)

    return () => {
      window.removeEventListener('pwa-install-available', onInstall as EventListener)
      window.removeEventListener('pwa-update-available', onUpdate as EventListener)
      window.removeEventListener('pwa-offline-ready', onOffline as EventListener)
    }
  }, [])

  if (!installAvailable && !updateAvailable) return null

  return (
    <div className="fixed right-6 bottom-6 z-50">
      <div className="bg-white dark:bg-slate-900 text-foreground dark:text-slate-100 p-3 rounded-lg shadow-lg flex items-center gap-3">
        {installAvailable && (
          <button
            onClick={async () => {
              setInstalling(true)
              const res = await window.__pwa?.promptInstall()
              console.log('install result', res)
              setInstalling(false)
              setInstallAvailable(false)
            }}
            disabled={installing}
            className="px-3 py-1 bg-blue-600 text-white rounded"
          >
            {installing ? 'Installing…' : 'Install App'}
          </button>
        )}
        {updateAvailable && (
          <button
            onClick={async () => {
              try {
                // Request the service worker to update/skip waiting
                window.__pwa?.updateServiceWorker?.();

                // Wait for the new service worker to take control before reloading
                let reloaded = false
                const onControllerChange = () => {
                  if (reloaded) return
                  reloaded = true
                  // small timeout to ensure updated assets are ready
                  setTimeout(() => window.location.reload(), 50)
                }

                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
                }

                // Fallback: if controllerchange doesn't fire, reload after 2s
                setTimeout(() => {
                  if (!reloaded) {
                    reloaded = true
                    window.location.reload()
                  }
                }, 2000)
              } catch (err) {
                console.warn('SW update failed, reloading anyway', err)
                window.location.reload()
              }
            }}
            className="px-3 py-1 bg-green-600 text-white rounded"
          >
            Refresh for update
          </button>
        )}
      </div>
    </div>
  )
}
