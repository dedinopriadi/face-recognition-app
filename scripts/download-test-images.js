const https = require('https');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

// Sample face images URLs (using placeholder images)
const testImages = [
  {
    name: 'person1.jpg',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    description: 'Male face - good lighting'
  },
  {
    name: 'person2.jpg', 
    url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
    description: 'Female face - clear features'
  },
  {
    name: 'person3.jpg',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
    description: 'Male face - different angle'
  },
  {
    name: 'person4.jpg',
    url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
    description: 'Female face - natural expression'
  },
  {
    name: 'person5.jpg',
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    description: 'Male face - professional look'
  }
];

// Download function
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(filepath).catch(() => {}); // Delete file if exists
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Main function
async function main() {
  const testImagesDir = path.join(__dirname, '../test-images');
  
  try {
    // Create test-images directory if it doesn't exist
    await fsPromises.mkdir(testImagesDir, { recursive: true });
    
    console.log('📥 Downloading test images...\n');
    
    for (const image of testImages) {
      const filepath = path.join(testImagesDir, image.name);
      
      try {
        console.log(`⬇️  Downloading ${image.name}...`);
        await downloadImage(image.url, filepath);
        console.log(`✅ Downloaded: ${image.name} - ${image.description}`);
      } catch (error) {
        console.log(`❌ Failed to download ${image.name}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Test images download completed!');
    console.log(`📁 Images saved to: ${testImagesDir}`);
    console.log('\n📝 Usage:');
    console.log('1. Use these images to test face enrollment');
    console.log('2. Test face recognition with different images of the same person');
    console.log('3. Test with invalid images (no face, multiple faces, etc.)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { downloadImage, testImages }; 