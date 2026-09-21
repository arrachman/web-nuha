import { kelasStatus } from '@/components/utils/format';

export function Badge({ status }: { status: string }) {
  return <span className={`badge ${kelasStatus(status)}`}>{status}</span>;
}
