const db = require('../db/database').getDb();
const { generateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
(async ()=>{
  try{
    let u = db.prepare('SELECT * FROM users WHERE phone=?').get('9999999999');
    if(!u){
      const hash = bcrypt.hashSync('pass',8);
      const r = db.prepare('INSERT INTO users (full_name,phone,email,password_hash,role,preferred_language) VALUES (?,?,?,?,?,?)').run('Dev User','9999999999','dev@example.com',hash,'admin','en');
      u = db.prepare('SELECT * FROM users WHERE id=?').get(r.lastInsertRowid);
    }
    console.log(generateToken(u.id,u.role));
  }catch(e){ console.error(e); process.exit(1) }
})();
