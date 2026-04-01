import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
    constructor() {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
    }

    /**
     * Upload a file buffer to Cloudinary
     * @param file - Multer file object
     * @param folder - Folder path in Cloudinary (e.g., 'community', 'course', 'workflow')
     * @returns Promise with the uploaded image URL
     */
    async uploadImage(
        file: Express.Multer.File,
        folder: string,
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: folder,
                    resource_type: 'image',
                    transformation: [
                        {
                            quality: 'auto',
                            fetch_format: 'auto',
                        },
                    ],
                },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        reject(error);
                    } else if (result && result.secure_url) {
                        resolve(result.secure_url);
                    } else {
                        reject(new Error('Cloudinary upload failed: No result returned'));
                    }
                },
            );

            // Convert buffer to stream
            const bufferStream = new Readable();
            bufferStream.push(file.buffer);
            bufferStream.push(null);
            bufferStream.pipe(uploadStream);
        });
    }

    /**
     * Upload multiple files to Cloudinary
     * @param files - Array of Multer file objects
     * @param folder - Folder path in Cloudinary
     * @returns Promise with array of uploaded image URLs
     */
    async uploadMultipleImages(
        files: Express.Multer.File[],
        folder: string,
    ): Promise<string[]> {
        const uploadPromises = files.map((file) => this.uploadImage(file, folder));
        return Promise.all(uploadPromises);
    }

    /**
     * Delete an image from Cloudinary using its URL
     * @param imageUrl - Full URL of the image to delete
     * @returns Promise with deletion result
     */
    async deleteImage(imageUrl: string): Promise<void> {
        try {
            if (!imageUrl || !imageUrl.startsWith('http')) {
                return; // Not a valid Cloudinary URL
            }

            // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{folder}/{filename}.{ext}
            // We need to extract the public_id which is {folder}/{filename} (without extension)
            const urlParts = imageUrl.split('/');
            
            // Find the index of 'upload' in the URL
            const uploadIndex = urlParts.findIndex(part => part === 'upload');
            if (uploadIndex === -1) {
                console.warn('Invalid Cloudinary URL format:', imageUrl);
                return;
            }

            // Everything after 'upload' is the path (version/folder/filename.ext)
            // Skip version if present (it's usually a number or v{number})
            const pathParts = urlParts.slice(uploadIndex + 1);
            
            if (pathParts.length === 0) {
                console.warn('No path found in Cloudinary URL:', imageUrl);
                return;
            }

            // Get the last part (filename with extension)
            const filenameWithExt = pathParts[pathParts.length - 1];
            // Remove extension to get filename
            const filename = filenameWithExt.split('.')[0];
            
            // Get folder path (everything except the last part)
            const folderParts = pathParts.slice(0, -1);
            // Filter out version numbers (like 'v1234567890' or just numbers)
            const folderPath = folderParts
                .filter(part => !part.match(/^v\d+$/) && !part.match(/^\d+$/))
                .join('/');

            // Construct public_id: folder/filename or just filename
            const publicId = folderPath ? `${folderPath}/${filename}` : filename;

            const result = await cloudinary.uploader.destroy(publicId);
            if (result.result === 'not found') {
                console.warn(`Image not found in Cloudinary: ${publicId}`);
            } else {
                console.log(`Successfully deleted image from Cloudinary: ${publicId}`);
            }
        } catch (error) {
            console.error('Cloudinary delete error:', error);
            // Don't throw error if image doesn't exist or is already deleted
        }
    }
}

