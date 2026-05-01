import * as Minio from 'minio';

const BUCKET = process.env.MINIO_BUCKET || 'citizen-science-photos';

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || '',
  secretKey: process.env.MINIO_SECRET_KEY || '',
});

export async function getUploadUrl(key: string, contentType: string): Promise<string> {
  return minioClient.presignedPutObject(BUCKET, key, 5 * 60);
}

export function getPublicUrl(key: string): string {
  const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
  const port = process.env.MINIO_PORT || '9000';
  return `http://${endpoint}:${port}/${BUCKET}/${key}`;
}

export { BUCKET, minioClient };
