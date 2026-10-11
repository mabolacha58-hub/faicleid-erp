// Offline Data Management Utilities
import { openDB } from 'idb';
import type { Student, Teacher, Class, Subject, Grade, Attendance, Payment } from '../../types/domain';

const DB_NAME = 'SchoolManagementDB';
const DB_VERSION = 1;

// Initialize IndexedDB
export async function initOfflineDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Students store
      if (!db.objectStoreNames.contains('students')) {
        const studentsStore = db.createObjectStore('students', { keyPath: 'id' });
        studentsStore.createIndex('classId', 'classId');
        studentsStore.createIndex('name', 'name');
      }

      // Teachers store
      if (!db.objectStoreNames.contains('teachers')) {
        const teachersStore = db.createObjectStore('teachers', { keyPath: 'id' });
        teachersStore.createIndex('subjectId', 'subjectId');
        teachersStore.createIndex('name', 'name');
      }

      // Classes store
      if (!db.objectStoreNames.contains('classes')) {
        db.createObjectStore('classes', { keyPath: 'id' });
      }

      // Subjects store
      if (!db.objectStoreNames.contains('subjects')) {
        db.createObjectStore('subjects', { keyPath: 'id' });
      }

      // Grades store
      if (!db.objectStoreNames.contains('grades')) {
        const gradesStore = db.createObjectStore('grades', { keyPath: 'id' });
        gradesStore.createIndex('studentId', 'studentId');
        gradesStore.createIndex('subjectId', 'subjectId');
      }

      // Attendance store
      if (!db.objectStoreNames.contains('attendance')) {
        const attendanceStore = db.createObjectStore('attendance', { keyPath: 'id' });
        attendanceStore.createIndex('studentId', 'studentId');
        attendanceStore.createIndex('date', 'date');
      }

      // Financial store
      if (!db.objectStoreNames.contains('payments')) {
        const paymentsStore = db.createObjectStore('payments', { keyPath: 'id' });
        paymentsStore.createIndex('studentId', 'studentId');
        paymentsStore.createIndex('status', 'status');
        paymentsStore.createIndex('dueDate', 'dueDate');
      }

      // Sync queue for pending operations
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id' });
      }

      // User preferences and settings
      if (!db.objectStoreNames.contains('userPrefs')) {
        db.createObjectStore('userPrefs', { keyPath: 'key' });
      }
    },
  });
}

// Generic CRUD operations for offline storage
export class OfflineStore<T> {
  constructor(private storeName: string) {}

  async getAll(): Promise<T[]> {
    const db = await initOfflineDB();
    return db.getAll(this.storeName) as Promise<T[]>;
  }

  async getById(id: string): Promise<T | undefined> {
    const db = await initOfflineDB();
    return db.get(this.storeName, id) as Promise<T | undefined>;
  }

  async add(item: T): Promise<void> {
    const db = await initOfflineDB();
    await db.add(this.storeName, item);
  }

  async update(item: T): Promise<void> {
    const db = await initOfflineDB();
    await db.put(this.storeName, item);
  }

  async delete(id: string): Promise<void> {
    const db = await initOfflineDB();
    await db.delete(this.storeName, id);
  }

  async getByIndex(indexName: string, value: string): Promise<T[]> {
    const db = await initOfflineDB();
    return db.getAllFromIndex(this.storeName, indexName, value) as Promise<T[]>;
  }
}

// Specific store instances
export const offlineStudents = new OfflineStore<Student>('students');
export const offlineTeachers = new OfflineStore<Teacher>('teachers');
export const offlineClasses = new OfflineStore<Class>('classes');
export const offlineSubjects = new OfflineStore<Subject>('subjects');
export const offlineGrades = new OfflineStore<Grade>('grades');
export const offlineAttendance = new OfflineStore<Attendance>('attendance');
export const offlinePayments = new OfflineStore<Payment>('payments');

// Sync management
type SyncOperation = {
  type: 'create' | 'update' | 'delete';
  store: string;
  data: Record<string, unknown>;
  id?: string;
};

type SyncQueueItem = SyncOperation & {
  id: string;
  timestamp: number;
  synced: boolean;
};

export class SyncManager {
  private syncQueue: SyncQueueItem[] = [];
  private isOnline = navigator.onLine;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Load pending sync operations
    this.loadSyncQueue();
  }

  get isOnlineStatus(): boolean {
    return this.isOnline;
  }

  // Queue operation for sync
  async queueForSync(operation: SyncOperation): Promise<void> {
    const syncItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      ...operation,
      synced: false
    };

    this.syncQueue.push(syncItem);

    // Store in IndexedDB
    const db = await initOfflineDB();
    await db.add('syncQueue', syncItem);

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncPendingData();
    }
  }

  // Sync pending data with server
  async syncPendingData(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    const db = await initOfflineDB();
    const pendingItems = await db.getAll('syncQueue');

    for (const item of pendingItems) {
      try {
        await this.syncItem(item);
        // Remove from queue on success
        await db.delete('syncQueue', item.id);
        this.syncQueue = this.syncQueue.filter(q => q.id !== item.id);
      } catch (error) {
        console.error('Failed to sync item:', item, error);
        // Keep in queue for retry
      }
    }
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    // This would call the appropriate API based on the operation
    // For now, just log it
    console.log('Syncing item:', item);

    // TODO: Implement actual API calls based on item.type and item.store
    // Example:
    // if (item.type === 'create' && item.store === 'students') {
    //   await studentsAPI.create(item.data);
    // }
  }

  private async loadSyncQueue(): Promise<void> {
    const db = await initOfflineDB();
    this.syncQueue = await db.getAll('syncQueue');
  }

  getPendingCount(): number {
    return this.syncQueue.length;
  }
}

// Global sync manager instance
export const syncManager = new SyncManager();

// Network status utilities
export function isOnline(): boolean {
  return navigator.onLine;
}

export function addOnlineListener(callback: (online: boolean) => void): void {
  const handler = () => callback(navigator.onLine);
  window.addEventListener('online', handler);
  window.addEventListener('offline', handler);
}

export function removeOnlineListener(callback: (online: boolean) => void): void {
  const handler = () => callback(navigator.onLine);
  window.removeEventListener('online', handler);
  window.removeEventListener('offline', handler);
}