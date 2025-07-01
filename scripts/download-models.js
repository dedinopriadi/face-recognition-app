const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const MODELS_DIR = path.join(__dirname, '../models');
const MODELS_URL = 'https://github.com/justadudewhohacks/face-api.js/tree/master/weights';

// List of required model files
const REQUIRED_MODELS = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1'
];

async function downloadFile(url, filepath) {
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
        fs.unlink(filepath).catch(() => {});
        reject(err);
      });
    }).on('error', reject);
  });
}

async function checkModelsExist() {
  try {
    const files = await fs.readdir(MODELS_DIR);
    const missingModels = REQUIRED_MODELS.filter(model => !files.includes(model));
    
    if (missingModels.length === 0) {
      console.log('✅ All face-api.js models are already downloaded');
      return true;
    }
    
    console.log('❌ Missing models:', missingModels);
    return false;
  } catch (error) {
    console.log('📁 Models directory not found');
    return false;
  }
}

async function createModelsDirectory() {
  try {
    await fs.mkdir(MODELS_DIR, { recursive: true });
    console.log('✅ Created models directory');
  } catch (error) {
    console.error('❌ Failed to create models directory:', error.message);
    throw error;
  }
}

function showManualInstructions() {
  console.log('\n📋 Manual Download Instructions:');
  console.log('================================');
  console.log('1. Visit:', MODELS_URL);
  console.log('2. Download the following files:');
  REQUIRED_MODELS.forEach(model => {
    console.log(`   - ${model}`);
  });
  console.log('3. Place all files in the ./models directory');
  console.log('4. Restart the application');
  console.log('\n💡 Alternative: Use git to clone the entire repository');
  console.log('   git clone https://github.com/justadudewhohacks/face-api.js.git');
  console.log('   cp -r face-api.js/weights/* ./models/');
}

async function main() {
  console.log('🚀 Face Recognition Models Downloader');
  console.log('=====================================\n');
  
  try {
    // Check if models already exist
    const modelsExist = await checkModelsExist();
    if (modelsExist) {
      return;
    }
    
    // Create models directory
    await createModelsDirectory();
    
    console.log('\n⚠️  Automatic download not implemented yet.');
    console.log('   This is due to GitHub API limitations for large files.');
    showManualInstructions();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { checkModelsExist, showManualInstructions }; 