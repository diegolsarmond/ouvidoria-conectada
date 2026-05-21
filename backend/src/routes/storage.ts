import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function getBucketDir(bucket: string): string {
  const allowed = ['attachments', 'knowledge-base'];
  if (!allowed.includes(bucket)) throw new Error('Bucket não permitido');
  return path.join(config.uploadsDir, bucket);
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      const dir = getBucketDir(req.params['bucket'] as string);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (err: any) {
      cb(err, '');
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// POST /api/storage/upload/:bucket
router.post('/upload/:bucket', requireAuth as any, upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Nenhum arquivo enviado' });
    return;
  }
  const bucket = req.params.bucket;
  const subPath = req.body.path || req.file.filename;
  const publicUrl = `${req.protocol}://${req.get('host')}/api/storage/public/${bucket}/${req.file.filename}`;
  res.json({ path: req.file.filename, publicUrl });
});

// GET /api/storage/public/:bucket/*
router.get('/public/:bucket/*', (req, res) => {
  try {
    const bucket = req.params.bucket;
    const filePath = (req.params as any)[0] as string;
    const fullPath = path.join(getBucketDir(bucket), filePath);
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'Arquivo não encontrado' });
      return;
    }
    res.sendFile(path.resolve(fullPath));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
