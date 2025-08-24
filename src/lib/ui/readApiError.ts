// src/lib/ui/readApiError.ts
export async function readApiError(res: Response): Promise<string> {
  try {
    const j = await res.json();
    if (j && Array.isArray(j.issues) && j.issues.length > 0) {
      return j.issues.map((i: any) => i?.message).filter(Boolean).join('\n');
    }
    if (j && j.error) {
      return typeof j.error === 'string' ? j.error : JSON.stringify(j.error);
    }
  } catch {
    // 本文がJSONじゃない場合は無視
  }
  return `HTTP ${res.status}`;
}