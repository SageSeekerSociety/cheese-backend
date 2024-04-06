import crypto from 'crypto';
import * as fs from 'fs';
import mime from 'mime-types';

export function getFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream
      .on('data', (data) => {
        hash.update(data);
      })
      .on('end', () => {
        resolve(hash.digest('hex'));
        stream.destroy();
      })
      .on('error', (error) => {
        reject(error);
        stream.destroy();
      });
  });
}

export async function getFileMimeType(filePath: string): Promise<string> {
  return mime.lookup(filePath) || 'application/octet-stream';
}
