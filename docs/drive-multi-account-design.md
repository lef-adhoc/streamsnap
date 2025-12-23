Propuesta: Soporte para múltiples cuentas de Google Drive (diseño e implementación)
=====================================================================

Resumen ejecutivo
- Soporte para múltiples cuentas (ej. 2 laborales + 1 personal).
- El usuario puede: añadir/quitar cuentas, activar/desactivar cada cuenta, habilitar auto-save por cuenta, definir carpeta por defecto por cuenta.
- Guardado manual: el modal de "Guardar" muestra sólo las cuentas activadas; el usuario puede seleccionar en cuáles guardar si no tienen auto-save.
- Persistencia segura: metadatos en file JSON en userData; tokens guardados en keytar por cuenta.

Modelo de datos (drive_accounts.json)
- Ubicación sugerida: path.join(app.getPath('userData'), 'drive_accounts.json')
- Ejemplo:
{
  "accounts": [
    {
      "id": "uuid-v4",
      "email": "user@example.com",
      "displayName": "Work A",
      "avatarUrl": null,
      "keytarAccount": "streamsnap_drive_<id>",
      "isActive": true,
      "autoSave": false,
      "defaultFolderId": null,
      "createdAt": 1690000000000,
      "needsReauth": false
    }
  ],
  "defaultAccountId": "uuid-v4"
}

Token storage (keytar)
- Mantener tokens en keytar por seguridad.
- Formato: service = KEYCHAIN_CONFIG.service (igual); account = `${KEYCHAIN_CONFIG.account}:${accountId}`
- Valor = JSON.stringify({ accessToken, refreshToken, tokenExpiry })

Cambios principales en código (alto nivel)
1) Nuevo servicio: DriveAccountManager (src/services/DriveAccountManager.js)
   - read/write drive_accounts.json
   - createAccount() → inicia el flujo OAuth y guarda metadata + tokens
   - listAccounts(), getAccount(accountId), updateAccount(accountId, changes)
   - getActiveAccounts(), setDefaultFolder(accountId, folderId)
   - markNeedsReauth(accountId), removeAccount(accountId)
   - Helper para migración desde el esquema mono-cuenta actual

2) Adaptación de DriveService (múltiples cuentas)
   - Cambios puntuales: permitir pasar accountId a métodos relacionados con tokens.
   - Ejemplos de firmas:
     - async setTokens(accountId, tokenData)
     - async ensureValidAccessToken(accountId)
     - async refreshAccessToken(accountId)
     - async uploadVideo(accountId, folderId, videoData, fileName, privacy)
   - Mover la lógica de keytar/fs token load/save a helpers basados en accountId.

3) UI — Settings (nuevo/actualizar)
   - Nuevo archivo: src/windows/drive-accounts.html y src/js/drive-accounts-renderer.js
   - Elementos:
     - Lista de cuentas: avatar, displayName, email
     - Toggles: Active, Auto-save
     - Botones: Seleccionar carpeta por defecto (abre selector), Reconectar, Eliminar cuenta
     - Botón Añadir cuenta -> inicia OAuth (DriveAccountManager.createAccount)
     - Indicador estado token (válido / necesita reauth)

4) UI — Save modal
   - Modificar src/windows/save-video.html y src/js/save-renderer.js
   - Mostrar sección "Guardar en Drive" con lista de cuentas activas
   - Checkbox por cuenta (preseleccionadas si account.autoSave === true)
   - Mostrar carpeta por defecto y opción "Cambiar"
   - Botón "Guardar en las X cuentas" y progreso por cuenta

5) Auto-save behavior
   - RecordingManager (o el flujo que se encarga del post-record) consulta DriveAccountManager.getActiveAccounts() y lanza upload para cuentas con autoSave === true.
   - Mostrar notificaciones de éxito/fracaso por cuenta (drive-success-modal.js)

Consideraciones de UX
- Mantener la UI simple: lista con toggles y botones obvios.
- Mostrar estados: "Necesita reconectar" si refresh falla.
- En guardado manual, si una cuenta tiene auto-save y está activada, puede estar bloqueada (sin checkbox) o marcada y deshabilitada según preferencia de UX.
- Si no hay cuentas activas, mostrar CTA "Añadir cuenta" en el modal de guardar.

