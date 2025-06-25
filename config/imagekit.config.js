const ImageKit = require('imagekit');

// Validate environment variables
const requiredEnvVars = [
    'IMAGEKIT_PUBLIC_KEY',
    'IMAGEKIT_PRIVATE_KEY', 
    'IMAGEKIT_URL_ENDPOINT'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required ImageKit environment variables:');
    missingVars.forEach(varName => {
        console.error(`   - ${varName}`);
    });
    console.error('\nPlease create a .env file with the following variables:');
    console.error('IMAGEKIT_PUBLIC_KEY=your_public_key');
    console.error('IMAGEKIT_PRIVATE_KEY=your_private_key');
    console.error('IMAGEKIT_URL_ENDPOINT=your_url_endpoint');
    console.error('\nYou can get these from your ImageKit dashboard.');
    
    // Don't throw error immediately, let the application start but ImageKit operations will fail
    console.warn('⚠️  ImageKit operations will fail until environment variables are set.');
}

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

module.exports = imagekit; 