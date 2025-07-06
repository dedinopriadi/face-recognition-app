const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, '../../data/faces.db');

// Create database connection
const db = new sqlite3.Database(dbPath, err => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
    initDatabase();
  }
});

// Initialize database tables
function initDatabase() {
  db.serialize(() => {
    // Create faces table
    db.run(
      `
      CREATE TABLE IF NOT EXISTS faces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        descriptor TEXT NOT NULL,
        image_path TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
      err => {
        if (err) {
          console.error('Error creating faces table:', err.message);
        } else {
          console.log('✅ Faces table ready');
        }
      },
    );

    // Create indexes for faces table for performance
    db.run('CREATE INDEX IF NOT EXISTS idx_faces_created_at ON faces (created_at DESC)');

    // Create recognition_logs table for tracking
    db.run(
      `
      CREATE TABLE IF NOT EXISTS recognition_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        face_id INTEGER,
        confidence REAL,
        image_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (face_id) REFERENCES faces (id)
      )
    `,
      err => {
        if (err) {
          console.error('Error creating recognition_logs table:', err.message);
        } else {
          console.log('✅ Recognition logs table ready');
        }
      },
    );

    // Create index for recognition_logs for performance
    db.run('CREATE INDEX IF NOT EXISTS idx_logs_face_id ON recognition_logs (face_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_logs_created_at ON recognition_logs (created_at DESC)');
  });
}

// Helper functions for database operations
const dbHelpers = {
  // Insert new face
  insertFace: (name, descriptor, imagePath) => {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO faces (name, descriptor, image_path)
        VALUES (?, ?, ?)
      `);

      stmt.run([name, descriptor, imagePath], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({id: this.lastID, name, imagePath});
        }
      });

      stmt.finalize();
    });
  },

  // Get all faces
  getAllFaces: () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM faces ORDER BY created_at DESC', (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  },

  // Get face by ID
  getFaceById: id => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM faces WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },

  // Delete face by ID
  deleteFace: id => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM faces WHERE id = ?', [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({deleted: this.changes > 0});
        }
      });
    });
  },

  // Log recognition attempt
  logRecognition: (faceId, confidence, imagePath) => {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO recognition_logs (face_id, confidence, image_path)
        VALUES (?, ?, ?)
      `);

      stmt.run([faceId, confidence, imagePath], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({id: this.lastID});
        }
      });

      stmt.finalize();
    });
  },

  // Get recognition statistics
  getStats: () => {
    return new Promise((resolve, reject) => {
      db.get(
        `
        SELECT 
          COUNT(*) as total_faces,
          COUNT(DISTINCT face_id) as unique_faces_recognized,
          AVG(confidence) as avg_confidence
        FROM faces 
        LEFT JOIN recognition_logs ON faces.id = recognition_logs.face_id
      `,
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        },
      );
    });
  },
};

module.exports = {db, dbHelpers};
