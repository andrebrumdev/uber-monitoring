import { safeStorage } from 'electron'
import type { Encryptor } from './credentialStore'

// No Linux sem keyring o Electron cai para 'basic_text', que não é criptografia real.
function isRealEncryption(): boolean {
  if (!safeStorage.isEncryptionAvailable()) return false
  return !(process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')
}

export const safeStorageEncryptor: Encryptor = {
  isEncryptionAvailable: isRealEncryption,
  encryptString: (plain) => safeStorage.encryptString(plain),
  decryptString: (encrypted) => safeStorage.decryptString(encrypted)
}
