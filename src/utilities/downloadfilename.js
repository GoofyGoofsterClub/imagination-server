import path from 'path';
import mime from 'mime-types';

const mappedExtensions = new Map([
    ['application/x-zip-compressed', 'zip'],
    ['application/rar', 'rar'],
    ['application/x-rar', 'rar'],
    ['application/7z', '7z'],
    ['application/x-7z', '7z']
]);

export default function downloadFilename(file) {
    if (path.extname(file.filename)) return file.filename;
    if (file.file_extension) return `${file.filename}${file.file_extension}`;
    const mimetype = file.mimetype.split(';', 1)[0].trim().toLowerCase();
    const extension = mappedExtensions.get(mimetype) || mime.extension(mimetype) || 'bin';
    return `${file.filename}.${extension}`;
}
