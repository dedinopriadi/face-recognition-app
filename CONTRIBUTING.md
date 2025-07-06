# Contributing to Face Recognition App

Thank you for your interest in contributing to the Face Recognition App! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)
- [Security Issues](#security-issues)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a new branch for your feature/fix
4. Make your changes
5. Test your changes
6. Submit a pull request

## Development Setup

### Prerequisites

- Node.js 18.x or higher
- npm 8.x or higher
- Git
- Docker (optional, for containerized development)

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/face-recognition-app.git
cd face-recognition-app

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_PATH=./data/face_recognition.db

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Security
SESSION_SECRET=your-session-secret
JWT_SECRET=your-jwt-secret

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Logging
LOG_LEVEL=debug
```

## Making Changes

### Branch Naming Convention

Use descriptive branch names:

- `feature/face-detection-improvement`
- `fix/confidence-calculation-bug`
- `docs/api-documentation-update`
- `refactor/controller-structure`

### Code Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Express middleware
├── routes/          # Route definitions
├── services/        # Business logic
├── utils/           # Utility functions
├── views/           # EJS templates
└── server.js        # Main application file
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/faceController.test.js
```

### Writing Tests

- Write tests for all new features
- Maintain test coverage above 70%
- Use descriptive test names
- Test both success and failure scenarios

Example test structure:

```javascript
describe('Face Recognition Service', () => {
  describe('detectFaces', () => {
    it('should detect faces in valid image', async () => {
      // Test implementation
    });

    it('should return empty array for image without faces', async () => {
      // Test implementation
    });

    it('should throw error for invalid image', async () => {
      // Test implementation
    });
  });
});
```

## Pull Request Process

1. **Create a feature branch** from `develop`
2. **Make your changes** following the code style guidelines
3. **Write/update tests** for your changes
4. **Run the test suite** and ensure all tests pass
5. **Update documentation** if needed
6. **Commit your changes** using conventional commit messages
7. **Push to your fork** and create a pull request
8. **Wait for review** and address any feedback

### PR Checklist

- [ ] Code follows the style guidelines
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] No console.log statements in production code
- [ ] Security considerations are addressed
- [ ] Performance impact is considered

## Code Style

### JavaScript/Node.js

- Use ES6+ features
- Follow ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for public functions
- Keep functions small and focused

### Example

```javascript
/**
 * Detects faces in the provided image
 * @param {Buffer} imageBuffer - The image buffer to process
 * @returns {Promise<Array>} Array of detected faces
 */
async function detectFaces(imageBuffer) {
  try {
    const faces = await faceapi.detectAllFaces(imageBuffer);
    return faces.map(face => ({
      confidence: face.confidence,
      box: face.box
    }));
  } catch (error) {
    logger.error('Face detection failed:', error);
    throw new Error('Face detection failed');
  }
}
```

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### Examples

```bash
feat: add face recognition API endpoint
fix(auth): resolve session validation issue
docs: update API documentation
style: format code according to prettier
refactor(services): extract face detection logic
perf: optimize image processing pipeline
test: add unit tests for face controller
chore: update dependencies
```

## Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates.

### Bug Report Template

- **Description**: Clear and concise description of the bug
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Expected Behavior**: What you expected to happen
- **Actual Behavior**: What actually happened
- **Environment**: OS, browser, Node.js version, etc.
- **Screenshots**: If applicable
- **Logs**: Any error messages or console output

## Feature Requests

We welcome feature requests! Please:

1. Check existing issues to avoid duplicates
2. Provide a clear description of the feature
3. Explain the use case and benefits
4. Suggest implementation ideas if possible

## Security Issues

If you discover a security vulnerability, please:

1. **Do not** create a public issue
2. Email the maintainers directly
3. Provide detailed information about the vulnerability
4. Allow time for assessment and response

## Getting Help

- Check the [README.md](README.md) for basic information
- Search existing [issues](https://github.com/dedinopriadi/face-recognition-app/issues)
- Create a new issue for bugs or feature requests
- Join our discussions for general questions

## Recognition

Contributors will be recognized in:

- The project README
- Release notes
- GitHub contributors page

Thank you for contributing to the Face Recognition App! 🚀 