import path from 'path';
import mime from 'mime-types';

export default function downloadFilename(file) {
    if (path.extname(file.filename)) return file.filename;
    if (file.file_extension) return `${file.filename}${file.file_extension}`;
    return `${file.filename}.${mime.extension(file.mimetype) || 'bin'}`;
}
