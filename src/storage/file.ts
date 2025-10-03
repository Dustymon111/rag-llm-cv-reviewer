import multer from 'multer';
import { mkdirSync } from 'fs';
import { join } from 'path';


const UPLOAD_DIR = 'data/uploads';
mkdirSync(UPLOAD_DIR, { recursive: true });


export const upload = multer({ dest: UPLOAD_DIR });