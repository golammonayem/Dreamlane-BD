const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const isConfigured = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log('[Cloudinary] Configured successfully');
} else {
    console.log('[Cloudinary] Not configured - image uploads will use placeholder');
}

module.exports = { cloudinary, isConfigured };
