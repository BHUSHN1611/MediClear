# MediClear Storage Architecture & Production Requirements

This document outlines the medical document storage architecture for MediClear, detailing the transition from local development storage to production cloud object storage.

---

## 1. Storage Abstraction Interface

All file storage operations in MediClear are performed through the `StorageService` abstraction contract defined in [`server/src/services/storageService.js`](file:///d:/E/MediClear/server/src/services/storageService.js):

```javascript
class StorageService {
  async saveFile({ buffer, originalName, mimeType }) // Returns: { storedName, filePath, sizeBytes }
  async getFile(storedName)                          // Returns: Buffer
  async deleteFile(storedName)                       // Returns: boolean
  async fileExists(storedName)                       // Returns: boolean
}
```

No controller or service interacts directly with the filesystem, ensuring that swapping storage backends requires zero modifications to business or clinical logic.

---

## 2. Development vs. Production Storage

### Development: `LocalStorageService`
- **Location:** Private directory on host machine (`server/uploads/`).
- **Access Control:** File permissions restricted (`0o600` for files, `0o700` for directory).
- **Public Exposure:** Explicitly **not** served through Express static middleware.
- **Filenames:** Random UUID v4 strings with sanitized extension (e.g., `8fa37a89-cf9b-4b2a-a92c-15a0cbb71e08.pdf`). Never retains patient names or identifying filesystem traces.

### Production Constraints on Render / PaaS
- **Ephemeral Filesystem:** On platforms like Render (free and starter tiers) or containerized environments, container restarts, redeployments, and dyno cycling wipe local disk storage completely.
- **Multi-Instance Scaling:** If multiple backend instances are spawned, local disk is not shared between instances, causing file lookup failures.

---

## 3. Production Cloud Storage Requirements

When transitioning to production on Render, the backend must use an implementation of `StorageService` backed by dedicated, private cloud object storage (e.g., **AWS S3**, **Google Cloud Storage**, or **Azure Blob Storage**).

### Technical Requirements for Production Provider:
1. **Private Buckets (No Public Access):**
   - The bucket must have `Block Public Access` enabled 100%.
   - No direct URL access to documents. Files must be retrieved either through streaming via the authenticated backend or via short-lived pre-signed URLs (TTL ≤ 5 minutes).
2. **Encryption at Rest:**
   - Server-Side Encryption (SSE-S3 or SSE-KMS with AES-256) must be enforced for all stored medical files.
3. **Encryption in Transit:**
   - Enforce TLS 1.3 / HTTPS for all object transfers.
4. **Lifecycle Expiration (TTL):**
   - Configure S3 Lifecycle Rules to automatically expire and delete all objects in the bucket after **30 days**, matching the MongoDB TTL index on the `Document` collection.
5. **Cascade Deletion:**
   - When a user clicks "Delete this document", `storageService.deleteFile(storedName)` must issue a hard delete command (`DeleteObjectCommand` on S3) to guarantee immediate removal.
