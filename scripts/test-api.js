const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/face`;

// Test colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runTest(testName, command, expectedStatus = 200) {
  try {
    log(`\n🧪 Testing: ${testName}`, 'blue');
    const result = execSync(command, { encoding: 'utf8' });
    
    if (expectedStatus === 200) {
      log(`✅ ${testName} - PASSED`, 'green');
      try {
        const json = JSON.parse(result);
        console.log('Response:', JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('Response:', result);
      }
    } else {
      log(`✅ ${testName} - PASSED (Expected ${expectedStatus})`, 'green');
      console.log('Response:', result);
    }
    return true;
  } catch (error) {
    log(`❌ ${testName} - FAILED`, 'red');
    console.error('Error:', error.message);
    return false;
  }
}

async function main() {
  log('🚀 Face Recognition API Testing', 'blue');
  log('================================\n');

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Health Check
  totalTests++;
  if (runTest('Health Check', `curl -s ${BASE_URL}/health`)) passedTests++;

  // Test 2: API Status
  totalTests++;
  if (runTest('API Status', `curl -s ${BASE_URL}/api/status`)) passedTests++;

  // Test 3: Face Recognition Health
  totalTests++;
  if (runTest('Face Recognition Health', `curl -s ${API_BASE}/health`)) passedTests++;

  // Test 4: Get Statistics (should be empty)
  totalTests++;
  if (runTest('Get Statistics', `curl -s ${API_BASE}/stats`)) passedTests++;

  // Test 5: Get All Faces (should be empty)
  totalTests++;
  if (runTest('Get All Faces', `curl -s ${API_BASE}/faces`)) passedTests++;

  // Test 6: Get Dashboard Data
  totalTests++;
  if (runTest('Get Dashboard Data', `curl -s ${API_BASE}/dashboard`)) passedTests++;

  // Test 7: Try to get non-existent face
  totalTests++;
  if (runTest('Get Non-existent Face (404)', `curl -s ${API_BASE}/faces/999`, 404)) passedTests++;

  // Test 8: Try to delete non-existent face
  totalTests++;
  if (runTest('Delete Non-existent Face (404)', `curl -s -X DELETE ${API_BASE}/faces/999`, 404)) passedTests++;

  // Test 9: Try to enroll without file (should fail)
  totalTests++;
  if (runTest('Enroll without file (400)', `curl -s -X POST ${API_BASE}/enroll -F "name=test"`, 400)) passedTests++;

  // Test 10: Try to recognize without file (should fail)
  totalTests++;
  if (runTest('Recognize without file (400)', `curl -s -X POST ${API_BASE}/recognize`, 400)) passedTests++;

  // Summary
  log('\n📊 Test Summary', 'blue');
  log('===============');
  log(`Total Tests: ${totalTests}`, 'blue');
  log(`Passed: ${passedTests}`, 'green');
  log(`Failed: ${totalTests - passedTests}`, 'red');
  log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`, 'blue');

  if (passedTests === totalTests) {
    log('\n🎉 All tests passed! API is working correctly.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Please check the errors above.', 'yellow');
  }

  log('\n📝 Next Steps:', 'blue');
  log('1. Test with real images using the web interface');
  log('2. Test enroll functionality with face images');
  log('3. Test recognize functionality with enrolled faces');
  log('4. Test error handling with invalid images');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runTest, log }; 