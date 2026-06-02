import fs from 'fs/promises';
import path from 'path';

export type AdminActivityType = 'invite_batch' | 'student_import';
export type AdminActivityStatus = 'success' | 'failed';

export interface AdminActivityRecord {
  id: string;
  school_id: string;
  type: AdminActivityType;
  status: AdminActivityStatus;
  title: string;
  message: string;
  meta: Record<string, unknown>;
  created_at: string;
}

const dataDir = path.resolve(process.cwd(), 'data');
const storePath = path.join(dataDir, 'admin-activities.json');

const readRecords = async (): Promise<AdminActivityRecord[]> => {
  try {
    const raw = await fs.readFile(storePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AdminActivityRecord[]) : [];
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
};

const writeRecords = async (records: AdminActivityRecord[]): Promise<void> => {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(records, null, 2), 'utf8');
};

export const appendAdminActivity = async (
  entry: Omit<AdminActivityRecord, 'id' | 'created_at'> & { created_at?: string }
): Promise<AdminActivityRecord> => {
  const records = await readRecords();
  const record: AdminActivityRecord = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    created_at: entry.created_at || new Date().toISOString(),
    ...entry,
  };

  records.unshift(record);
  await writeRecords(records.slice(0, 200));
  return record;
};

export const listAdminActivities = async (schoolId: string, limit = 20): Promise<AdminActivityRecord[]> => {
  const records = await readRecords();
  return records
    .filter((record) => record.school_id === schoolId)
    .slice(0, Math.max(1, limit));
};