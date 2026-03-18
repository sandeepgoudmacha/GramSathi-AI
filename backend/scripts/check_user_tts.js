const path = require('path');
const { getDb } = require(path.resolve(__dirname, '..', 'db', 'database'));
const db = getDb();
const uid = process.argv[2] ? Number(process.argv[2]) : 14;
const row = db.prepare('SELECT id,full_name,tts_speaker,tts_emotion FROM users WHERE id=?').get(uid);
console.log(JSON.stringify(row, null, 2));
