import crypto from 'crypto';
import * as fs from 'fs';

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
        stream.close();
      })
      .on('error', (error) => {
        reject(error);
        stream.close();
      });
  });
}
