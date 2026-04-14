require('dotenv').config();
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './gramsathi.db';
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL');
  }
  return db;
}

function initDb() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member','coordinator','bank_officer','admin')),
      aadhaar TEXT,
      is_active INTEGER DEFAULT 1,
      is_verified INTEGER DEFAULT 0,
      profile_image TEXT,
      preferred_language TEXT DEFAULT 'en',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS member_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      village TEXT DEFAULT '',
      gram_panchayat TEXT DEFAULT '',
      district TEXT DEFAULT '',
      state TEXT DEFAULT 'Telangana',
      pincode TEXT DEFAULT '',
      occupation TEXT DEFAULT '',
      annual_income REAL DEFAULT 0,
      bpl_card TEXT DEFAULT '',
      bank_account TEXT DEFAULT '',
      bank_ifsc TEXT DEFAULT '',
      bank_name TEXT DEFAULT '',
      shg_id INTEGER DEFAULT NULL,
      credit_score REAL DEFAULT 50,
      attendance_pct REAL DEFAULT 0,
      bio TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS shg_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      reg_number TEXT UNIQUE,
      village TEXT DEFAULT '',
      district TEXT DEFAULT '',
      state TEXT DEFAULT 'Telangana',
      coordinator_id INTEGER REFERENCES users(id),
      formed_date TEXT DEFAULT (date('now')),
      total_savings REAL DEFAULT 0,
      total_members INTEGER DEFAULT 0,
      bank_linked INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_number TEXT UNIQUE NOT NULL,
      applicant_id INTEGER NOT NULL REFERENCES users(id),
      shg_group_id INTEGER REFERENCES shg_groups(id),
      coordinator_id INTEGER REFERENCES users(id),
      officer_id INTEGER REFERENCES users(id),
      amount REAL NOT NULL,
      purpose TEXT NOT NULL,
      duration_months INTEGER DEFAULT 12,
      interest_rate REAL DEFAULT 7.0,
      collateral TEXT DEFAULT 'None',
      bank_passbook_path TEXT,
      aadhaar_path TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','coordinator_review','officer_review','approved','rejected','disbursed','closed')),
      ai_credit_score REAL DEFAULT 50,
      ai_recommendation TEXT DEFAULT '',
      coordinator_remarks TEXT DEFAULT '',
      officer_remarks TEXT DEFAULT '',
      rejection_reason TEXT DEFAULT '',
      disbursement_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS repayments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
      month_number INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      paid_date TEXT,
      emi_amount REAL NOT NULL,
      principal REAL NOT NULL,
      interest_amount REAL NOT NULL,
      is_paid INTEGER DEFAULT 0,
      late_fee REAL DEFAULT 0,
      receipt_number TEXT
    );
    CREATE TABLE IF NOT EXISTS savings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL REFERENCES users(id),
      amount REAL NOT NULL,
      transaction_type TEXT NOT NULL CHECK(transaction_type IN ('deposit','withdrawal')),
      balance_after REAL NOT NULL,
      transaction_date TEXT DEFAULT (date('now')),
      notes TEXT DEFAULT '',
      receipt_number TEXT UNIQUE NOT NULL,
      recorded_by INTEGER REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      description TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS member_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL REFERENCES users(id),
      skill_id INTEGER NOT NULL REFERENCES skills(id),
      proficiency TEXT DEFAULT 'beginner' CHECK(proficiency IN ('beginner','intermediate','advanced')),
      years_experience REAL DEFAULT 0,
      certificate_url TEXT DEFAULT '',
      added_at TEXT DEFAULT (datetime('now')),
      UNIQUE(member_id, skill_id)
    );
    CREATE TABLE IF NOT EXISTS training_programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      provider TEXT DEFAULT '',
      mode TEXT DEFAULT 'offline' CHECK(mode IN ('offline','online','hybrid')),
      duration_days INTEGER DEFAULT 1,
      start_date TEXT,
      location TEXT DEFAULT '',
      max_participants INTEGER DEFAULT 20,
      enrolled_count INTEGER DEFAULT 0,
      is_free INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS training_enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL REFERENCES training_programs(id),
      member_id INTEGER NOT NULL REFERENCES users(id),
      enrolled_at TEXT DEFAULT (datetime('now')),
      status TEXT DEFAULT 'enrolled' CHECK(status IN ('enrolled','completed','cancelled')),
      UNIQUE(program_id, member_id)
    );
    CREATE TABLE IF NOT EXISTS government_schemes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      ministry TEXT DEFAULT '',
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      benefits TEXT NOT NULL,
      eligibility_criteria TEXT DEFAULT '{}',
      required_documents TEXT DEFAULT '[]',
      application_url TEXT DEFAULT '',
      max_benefit_amount REAL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS scheme_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scheme_id INTEGER NOT NULL REFERENCES government_schemes(id),
      applicant_id INTEGER NOT NULL REFERENCES users(id),
      application_number TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','under_review','approved','rejected')),
      form_data TEXT DEFAULT '{}',
      ai_eligibility_score REAL DEFAULT 75,
      submission_date TEXT DEFAULT (datetime('now')),
      approval_date TEXT,
      remarks TEXT DEFAULT '',
      UNIQUE(scheme_id, applicant_id)
    );
    CREATE TABLE IF NOT EXISTS health_queries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      query_text TEXT NOT NULL,
      response TEXT DEFAULT '',
      category TEXT DEFAULT 'general',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      ai_description TEXT DEFAULT '',
      price REAL NOT NULL,
      stock INTEGER DEFAULT 0,
      category TEXT NOT NULL,
      image_emoji TEXT DEFAULT '📦',
      tags TEXT DEFAULT '[]',
      is_active INTEGER DEFAULT 1,
      total_sold INTEGER DEFAULT 0,
      rating REAL DEFAULT 0,
      rating_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      buyer_id INTEGER REFERENCES users(id),
      buyer_name TEXT NOT NULL,
      buyer_phone TEXT NOT NULL,
      buyer_address TEXT NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'placed' CHECK(status IN ('placed','confirmed','shipped','delivered','cancelled')),
      payment_method TEXT DEFAULT 'cod',
      payment_status TEXT DEFAULT 'pending',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'system' CHECK(type IN ('loan','scheme','order','training','health','system','savings')),
      is_read INTEGER DEFAULT 0,
      reference_id INTEGER,
      reference_type TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      resource TEXT DEFAULT '',
      resource_id INTEGER,
      details TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      message TEXT NOT NULL,
      response TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_loans_applicant ON loans(applicant_id);
    CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
    CREATE INDEX IF NOT EXISTS idx_savings_member ON savings(member_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active, category);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  `);
  seedData(db);
  try {
    // Ensure `images` column exists on products for storing uploaded image URLs as JSON array
    const cols = db.prepare("PRAGMA table_info('products')").all();
    if (!cols.find(c => c.name === 'images')) {
      db.prepare("ALTER TABLE products ADD COLUMN images TEXT DEFAULT '[]'").run();
    }
  } catch (e) { console.warn('Could not add images column:', e.message) }
  try {
    // Ensure loan document columns exist (for databases created before these were added)
    const loanCols = db.prepare("PRAGMA table_info('loans')").all().map(r => r.name);
    if (!loanCols.includes('bank_passbook_path')) db.prepare("ALTER TABLE loans ADD COLUMN bank_passbook_path TEXT").run();
    if (!loanCols.includes('aadhaar_path')) db.prepare("ALTER TABLE loans ADD COLUMN aadhaar_path TEXT").run();
  } catch (e) { console.warn('Could not add loan document columns:', e.message) }
  try {
    // Ensure TTS preference columns exist on users
    const ucols = db.prepare("PRAGMA table_info('users')").all().map(r => r.name);
    if (!ucols.includes('tts_speaker')) db.prepare("ALTER TABLE users ADD COLUMN tts_speaker TEXT DEFAULT NULL").run();
    if (!ucols.includes('tts_emotion')) db.prepare("ALTER TABLE users ADD COLUMN tts_emotion TEXT DEFAULT NULL").run();
  } catch (e) { console.warn('Could not add tts columns:', e.message) }
  return db;
}

function addNotification(db, userId, title, message, type = 'system', refId = null, refType = '') {
  try {
    return db.prepare('INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type) VALUES (?,?,?,?,?,?)').run(userId, title, message, type, refId, refType).lastInsertRowid;
  } catch(e) { return null; }
}

function seedData(db) {
  const existing = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (existing.c > 0) return;
  console.log('🌱 Seeding database...');

  const hash = (p) => bcrypt.hashSync(p, 10);

  // Admin
  const adminId = db.prepare(`INSERT INTO users (full_name,phone,email,password_hash,role,is_active,is_verified) VALUES (?,?,?,?,?,1,1)`)
    .run('System Admin','9000000000','admin@gramsathi.in',hash('Admin@123'),'admin').lastInsertRowid;
  db.prepare(`INSERT INTO member_profiles (user_id,village,district,state) VALUES (?,?,?,?)`).run(adminId,'Hyderabad','Hyderabad','Telangana');

  // Coordinator
  const coordId = db.prepare(`INSERT INTO users (full_name,phone,email,password_hash,role,is_active,is_verified) VALUES (?,?,?,?,?,1,1)`)
    .run('Raju Sharma','9222222222','raju@gramsathi.in',hash('Coord@123'),'coordinator').lastInsertRowid;
  db.prepare(`INSERT INTO member_profiles (user_id,village,district,state,occupation) VALUES (?,?,?,?,?)`).run(coordId,'Karimnagar','Karimnagar','Telangana','SHG Coordinator');

  // Bank Officer
  const bankId = db.prepare(`INSERT INTO users (full_name,phone,email,password_hash,role,is_active,is_verified) VALUES (?,?,?,?,?,1,1)`)
    .run('Priya Nair','9333333333','priya@gramsathi.in',hash('Bank@123'),'bank_officer').lastInsertRowid;
  db.prepare(`INSERT INTO member_profiles (user_id,state) VALUES (?,?)`).run(bankId,'Telangana');

  // SHG Group
  const shgId = db.prepare(`INSERT INTO shg_groups (name,reg_number,village,district,coordinator_id,formed_date,total_savings,total_members,bank_linked,is_active) VALUES (?,?,?,?,?,?,?,?,?,1)`)
    .run('Shakti Mahila SHG','SHG/TG/NLG/2021/001','Nalgonda','Nalgonda',coordId,'2021-06-15',482000,15,1).lastInsertRowid;

  // Members
  const members = [
    ['Savitha Devi','9111111111','savitha@gramsathi.in','Member@123','Nalgonda','Nalgonda',74,88,'Tailoring',96000],
    ['Radha Bai','9444444444','radha@gramsathi.in','Member@123','Warangal','Warangal',68,78,'Handicrafts',72000],
    ['Meena Kumari','9555555555','meena@gramsathi.in','Member@123','Khammam','Khammam',81,92,'Food Processing',108000],
    ['Fatima Begum','9666666666','fatima@gramsathi.in','Member@123','Nizamabad','Nizamabad',59,65,'Animal Husbandry',60000],
    ['Lakshmi Rao','9777777777','lakshmi@gramsathi.in','Member@123','Karimnagar','Karimnagar',88,95,'Agriculture',132000],
    ['Sunita Devi','9888888888','sunita@gramsathi.in','Member@123','Adilabad','Adilabad',62,70,'Bamboo Craft',54000],
    ['Kamala Bai','9999999991','kamala@gramsathi.in','Member@123','Medak','Medak',71,82,'Embroidery',84000],
  ];
  const memberIds = {};
  for (const [name,phone,email,pwd,village,district,credit,att,occ,income] of members) {
    const uid = db.prepare(`INSERT INTO users (full_name,phone,email,password_hash,role,is_active,is_verified) VALUES (?,?,?,?,?,1,1)`)
      .run(name,phone,email,hash(pwd),'member').lastInsertRowid;
    db.prepare(`INSERT INTO member_profiles (user_id,village,district,state,occupation,annual_income,credit_score,attendance_pct,shg_id) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(uid,village,district,'Telangana',occ,income,credit,att,shgId);
    memberIds[phone] = uid;
  }
  const savithaId = memberIds['9111111111'];
  const meenaId = memberIds['9555555555'];
  const fatimId = memberIds['9666666666'];

  // Skills
  const skills = [
    ['Tailoring','Textile'],['Embroidery','Textile'],['Knitting','Textile'],['Weaving','Textile'],
    ['Cooking','Food'],['Food Processing','Food'],['Baking','Food'],['Pickle Making','Food'],
    ['Beekeeping','Agriculture'],['Animal Husbandry','Agriculture'],['Mushroom Farming','Agriculture'],['Vegetable Farming','Agriculture'],
    ['Bamboo Work','Crafts'],['Pottery','Crafts'],['Basket Weaving','Crafts'],
    ['Computer Basics','Digital'],['Digital Payments','Digital'],['Basic Accounting','Finance'],
  ];
  const skillStmt = db.prepare('INSERT INTO skills (name,category) VALUES (?,?)');
  const skillIds = {};
  for (const [name,cat] of skills) { const id=skillStmt.run(name,cat).lastInsertRowid; skillIds[name]=id; }

  // Member skills
  db.prepare('INSERT INTO member_skills (member_id,skill_id,proficiency,years_experience) VALUES (?,?,?,?)').run(savithaId,skillIds['Tailoring'],'intermediate',3);
  db.prepare('INSERT INTO member_skills (member_id,skill_id,proficiency,years_experience) VALUES (?,?,?,?)').run(savithaId,skillIds['Embroidery'],'advanced',5);
  db.prepare('INSERT INTO member_skills (member_id,skill_id,proficiency,years_experience) VALUES (?,?,?,?)').run(meenaId,skillIds['Food Processing'],'intermediate',2);
  db.prepare('INSERT INTO member_skills (member_id,skill_id,proficiency,years_experience) VALUES (?,?,?,?)').run(meenaId,skillIds['Cooking'],'advanced',6);

  // Training programs
  const trainings = [
    ['Advanced Tailoring & Pattern Making','30-day intensive tailoring course covering modern techniques, pattern making and quality finishing','NRLM Telangana','offline',30,'2026-03-25','Nalgonda District Office',20,1],
    ['Digital Payments & UPI for SHGs','Learn UPI, QR codes, digital bookkeeping and online banking for SHG operations','Google Digi Unnati','online',7,'2026-03-20',null,50,1],
    ['Organic Food Processing & FSSAI Certification','Food safety, FSSAI licensing, packaging and marketing of processed food products','FSSAI Regional Center','offline',14,'2026-04-01','Hyderabad',15,1],
    ['Mushroom Cultivation Intensive','Complete A-Z mushroom farming — substrate, spawn, harvesting, packaging and marketing','Agriculture Dept TG','offline',5,'2026-04-10','Karimnagar ATMA',12,1],
    ['Financial Literacy & SHG Management','Savings, loans, interest calculation, digital ledger and banking for SHG leaders','NABARD','online',3,'2026-03-28',null,40,1],
    ['Bamboo & Cane Craft Mastery','Traditional crafts modernized for export markets — baskets, furniture, decor items','Tribal Welfare Dept','offline',21,'2026-04-15','Adilabad',10,1],
  ];
  const tStmt = db.prepare('INSERT INTO training_programs (title,description,provider,mode,duration_days,start_date,location,max_participants,is_free,is_active) VALUES (?,?,?,?,?,?,?,?,?,1)');
  for (const t of trainings) tStmt.run(...t);

  // Government schemes
  const schemes = [
    ['PM Jan Dhan Yojana','Ministry of Finance','Finance','Financial inclusion scheme providing zero balance savings accounts with accident insurance.','Zero balance savings account + ₹1 lakh accident insurance + ₹30,000 life insurance + RuPay debit card + overdraft up to ₹10,000','{"age_min":18,"citizenship":"Indian"}','["Aadhaar Card","Photograph","Address Proof"]','https://pmjdy.gov.in',null],
    ['MUDRA Yojana – Shishu','Ministry of Finance','Business','Micro credit for small business entrepreneurs without collateral requirements.','Collateral-free business loan up to ₹50,000 at subsidized interest rate through bank or MFI','{"age_min":18,"purpose":"business"}','["Aadhaar","Business Proof","Bank Statement","Photo"]','https://mudra.org.in',50000],
    ['PM Awas Yojana (Gramin)','Ministry of Rural Development','Housing','Financial assistance to construct pucca houses with basic amenities for rural BPL families.','₹1.30 lakh for house construction + convergence with MGNREGS for 90-95 days labour','{"bpl":true,"rural":true}','["Aadhaar","BPL Card","Land Documents","Bank Account"]','https://pmayg.nic.in',130000],
    ['National Rural Livelihood Mission','Ministry of Rural Development','Livelihood','Poverty alleviation through SHG formation, capacity building, skill training and credit linkage.','SHG revolving fund ₹15,000 + community investment fund + free skill training + bank credit linkage + interest subvention','{"shg_member":true,"rural":true}','["Aadhaar","SHG Certificate","Bank Passbook"]','https://aajeevika.gov.in',15000],
    ['Sukanya Samriddhi Yojana','Ministry of Finance','Savings','High-interest government savings scheme for girl child education and marriage expenses.','8.2% interest rate + tax benefits under Section 80C + maturity at age 21 or on marriage after 18','{"girl_child":true,"age_max":10}','["Girl Birth Certificate","Parent Aadhaar","Address Proof"]',null,null],
    ['PM Fasal Bima Yojana','Ministry of Agriculture','Agriculture','Comprehensive crop insurance at very low premium for all notified crops against natural calamities.','Full sum insured: Kharif @2% premium, Rabi @1.5%, commercial crops @5%','{"farmer":true}','["Land Records","Aadhaar","Bank Account","Sowing Certificate"]','https://pmfby.gov.in',null],
    ['MGNREGA Employment Guarantee','Ministry of Rural Development','Employment','Legally guaranteed 100 days of wage employment to adult rural household members.','100 days guaranteed work @ ₹267/day (Telangana) + unemployment allowance if work not given in 15 days','{"rural":true,"age_min":18}','["Job Card","Aadhaar","Bank Account"]','https://nrega.nic.in',null],
    ['Janani Suraksha Yojana','Ministry of Health','Health','Safe motherhood initiative promoting institutional delivery with cash incentive for pregnant women.','₹1,400 cash for rural delivery + ₹600 ASHA incentive + free medicines + free transport under JSSK','{"pregnant":true}','["Aadhaar","ANC Card","Bank Account"]',null,1400],
    ['PM Kisan Samman Nidhi','Ministry of Agriculture','Agriculture','Direct income support of ₹6,000/year in 3 installments to small and marginal farmer families.','₹6,000/year directly to bank in 3 installments of ₹2,000 each','{"farmer":true,"land":"small_marginal"}','["Land Records","Aadhaar","Bank Account"]','https://pmkisan.gov.in',6000],
    ['Stand Up India','Ministry of Finance','Business','Bank loans to SC/ST and women entrepreneurs for greenfield enterprise setup.','Composite loan ₹10 lakh–₹1 crore at low interest + 7 year repayment + credit guarantee','{"woman_or_sc_st":true,"greenfield":true}','["Aadhaar","Business Plan","Caste/Gender Cert","Bank Statement"]','https://standupmitra.in',10000000],
  ];
  const schStmt = db.prepare('INSERT INTO government_schemes (name,ministry,category,description,benefits,eligibility_criteria,required_documents,application_url,max_benefit_amount) VALUES (?,?,?,?,?,?,?,?,?)');
  for (const s of schemes) schStmt.run(...s);

  // Products
  const products = [
    [savithaId,'🧣','Handwoven Silk Scarf','Beautiful handwoven silk scarf with traditional motifs, crafted by skilled artisans in Nalgonda.',480,25,'Textiles','["handmade","silk","traditional","ethnic"]'],
    [savithaId,'🪡','Embroidered Dupatta','Exquisite hand-embroidered dupatta with Pochampally-inspired geometric patterns.',650,15,'Textiles','["embroidery","dupatta","handmade"]'],
    [meenaId,'🍯','Forest Honey 500g','Pure wild forest honey harvested from the natural forests of Adilabad. No additives.',220,40,'Food','["organic","honey","natural","forest"]'],
    [meenaId,'🌶️','Organic Chilli Powder 200g','Sun-dried and stone-ground organic red chillies from certified organic farms.',95,60,'Food','["organic","spices","chilli","natural"]'],
    [memberIds['9666666666'],'🧺','Bamboo Storage Basket','Eco-friendly handcrafted bamboo basket, perfect for storage and home decor.',250,30,'Crafts','["bamboo","eco-friendly","handmade","storage"]'],
    [memberIds['9666666666'],'🏺','Hand-Painted Clay Pot','Traditional hand-painted terracotta pot with tribal motifs, ideal for plants.',180,20,'Crafts','["pottery","clay","traditional","tribal"]'],
    [memberIds['9888888888'],'🪔','Decorative Diya Set (12pcs)','Handmade clay diyas with natural colours, perfect for festivals and gifting.',150,50,'Crafts','["diya","clay","festival","handmade"]'],
    [memberIds['9999999991'],'🛍️','Handmade Jute Shopping Bag','Sturdy and eco-friendly jute bag with embroidered floral design.',120,35,'Crafts','["jute","eco-friendly","bag","embroidery"]'],
    [savithaId,'🧴','Neem & Turmeric Soap','Natural handmade soap with neem and turmeric for skin care. No chemicals.',80,80,'Wellness','["natural","soap","neem","turmeric","handmade"]'],
    [meenaId,'🥜','Mixed Dry Fruit Ladoo (500g)','Nutritious traditional ladoos made from dry fruits, jaggery and ghee. No sugar.',350,25,'Food','["sweets","traditional","nutritious","jaggery"]'],
  ];
  const prodStmt = db.prepare('INSERT INTO products (seller_id,image_emoji,name,description,ai_description,price,stock,category,tags) VALUES (?,?,?,?,?,?,?,?,?)');
  for (const p of products) prodStmt.run(p[0],p[1],p[2],p[3],`Premium quality ${p[2]} handcrafted by skilled rural women artisans. ${p[3]} Supporting rural livelihoods since 2021.`,p[4],p[5],p[6],p[7]);

  // Savings history for Savitha (12 months)
  const now = new Date();
  let balance = 0;
  const sStmt = db.prepare('INSERT INTO savings (member_id,amount,transaction_type,balance_after,transaction_date,receipt_number,recorded_by) VALUES (?,?,?,?,?,?,?)');
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now); d.setMonth(d.getMonth() - i);
    const amt = i === 7 ? 800 : 1200;
    balance += amt;
    sStmt.run(savithaId, amt, 'deposit', balance, d.toISOString().slice(0,10), `RCP-${1000+i}`, coordId);
  }
  // Savings for other members
  for (const [phone, uid] of Object.entries(memberIds)) {
    if (uid === savithaId) continue;
    let bal = 0;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setMonth(d.getMonth() - i);
      bal += 1000;
      sStmt.run(uid, 1000, 'deposit', bal, d.toISOString().slice(0,10), `RCP-${uid}-${i}`, coordId);
    }
  }

  // Active loan for Savitha with repayment schedule
  const loanId = db.prepare(`INSERT INTO loans (loan_number,applicant_id,amount,purpose,duration_months,interest_rate,status,ai_credit_score,ai_recommendation,coordinator_id) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run('GS-LOAN-202603-SAVITHA',savithaId,25000,'Purchase of industrial sewing machine and fabric stock for expanding tailoring business',12,7.0,'officer_review',74,'Good candidate. 12 months savings history. Recommend approval with standard terms.',coordId).lastInsertRowid;
  const P=25000,r=7/100/12,n=12, emi=P*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);
  let lBal=P;
  const rStmt=db.prepare('INSERT INTO repayments (loan_id,month_number,due_date,emi_amount,principal,interest_amount,is_paid,paid_date,receipt_number) VALUES (?,?,?,?,?,?,?,?,?)');
  for(let i=1;i<=n;i++){
    const int=lBal*r, prin=emi-int; lBal-=prin;
    const dDate=new Date(now); dDate.setMonth(dDate.getMonth()+i-3);
    const paid=i<=2?1:0;
    rStmt.run(loanId,i,dDate.toISOString().slice(0,10),parseFloat(emi.toFixed(2)),parseFloat(prin.toFixed(2)),parseFloat(int.toFixed(2)),paid,paid?dDate.toISOString().slice(0,10):null,paid?`EMI-RCP-${loanId}-${i}`:null);
  }

  // Pending loan for Fatima (waiting coordinator review)
  db.prepare(`INSERT INTO loans (loan_number,applicant_id,amount,purpose,duration_months,status,ai_credit_score,ai_recommendation) VALUES (?,?,?,?,?,?,?,?)`)
    .run('GS-LOAN-202603-FATIMA',fatimId,15000,'Purchase of two goats to start goat rearing livelihood activity',18,'pending',59,'Moderate risk. Savings consistency needs improvement. Suggest smaller amount initially.');

  // Pending loan for Meena
  db.prepare(`INSERT INTO loans (loan_number,applicant_id,amount,purpose,duration_months,status,ai_credit_score,ai_recommendation) VALUES (?,?,?,?,?,?,?,?)`)
    .run('GS-LOAN-202603-MEENA',meenaId,40000,'Setting up food processing unit with FSSAI certification for pickle and papad making',24,'coordinator_review',81,'Strong candidate. Excellent savings and attendance. Recommend full approval.');

  // Notifications for Savitha
  addNotification(db, savithaId, 'Loan Under Bank Review', 'Your loan application #GS-LOAN-202603-SAVITHA for ₹25,000 is now with Bank Officer for final review.', 'loan', loanId, 'loan');
  addNotification(db, savithaId, 'New Scheme Match!', 'AI found 3 government schemes matching your profile: MUDRA Yojana, NRLM, PM Jan Dhan Yojana.', 'scheme', null, '');
  addNotification(db, savithaId, 'Training Program Available', 'Advanced Tailoring program starts March 25th at Nalgonda. Only 8 spots remaining. Enroll now!', 'training', null, '');
  addNotification(db, coordId, 'New Loan Application', 'Fatima Begum has applied for a ₹15,000 loan. Please review and forward to bank officer.', 'loan', 2, 'loan');
  addNotification(db, bankId, 'Loan Awaiting Approval', 'Savitha Devi\'s loan #GS-LOAN-202603-SAVITHA for ₹25,000 is awaiting your approval. Credit score: 74/100.', 'loan', loanId, 'loan');

  console.log('✅ Seed data complete. Demo accounts: Admin(9000000000/Admin@123), Member(9111111111/Member@123), Coordinator(9222222222/Coord@123), Bank(9333333333/Bank@123)');
}

module.exports = { getDb, initDb, addNotification };
