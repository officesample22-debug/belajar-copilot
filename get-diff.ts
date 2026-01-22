/**
 * get-diff.ts
 *
 * Mengambil output `git diff` menggunakan execFileSync untuk menghindari
 * interpretasi shell terhadap karakter spesial di path atau argumen.
 *
 * - execFileSync dipakai dengan array args sehingga setiap path/arg dipassing
 *   sebagai argumen terpisah (aman terhadap spasi, kutip, newline, dll).
 * - Opsi `raw` = true mengembalikan Buffer (preserve raw bytes), default mengembalikan string UTF-8.
 * - Menangani error agar stderr dari git dilampirkan ke pesan error.
 */

import { execFileSync } from 'child_process';
import type { Buffer } from 'buffer';

export type GetDiffOptions = {
  // Jika diset, jalankan git dari direktori ini (cwd)
  gitDir?: string;
  // Jika true, kembalikan Buffer (raw bytes). Jika false (default), kembalikan string utf8.
  raw?: boolean;
  // Max buffer untuk execFileSync (default 200 MB)
  maxBuffer?: number;
};

/**
 * Ambil hasil `git diff`.
 *
 * @param revRange - rentang/target untuk git diff (mis. "HEAD~1..HEAD" atau "HEAD"). 
 *                   Jika dikosongkan, akan menjalankan `git --no-pager diff` (perubahan kerja).
 * @param paths - daftar path/file yang ingin dibatasi diff-nya. Path dengan karakter khusus aman.
 * @param options - opsi tambahan.
 * @returns string (utf8) atau Buffer (jika options.raw = true)
 */
export function getDiff(
  revRange?: string,
  paths: string[] = [],
  options: GetDiffOptions = {}
): string | Buffer {
  const args: string[] = ['--no-pager', 'diff'];

  if (revRange && revRange.length > 0) {
    // revRange dilewatkan sebagai satu argumen (aman terhadap karakter khusus)
    args.push(revRange);
  }

  // Jika ada path yang ingin dibatasi, tambahkan pemisah -- lalu setiap path
  if (paths.length > 0) {
    args.push('--', ...paths);
  }

  const execOptions: {
    cwd?: string;
    encoding?: string | null;
    maxBuffer?: number;
  } = {
    cwd: options.gitDir,
    encoding: options.raw ? null : 'utf8',
    maxBuffer: options.maxBuffer ?? 200 * 1024 * 1024, // 200 MB default
  };

  try {
    const result = execFileSync('git', args, execOptions);
    return result as string | Buffer;
  } catch (err: any) {
    // Jika git menulis ke stderr, sertakan isinya agar debugging lebih mudah
    let stderrMsg = '';
    if (err && err.stderr) {
      try {
        stderrMsg = typeof err.stderr === 'string' ? err.stderr : err.stderr.toString('utf8');
      } catch {
        stderrMsg = '<failed to decode stderr>';
      }
    }
    const msg = `git diff failed: ${err && err.message ? err.message : String(err)}${stderrMsg ? `\nstderr:\n${stderrMsg}` : ''}`;
    const ex = new Error(msg);
    // sertakan properti asli untuk kemungkinan debugging lebih lanjut
    (ex as any).original = err;
    throw ex;
  }
}

// Contoh penggunaan:
// const diffText = getDiff('HEAD~1..HEAD', ['path/with space/file.txt']);
// const rawBuffer = getDiff(undefined, ['binary-file.bin'], { raw: true });