Snippets clave (ejemplos)
- Guardar tokens por accountId (en setTokens):
const keytarAccount = `${KEYCHAIN_CONFIG.account}:${accountId}`;
await keytar.setPassword(KEYCHAIN_CONFIG.service, keytarAccount, JSON.stringify(toSave));

- Cargar tokens:
async function loadTokens(accountId) {
  const keytarAccount = `${KEYCHAIN_CONFIG.account}:${accountId}`;
  const savedStr = await keytar.getPassword(KEYCHAIN_CONFIG.service, keytarAccount);
  if (!savedStr) return null;
  return JSON.parse(savedStr);
}

- Estructura mínima de DriveAccountManager (esquemático):
class DriveAccountManager {
  constructor() { /* load accounts file or create default */ }
  listAccounts() { /* return accounts */ }
  async createAccount() {
    // usar DriveService.authenticate() para obtener tokens
    // obtener userinfo (email, name)
    // generar id, store tokens en keytar y metadata en drive_accounts.json
  }
  async removeAccount(accountId) { /* borrar keytar entry + file metadata */ }
  ...
}

Migración desde implementación actual (mono-cuenta)
- Detectar si existe la entrada antigua en keytar con KEYCHAIN_CONFIG.account (sin :accountId).
- Si existe, crear automáticamente una account (id generado), copiar tokens a keytar con new key (add keytar account with :<id>) y crear drive_accounts.json con esa cuenta marcada activa.
- Mantener compatibilidad mientras se migra.

OAuth Scopes y seguridad
- Scopes recomendados: 'https://www.googleapis.com/auth/drive.file' (si solo archivos creados por la app), y 'profile','email' para userinfo.
- Para funcionalidades más amplias (buscar carpetas en todo Drive), considerar 'https://www.googleapis.com/auth/drive.readonly' o 'drive'.
- No escribir tokens en texto plano fuera de keytar. Si hay archivo de tokens actual en disk, migrar y borrar.

Concurrencia y rendimiento
- Subidas en paralelo pero limitar concurrencia (ej. p-limit a 3).
- Mostrar progreso por cuenta y manejar reintentos con backoff.

Errores y reauth
- Si refresh token falla: marcar needsReauth en metadata y mostrar botón "Reconectar" en settings.
- Al intentar upload en cuenta con needsReauth=true, omitir e informar al usuario.

Archivos a crear/modificar (lista)
- Crear: src/services/DriveAccountManager.js
- Modificar: src/services/DriveService.js (soporte accountId)
- Crear: src/windows/drive-accounts.html
- Crear: src/js/drive-accounts-renderer.js
- Modificar: src/windows/save-video.html
- Modificar: src/js/save-renderer.js
- Modificar/usar: src/js/drive-success-modal.js para soporte multi-cuenta
- Agregar: docs/drive-multi-account-design.md (este documento)

Plan de implementación (checklist)
- [x] Analizar implementación existente (DriveService.js)
- [ ] Diseñar DriveAccountManager (CRUD + keytar helpers)
- [ ] Refactor mínimo en DriveService para accountId
- [ ] Implementar migración mono-cuenta -> multi-cuenta
- [ ] Crear UI de administración de cuentas
- [ ] Integrar selector de carpeta por cuenta
- [ ] Actualizar Save modal para selección de cuentas
- [ ] Implementar auto-save en RecordingManager
- [ ] Manejo de errores / reconexión / notificaciones
- [ ] Tests manuales: añadir cuenta, set folder, upload manual, auto-save
- [ ] Documentación y cleanup

Siguientes pasos para que lo implemente
- Confirmá si querés que empiece la implementación ahora. Implementación sugerida en orden:
  1) Crear DriveAccountManager + migration
  2) Cambiar DriveService para soportar accountId (cambios pequeños y localizados)
  3) Crear UI de Settings (drive-accounts.html + renderer)
  4) Integrar Save modal y RecordingManager

Notas finales
- El diseño se adapta al código actual: DriveService ya tiene las funciones necesarias (auth PKCE, token exchange, refresh, upload, getFolders). Reutilizarlas pero con token storage por accountId y una capa manager para cuentas mantiene el cambio local y claro.
- He creado este documento en el repo (docs/drive-multi-account-design.md) con el plan y pasos. Si confirmás, procedo a implementar el primer paso (crear DriveAccountManager + migración).
