/**
 * Integration: one-time Dexie → Firestore migration (plan §2.6) — a real
 * Dexie database on fake-indexeddb, the real SDK on the emulators.
 */
import 'fake-indexeddb/auto';
import { randomUUID } from 'node:crypto';
import { StudentDayTrackerDB } from '@/lib/db';
import { activitiesCol, categoriesCol, userDoc } from '@/lib/firestore-paths';
import {
  DEVICE_MARKER_KEY,
  type MigrationProgress,
  type MigrationStart,
  migrateLocalData,
} from '@/lib/migrate-local-data';
import type { Activity, Category } from '@/lib/types';
import { ensureUserProfile } from '@/lib/user-profile';
import Dexie from 'dexie';
import { getDoc, getDocsFromServer, waitForPendingWrites } from 'firebase/firestore';
import { afterEach, describe, expect, it } from 'vitest';
import { type Device, signInDevice } from './support';

class MemoryStorage {
  private items = new Map<string, string>();
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
}

const row = (id: string, overrides: Partial<Activity> = {}): Activity => ({
  id,
  categoryId: 'work',
  name: `Row ${id}`,
  date: '2026-09-01',
  startMinutes: 540,
  endMinutes: 600,
  createdAt: 1,
  ...overrides,
});

const custom: Category = {
  id: 'c-vol',
  name: 'Volunteering',
  color: '#0ea5e9',
  icon: '🏷️',
  isDefault: false,
  createdAt: 50,
};

/** 590 real single rows + 5 cross-midnight pairs (= 600 real rows) + demo rows. */
function localRows(): Activity[] {
  const rows: Activity[] = [];
  for (let i = 0; i < 590; i++) rows.push(row(`r${String(i).padStart(3, '0')}`));
  for (let i = 0; i < 5; i++) {
    const id = `span${i}`;
    rows.push(row(id, { spanId: id, startMinutes: 1320, endMinutes: 1440 }));
    rows.push(
      row(`${id}-next`, { spanId: id, date: '2026-09-02', startMinutes: 0, endMinutes: 60 })
    );
  }
  rows[0] = { ...rows[0], categoryId: custom.id };
  rows.push(row('demo-1'), row('demo-2', { spanId: 'demo-2' }), row('demo-2-next'));
  return rows;
}

const devices: Device[] = [];
const dexieNames: string[] = [];

afterEach(async () => {
  await Promise.all(devices.splice(0).map((d) => d.close()));
  await Promise.all(dexieNames.splice(0).map((name) => Dexie.delete(name)));
});

async function setup(seed = true) {
  const device = await signInDevice();
  devices.push(device);
  await ensureUserProfile(device.scope, {
    displayName: 'Minh Anh',
    email: 'a@example.com',
    photoURL: null,
  });
  await waitForPendingWrites(device.scope.db);

  const dexieName = `sdt-migration-${randomUUID()}`;
  dexieNames.push(dexieName);
  if (seed) {
    const dexie = new StudentDayTrackerDB(dexieName);
    await dexie.activities.bulkAdd(localRows());
    await dexie.categories.add(custom);
    dexie.close();
  }
  return { device, dexieName, storage: new MemoryStorage() };
}

describe('migrateLocalData', () => {
  it('copies 600 local rows in 2 batches with progress, skipping demo rows and defaults', async () => {
    const { device, dexieName, storage } = await setup();
    const starts: MigrationStart[] = [];
    const progress: MigrationProgress[] = [];

    const result = await migrateLocalData({
      scope: device.scope,
      dexieName,
      storage,
      now: () => 4242,
      onStart: (s) => starts.push(s),
      onProgress: (p) => progress.push(p),
    });

    expect(result).toEqual({ status: 'migrated', activities: 600, categories: 1 });
    expect(starts).toEqual([{ activities: 600, categories: 1, total: 601, batches: 2 }]);
    expect(progress.map((p) => [p.done, p.batch])).toEqual([
      [500, 1],
      [601, 2],
    ]);

    const remote = (await getDocsFromServer(activitiesCol(device.scope))).docs.map((d) => d.data());
    expect(remote).toHaveLength(600);
    expect(remote.some((a) => a.id.startsWith('demo-'))).toBe(false);
    const spans = remote.filter((a) => a.spanId !== undefined);
    expect(spans).toHaveLength(10);
    expect(remote.find((a) => a.id === 'r000')?.categoryId).toBe('c-vol');

    const remoteCategories = (await getDocsFromServer(categoriesCol(device.scope))).docs;
    expect(remoteCategories.map((d) => d.data())).toEqual([custom]);

    // Markers are written last.
    expect((await getDoc(userDoc(device.scope))).data()?.migratedFromDexieAt).toBe(4242);
    expect(JSON.parse(storage.getItem(DEVICE_MARKER_KEY) ?? 'null')).toEqual({
      uid: device.scope.uid,
      at: 4242,
    });

    // Dexie is left untouched.
    const dexie = new StudentDayTrackerDB(dexieName);
    expect(await dexie.activities.count()).toBe(603);
    dexie.close();
  });

  it('re-running (device marker lost) plans and writes nothing', async () => {
    const { device, dexieName, storage } = await setup();
    await migrateLocalData({ scope: device.scope, dexieName, storage });
    storage.removeItem(DEVICE_MARKER_KEY);

    let started = false;
    const again = await migrateLocalData({
      scope: device.scope,
      dexieName,
      storage,
      onStart: () => {
        started = true;
      },
    });
    expect(again).toEqual({ status: 'skipped', reason: 'nothing-to-migrate' });
    expect(started).toBe(false);
  });

  it('a second account on the same device gets no local data (device marker)', async () => {
    const { device, dexieName, storage } = await setup();
    await migrateLocalData({ scope: device.scope, dexieName, storage });

    const sibling = await signInDevice();
    devices.push(sibling);
    const result = await migrateLocalData({ scope: sibling.scope, dexieName, storage });
    expect(result).toEqual({ status: 'skipped', reason: 'device-marker' });
    expect((await getDocsFromServer(activitiesCol(sibling.scope))).empty).toBe(true);
  });

  it('marks the device and skips when there is no local database', async () => {
    const { device, dexieName, storage } = await setup(false);
    const result = await migrateLocalData({ scope: device.scope, dexieName, storage });
    expect(result).toEqual({ status: 'skipped', reason: 'no-local-db' });
    expect(storage.getItem(DEVICE_MARKER_KEY)).not.toBeNull();
    expect(await Dexie.exists(dexieName)).toBe(false);
  });

  it('throws without setting the markers when a batch is rejected, and retries next time', async () => {
    const { device, dexieName, storage } = await setup();
    // Another user's scope: the rules reject every write.
    const intruder = { db: device.scope.db, uid: `someone-else-${randomUUID()}` };
    await expect(
      migrateLocalData({ scope: intruder, dexieName, storage, batchTimeoutMs: 10_000 })
    ).rejects.toThrow();
    expect(storage.getItem(DEVICE_MARKER_KEY)).toBeNull();

    const retry = await migrateLocalData({ scope: device.scope, dexieName, storage });
    expect(retry).toMatchObject({ status: 'migrated', activities: 600 });
  });
});
