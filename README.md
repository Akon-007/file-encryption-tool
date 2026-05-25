# File Encryption Tool

A client-side web application for secure file encryption, decryption, hashing, and integrity verification.

## Features

- **File Encryption / Decryption**
  - Uses PBKDF2 to derive a strong AES-GCM key from your password.
  - Encrypts files locally in the browser.
  - Produces a downloadable encrypted file that embeds salt and IV for safe decryption.
  - Decrypts files locally using the same password.

- **Hashing & Integrity**
  - Computes file hashes using SHA-256 or SHA-512.
  - Displays the hash value as a hex string.
  - Instantly compares a pasted hash against the computed value.

## Security & Privacy

This tool uses the browser's native Web Crypto API. All cryptographic operations happen entirely on your device.

- No file data is uploaded to any server.
- No third-party cryptographic libraries are required.
- The derived key is never shared or persisted outside the browser.

## Usage

1. Open `index.html` in a modern browser (Chrome, Firefox, Edge, Safari).
2. Select the **Encrypt / Decrypt** tab to encrypt or decrypt a file.
   - Drag and drop a file or click the drop zone.
   - Enter a strong password or passphrase.
   - Choose `Encrypt` or `Decrypt` and click `Process File`.
3. Select the **Hash & Integrity** tab to compute a file hash.
   - Drag and drop a file or click the drop zone.
   - Choose SHA-256 or SHA-512.
   - Paste an expected hash to verify integrity.

## Notes

- Encrypted files include the salt and IV in the first bytes of the output file.
- Use the same passphrase to decrypt as you used to encrypt.
- For integrity checks, comparison is case-insensitive and ignores leading/trailing whitespace.
