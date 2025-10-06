import multer from 'multer';
import { mkdirSync } from 'fs';


const UPLOAD_DIR = 'data/uploads';
const SYSTEM_DOCS = 'data/system_docs';
mkdirSync(UPLOAD_DIR, { recursive: true });
mkdirSync(SYSTEM_DOCS, { recursive: true });


export const upload = multer({ dest: UPLOAD_DIR });