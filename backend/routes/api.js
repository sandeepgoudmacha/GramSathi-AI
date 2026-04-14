require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb, addNotification } = require('../db/database');
const { generateToken, generateRefreshToken, verifyToken, authenticate, requireMember, requireCoordinator, requireBankOfficer, requireAdmin } = require('../middleware/auth');
const { getAIResponse, getHealthResponse, genProductDesc } = require('../services/aiService');
const { getCreditScore, getLivelihoods } = require('../services/mlService');
const { pushToUser } = require('../services/wsService');
const router = express.Router();
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({ storage: multer.diskStorage({ destination: UPLOAD_DIR, filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`) }), limits: { fileSize: 10 * 1024 * 1024 } });
function audit(db, uid, action, resource, rid, details='') { try { db.prepare('INSERT INTO audit_logs (user_id,action,resource,resource_id,details) VALUES (?,?,?,?,?)').run(uid,action,resource,rid||null,details); } catch {} }
function notify(db, uid, title, msg, type='system', rid=null, rtype='') { const id=addNotification(db,uid,title,msg,type,rid,rtype); pushToUser(uid,{type:'notification',notification:{id,title,message:msg,type,is_read:0,reference_id:rid,created_at:new Date().toISOString()}}); return id; }
function safe(u) { if (!u) return null; const {password_hash,...r}=u; return r; }
function genEMI(amt, rate, months) { const r=rate/100/12; const emi=r>0?amt*r*Math.pow(1+r,months)/(Math.pow(1+r,months)-1):amt/months; const s=[]; let b=amt; for(let i=1;i<=months;i++){const int=b*r,prin=emi-int;b-=prin;const d=new Date();d.setMonth(d.getMonth()+i);s.push({month:i,due_date:d.toISOString().slice(0,10),emi:parseFloat(emi.toFixed(2)),principal:parseFloat(prin.toFixed(2)),interest:parseFloat(int.toFixed(2))});} return s; }
// AUTH
router.post('/auth/register',(req,res)=>{ try{ const {full_name,phone,password,email,village,district,state='Telangana',occupation,aadhaar}=req.body; if(!full_name?.trim())return res.status(400).json({detail:'Full name required'}); if(!phone||!/^[6-9]\d{9}$/.test(phone))return res.status(400).json({detail:'Valid 10-digit mobile number required'}); if(!password||password.length<8)return res.status(400).json({detail:'Password must be at least 8 characters'}); const db=getDb(); if(db.prepare('SELECT id FROM users WHERE phone=?').get(phone))return res.status(409).json({detail:'Phone number already registered'}); if(email&&db.prepare('SELECT id FROM users WHERE email=?').get(email))return res.status(409).json({detail:'Email already registered'}); const hash=bcrypt.hashSync(password,12); const uid=db.prepare('INSERT INTO users (full_name,phone,email,password_hash,aadhaar) VALUES (?,?,?,?,?)').run(full_name.trim(),phone,email||null,hash,aadhaar||null).lastInsertRowid; db.prepare('INSERT INTO member_profiles (user_id,village,district,state,occupation) VALUES (?,?,?,?,?)').run(uid,village||'',district||'',state,occupation||''); notify(db,uid,'🌱 Welcome to GramSathi AI!',`Welcome ${full_name}! Your account is ready. Explore government schemes, apply for loans, and sell on marketplace.`,'system'); audit(db,uid,'register','user',uid); res.status(201).json({message:'Account created successfully',user:safe(db.prepare('SELECT * FROM users WHERE id=?').get(uid))}); }catch(e){console.error(e);res.status(500).json({detail:'Registration failed: '+e.message});} });
router.post('/auth/login',(req,res)=>{ try{ const {phone,password}=req.body; if(!phone||!password)return res.status(400).json({detail:'Phone and password required'}); const db=getDb(); const user=db.prepare('SELECT * FROM users WHERE phone=?').get(phone); if(!user||!bcrypt.compareSync(password,user.password_hash))return res.status(401).json({detail:'Invalid phone number or password'}); if(!user.is_active)return res.status(403).json({detail:'Account deactivated. Contact admin.'}); const profile=db.prepare('SELECT * FROM member_profiles WHERE user_id=?').get(user.id); const shg=profile?.shg_id?db.prepare('SELECT * FROM shg_groups WHERE id=?').get(profile.shg_id):null; audit(db,user.id,'login','user',user.id); res.json({access_token:generateToken(user.id,user.role),refresh_token:generateRefreshToken(user.id),token_type:'bearer',user:safe(user),profile,shg}); }catch(e){res.status(500).json({detail:e.message});} });
router.post('/auth/refresh',(req,res)=>{ try{ const {refresh_token}=req.body; if(!refresh_token)return res.status(400).json({detail:'Refresh token required'}); const p=verifyToken(refresh_token); if(p.type!=='refresh')return res.status(401).json({detail:'Not a refresh token'}); const user=getDb().prepare('SELECT * FROM users WHERE id=? AND is_active=1').get(Number(p.sub)); if(!user)return res.status(401).json({detail:'User not found'}); res.json({access_token:generateToken(user.id,user.role),token_type:'bearer'}); }catch{res.status(401).json({detail:'Invalid or expired refresh token'});} });
router.get('/auth/me',authenticate,(req,res)=>{ const db=getDb(); const profile=db.prepare('SELECT * FROM member_profiles WHERE user_id=?').get(req.user.id); const shg=profile?.shg_id?db.prepare('SELECT * FROM shg_groups WHERE id=?').get(profile.shg_id):null; res.json({...safe(req.user),profile,shg}); });
router.put('/profile',authenticate,(req,res)=>{ try{ const db=getDb(); const {full_name,email,preferred_language,village,gram_panchayat,district,state,pincode,occupation,annual_income,bank_account,bank_ifsc,bank_name,bio,aadhaar,tts_speaker,tts_emotion}=req.body; if(full_name)db.prepare("UPDATE users SET full_name=?,updated_at=datetime('now') WHERE id=?").run(full_name.trim(),req.user.id); if(email!==undefined)db.prepare("UPDATE users SET email=? WHERE id=?").run(email||null,req.user.id); if(preferred_language)db.prepare('UPDATE users SET preferred_language=? WHERE id=?').run(preferred_language,req.user.id); if(aadhaar)db.prepare('UPDATE users SET aadhaar=? WHERE id=?').run(aadhaar,req.user.id); if(tts_speaker!==undefined) db.prepare('UPDATE users SET tts_speaker=? WHERE id=?').run(tts_speaker||null, req.user.id); if(tts_emotion!==undefined) db.prepare('UPDATE users SET tts_emotion=? WHERE id=?').run(tts_emotion||null, req.user.id); db.prepare("UPDATE member_profiles SET village=COALESCE(?,village),gram_panchayat=COALESCE(?,gram_panchayat),district=COALESCE(?,district),state=COALESCE(?,state),pincode=COALESCE(?,pincode),occupation=COALESCE(?,occupation),annual_income=COALESCE(?,annual_income),bank_account=COALESCE(?,bank_account),bank_ifsc=COALESCE(?,bank_ifsc),bank_name=COALESCE(?,bank_name),bio=COALESCE(?,bio),updated_at=datetime('now') WHERE user_id=?").run(village||null,gram_panchayat||null,district||null,state||null,pincode||null,occupation||null,annual_income||null,bank_account||null,bank_ifsc||null,bank_name||null,bio||null,req.user.id); res.json({user:safe(db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id)),profile:db.prepare('SELECT * FROM member_profiles WHERE user_id=?').get(req.user.id)}); }catch(e){res.status(500).json({detail:e.message});} });
// DASHBOARD
router.get('/dashboard/member',...requireMember,(req,res)=>{ try{ const db=getDb(),uid=req.user.id; const dep=db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM savings WHERE member_id=? AND transaction_type='deposit'").get(uid).t; const wit=db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM savings WHERE member_id=? AND transaction_type='withdrawal'").get(uid).t; const cs=getCreditScore(uid); const sales=db.prepare("SELECT COALESCE(SUM(oi.total_price),0) as t FROM order_items oi JOIN products p ON oi.product_id=p.id WHERE p.seller_id=?").get(uid).t; const pending_orders=db.prepare("SELECT COUNT(*) as c FROM orders o JOIN order_items oi ON o.id=oi.order_id JOIN products p ON oi.product_id=p.id WHERE p.seller_id=? AND o.status='placed'").get(uid).c; const unread=db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND is_read=0').get(uid).c; res.json({total_savings:Math.max(dep-wit,0),active_loans:db.prepare("SELECT COUNT(*) as c FROM loans WHERE applicant_id=? AND status IN ('approved','disbursed')").get(uid).c,credit_score:cs.score,credit_grade:cs.grade,eligible_amount:cs.eligible_amount,marketplace_sales:sales,pending_orders,unread_count:unread,notifications:db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 10').all(uid),savings_history:db.prepare("SELECT transaction_date,amount,transaction_type,balance_after FROM savings WHERE member_id=? ORDER BY transaction_date DESC LIMIT 12").all(uid).reverse(),loans:db.prepare('SELECT * FROM loans WHERE applicant_id=? ORDER BY created_at DESC LIMIT 5').all(uid),my_products:db.prepare('SELECT * FROM products WHERE seller_id=? AND is_active=1').all(uid),eligible_schemes:8}); }catch(e){res.status(500).json({detail:e.message});} });
// PUBLIC STATS
router.get('/stats/public',(req,res)=>{ try{ const db=getDb(); const members=db.prepare("SELECT COUNT(*) as c FROM users WHERE role='member' AND is_active=1").get().c; const loans_disbursed=db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM loans WHERE status IN ('approved','disbursed')").get().t; const active_products=db.prepare('SELECT COUNT(*) as c FROM products WHERE is_active=1').get().c; const active_schemes=db.prepare('SELECT COUNT(*) as c FROM government_schemes WHERE is_active=1').get().c; res.json({members,loans_disbursed,active_products,active_schemes}); }catch(e){res.status(500).json({detail:e.message});} });
router.get('/dashboard/coordinator',...requireCoordinator,(req,res)=>{ try{ const db=getDb(); const dep=db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM savings WHERE transaction_type='deposit'").get().t; const wit=db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM savings WHERE transaction_type='withdrawal'").get().t;
		// member savings summary (top 50 members)
		const member_savings = db.prepare("SELECT u.id as member_id,u.full_name,COALESCE(SUM(CASE WHEN s.transaction_type='deposit' THEN s.amount ELSE -s.amount END),0) as balance, MAX(s.transaction_date) as last_tx FROM users u LEFT JOIN savings s ON u.id=s.member_id WHERE u.role='member' GROUP BY u.id ORDER BY balance DESC LIMIT 50").all();
		// group loan performance aggregated by SHG
		const group_loan_performance = db.prepare("SELECT COALESCE(mp.shg_id,0) as shg_id, COALESCE(sg.name,'Unassigned') as shg_name, COUNT(l.id) as loan_count, COALESCE(SUM(l.amount),0) as total_amount, COALESCE(AVG(l.ai_credit_score),0) as avg_score FROM loans l JOIN users u ON l.applicant_id=u.id LEFT JOIN member_profiles mp ON u.id=mp.user_id LEFT JOIN shg_groups sg ON mp.shg_id=sg.id GROUP BY mp.shg_id ORDER BY total_amount DESC LIMIT 20").all();
		res.json({
			total_members: db.prepare("SELECT COUNT(*) as c FROM users WHERE role='member' AND is_active=1").get().c,
			total_savings: Math.max(dep-wit,0),
			pending_loans: db.prepare("SELECT COUNT(*) as c FROM loans WHERE status IN ('pending','coordinator_review')").get().c,
			members: db.prepare("SELECT u.*,mp.village,mp.district,mp.credit_score,mp.attendance_pct,mp.occupation,mp.shg_id FROM users u LEFT JOIN member_profiles mp ON u.id=mp.user_id WHERE u.role='member' AND u.is_active=1 ORDER BY u.full_name").all().map(safe),
			loans: db.prepare("SELECT l.*,u.full_name as applicant_name,u.phone as applicant_phone,mp.village,mp.district,mp.credit_score,mp.occupation,mp.annual_income FROM loans l JOIN users u ON l.applicant_id=u.id LEFT JOIN member_profiles mp ON u.id=mp.user_id ORDER BY l.created_at DESC").all(),
			shgs: db.prepare('SELECT * FROM shg_groups WHERE is_active=1').all(),
			training_programs: db.prepare('SELECT tp.*, COUNT(te.id) as enrolled_count FROM training_programs tp LEFT JOIN training_enrollments te ON tp.id=te.program_id WHERE tp.is_active=1 GROUP BY tp.id ORDER BY tp.start_date ASC').all(),
			recent_savings: db.prepare("SELECT s.*,u.full_name FROM savings s JOIN users u ON s.member_id=u.id ORDER BY s.id DESC LIMIT 15").all(),
			member_savings,
			group_loan_performance
		}); }catch(e){res.status(500).json({detail:e.message});} });

router.get('/dashboard/bank', ...requireBankOfficer, (req, res) => {
  try {
    const db = getDb();
    
    const tdp = db.prepare("SELECT COUNT(*) as c FROM repayments WHERE due_date <= date('now')").get().c;
    const tpd = db.prepare("SELECT COUNT(*) as c FROM repayments WHERE is_paid=1 AND due_date <= date('now')").get().c;
    
    res.json({
      pending_approvals: db.prepare("SELECT COUNT(*) as c FROM loans WHERE status IN ('pending','coordinator_review','officer_review')").get().c,
      approved_count: db.prepare("SELECT COUNT(*) as c FROM loans WHERE status='approved' AND updated_at >= date('now','-30 days')").get().c,
      total_disbursed: db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM loans WHERE status IN ('approved','disbursed')").get().t,
      repayment_rate: tdp > 0 ? Math.round((tpd / tdp) * 100) : 100,
      high_risk: db.prepare("SELECT COUNT(*) as c FROM loans WHERE ai_credit_score < 50 AND status NOT IN ('closed','rejected')").get().c,
      loans: db.prepare("SELECT l.*, u.full_name as applicant_name, u.phone as applicant_phone, mp.village, mp.district FROM loans l JOIN users u ON l.applicant_id=u.id LEFT JOIN member_profiles mp ON u.id=mp.user_id ORDER BY l.created_at DESC LIMIT 100").all()
    });
  } catch (e) {
    console.error("Dashboard Bank Error:", e);
    res.status(500).json({ detail: e.message });
  }
});
router.get('/dashboard/admin',...requireAdmin,(req,res)=>{ try{ const db=getDb(); res.json({total_users:db.prepare('SELECT COUNT(*) as c FROM users').get().c,total_shgs:db.prepare('SELECT COUNT(*) as c FROM shg_groups').get().c,total_loans_disbursed:db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM loans WHERE status IN ('approved','disbursed')").get().t,marketplace_gmv:db.prepare('SELECT COALESCE(SUM(total_amount),0) as t FROM orders').get().t,active_schemes:db.prepare('SELECT COUNT(*) as c FROM government_schemes WHERE is_active=1').get().c,users_by_role:db.prepare("SELECT role,COUNT(*) as count FROM users GROUP BY role").all(),all_users:db.prepare("SELECT u.*,mp.village,mp.district,mp.credit_score FROM users u LEFT JOIN member_profiles mp ON u.id=mp.user_id ORDER BY u.created_at DESC LIMIT 200").all().map(safe),audit_logs:db.prepare("SELECT al.*,u.full_name FROM audit_logs al LEFT JOIN users u ON al.user_id=u.id ORDER BY al.created_at DESC LIMIT 50").all(),recent_loans:db.prepare("SELECT l.*,u.full_name as name FROM loans l JOIN users u ON l.applicant_id=u.id ORDER BY l.created_at DESC LIMIT 20").all(),ml_models:[{name:'Credit Risk',accuracy:91,status:'active'},{name:'Livelihood Recommender',accuracy:87,status:'active'},{name:'Scheme Matching',accuracy:94,status:'active'},{name:'Health Classifier',accuracy:89,status:'active'}]}); }catch(e){res.status(500).json({detail:e.message});} });
// USERS
router.get('/users',...requireAdmin,(req,res)=>{ const db=getDb(),{page=1,limit=20,role,search}=req.query; let q="SELECT u.*,mp.village,mp.district,mp.credit_score FROM users u LEFT JOIN member_profiles mp ON u.id=mp.user_id WHERE 1=1",params=[]; if(role){q+=' AND u.role=?';params.push(role);} if(search){q+=' AND (u.full_name LIKE ? OR u.phone LIKE ?)';params.push(`%${search}%`,`%${search}%`);} const total=db.prepare(q.replace('SELECT u.*,mp.village,mp.district,mp.credit_score','SELECT COUNT(*) as c')).get(...params).c; q+=` ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${(page-1)*limit}`; res.json({users:db.prepare(q).all(...params).map(safe),total,page:Number(page),pages:Math.ceil(total/limit)}); });
router.put('/users/:id/role',...requireAdmin,(req,res)=>{ const {role}=req.body; if(!['member','coordinator','bank_officer','admin'].includes(role))return res.status(400).json({detail:'Invalid role'}); const db=getDb(); db.prepare("UPDATE users SET role=?,updated_at=datetime('now') WHERE id=?").run(role,req.params.id); audit(db,req.user.id,'role_assign','user',req.params.id,`New: ${role}`); notify(db,Number(req.params.id),'Account Role Changed',`Your role has been updated to: ${role}`,'system'); res.json({message:`Role updated to ${role}`}); });
router.put('/users/:id/toggle',...requireAdmin,(req,res)=>{ const db=getDb(),u=db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id); if(!u)return res.status(404).json({detail:'User not found'}); const s=u.is_active?0:1; db.prepare("UPDATE users SET is_active=?,updated_at=datetime('now') WHERE id=?").run(s,req.params.id); audit(db,req.user.id,s?'activate':'deactivate','user',req.params.id); res.json({message:`User ${s?'activated':'deactivated'}`,is_active:s}); });
// NOTIFICATIONS
router.get('/notifications',authenticate,(req,res)=>{ const db=getDb(); res.json({notifications:db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50').all(req.user.id),unread_count:db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND is_read=0').get(req.user.id).c}); });
router.put('/notifications/:id/read',authenticate,(req,res)=>{ getDb().prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?').run(req.params.id,req.user.id); res.json({success:true}); });
router.put('/notifications/mark-all-read',authenticate,(req,res)=>{ getDb().prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').run(req.user.id); res.json({success:true}); });
// SAVINGS
router.get('/savings',authenticate,(req,res)=>{ const db=getDb(),uid=req.query.member_id&&['coordinator','admin'].includes(req.user.role)?Number(req.query.member_id):req.user.id; const dep=db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM savings WHERE member_id=? AND transaction_type='deposit'").get(uid).t; const wit=db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM savings WHERE member_id=? AND transaction_type='withdrawal'").get(uid).t; res.json({savings:db.prepare("SELECT * FROM savings WHERE member_id=? ORDER BY transaction_date DESC LIMIT 60").all(uid),total_savings:Math.max(dep-wit,0),total_deposits:dep,total_withdrawals:wit}); });
// Members can record their own savings (self-service)
router.post('/savings/self',authenticate,(req,res)=>{ try{ const { amount, transaction_type='deposit', notes='', transaction_date } = req.body; const member_id = req.user.id; if(!amount||Number(amount)<=0) return res.status(400).json({detail:'Positive amount required'}); const db=getDb(); const prev = db.prepare("SELECT COALESCE(SUM(CASE WHEN transaction_type='deposit' THEN amount ELSE -amount END),0) as b FROM savings WHERE member_id=?").get(member_id).b || 0; if(transaction_type==='withdrawal' && Number(amount) > prev) return res.status(400).json({detail:`Insufficient balance. Current: ₹${Math.round(prev)}`}); const newBal = Math.max(0, prev + (transaction_type==='deposit'?Number(amount):-Number(amount))); const receipt = `RCP-${Date.now()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`; const tdate = transaction_date || new Date().toISOString().slice(0,10); const id = db.prepare('INSERT INTO savings (member_id,amount,transaction_type,balance_after,notes,receipt_number,recorded_by,transaction_date) VALUES (?,?,?,?,?,?,?,?)').run(member_id, Number(amount), transaction_type, newBal, notes||'', receipt, req.user.id, tdate).lastInsertRowid; db.prepare("UPDATE member_profiles SET credit_score=MIN(100,credit_score+0.1) WHERE user_id=?").run(member_id); notify(db, member_id, transaction_type==='deposit'?'💰 Deposit recorded':'💸 Withdrawal recorded', `₹${Number(amount).toLocaleString('en-IN')} ${transaction_type}. Balance: ₹${Math.round(newBal).toLocaleString('en-IN')}. Receipt: ${receipt}`,'savings',id,'saving'); audit(db, req.user.id, 'savings_self', 'saving', id, `Member recorded ${transaction_type} ₹${amount}`); res.status(201).json(db.prepare('SELECT * FROM savings WHERE id=?').get(id)); }catch(e){res.status(500).json({detail:e.message});} });
// CREDIT
router.get('/credit-score',authenticate,(req,res)=>{ const uid=req.query.member_id&&['coordinator','bank_officer','admin'].includes(req.user.role)?Number(req.query.member_id):req.user.id; res.json(getCreditScore(uid)); });
// LOANS
router.post('/loans/apply',...requireMember,upload.fields([{name:'bank_passbook',maxCount:1},{name:'aadhaar',maxCount:1}]),async (req, res) => {
	try {
		const { amount, purpose, duration_months = 12, collateral = 'None' } = req.body;
		if (!amount || amount < 1000) return res.status(400).json({ detail: 'Minimum loan amount is ₹1,000' });
		if (!purpose || purpose.trim().length < 10) return res.status(400).json({ detail: 'Describe purpose in at least 10 characters' });
		if (!req.files?.bank_passbook?.[0]) return res.status(400).json({ detail: 'Bank passbook document required' });
		if (!req.files?.aadhaar?.[0]) return res.status(400).json({ detail: 'Aadhaar document required' });

		const db = getDb(), cs = getCreditScore(req.user.id);
		const lnum = `GS-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
		const pbPath = `uploads/${req.files.bank_passbook[0].filename}`;
		const adhPath = `uploads/${req.files.aadhaar[0].filename}`;
		const lid = db.prepare('INSERT INTO loans (loan_number,applicant_id,amount,purpose,duration_months,collateral,bank_passbook_path,aadhaar_path,status,ai_credit_score,ai_recommendation) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(lnum, req.user.id, amount, purpose.trim(), duration_months, collateral, pbPath, adhPath, 'pending', cs.score, cs.recommendation).lastInsertRowid;

		const sched = genEMI(amount, 7.0, duration_months);
		const rs = db.prepare('INSERT INTO repayments (loan_id,month_number,due_date,emi_amount,principal,interest_amount) VALUES (?,?,?,?,?,?)');
		for (const s of sched) rs.run(lid, s.month, s.due_date, s.emi, s.principal, s.interest);

		notify(db, req.user.id, '📋 Loan Application Submitted', `Loan #${lnum} for ₹${Number(amount).toLocaleString('en-IN')} submitted. Credit Score: ${cs.score}/100 (${cs.grade}). Documents uploaded.`, 'loan', lid, 'loan');

		// Notify coordinators, bank officers, and admins about new loan application
		db.prepare("SELECT id FROM users WHERE role IN ('coordinator','bank_officer','admin')").all().forEach(c =>
			notify(db, c.id, '📋 New Loan Application', `${req.user.full_name} applied for ₹${Number(amount).toLocaleString('en-IN')}. Score: ${cs.score}.`, 'loan', lid, 'loan')
		);

		audit(db, req.user.id, 'loan_apply', 'loan', lid, `₹${amount}`);
		res.status(201).json({ loan: db.prepare('SELECT * FROM loans WHERE id=?').get(lid), credit_assessment: cs, repayment_schedule: sched });
	} catch (e) {
		res.status(500).json({ detail: e.message });
	}
});
router.get('/loans/my',...requireMember,(req,res)=>res.json(getDb().prepare('SELECT * FROM loans WHERE applicant_id=? ORDER BY created_at DESC').all(req.user.id)));
router.get('/loans',...requireCoordinator,(req,res)=>{ const {status}=req.query; let q="SELECT l.*,u.full_name as applicant_name,u.phone as applicant_phone,mp.village FROM loans l JOIN users u ON l.applicant_id=u.id LEFT JOIN member_profiles mp ON u.id=mp.user_id",p=[]; if(status){q+=' WHERE l.status=?';p.push(status);} res.json(getDb().prepare(q+' ORDER BY l.created_at DESC').all(...p)); });
router.get('/loans/:id',authenticate,(req,res)=>{ try{ const db=getDb(),loan=db.prepare("SELECT l.*,u.full_name as applicant_name,u.phone as applicant_phone FROM loans l JOIN users u ON l.applicant_id=u.id WHERE l.id=?").get(req.params.id); if(!loan)return res.status(404).json({detail:'Loan not found'}); if(loan.applicant_id!==req.user.id&&!['coordinator','bank_officer','admin'].includes(req.user.role))return res.status(403).json({detail:'Access denied'}); const profile=db.prepare('SELECT * FROM member_profiles WHERE user_id=?').get(loan.applicant_id)||null; const dep=db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM savings WHERE member_id=? AND transaction_type='deposit'").get(loan.applicant_id).t; const wit=db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM savings WHERE member_id=? AND transaction_type='withdrawal'").get(loan.applicant_id).t; let cs=null; try{cs=getCreditScore(loan.applicant_id);}catch(e){} const pastLoans=db.prepare("SELECT id,loan_number,amount,status,created_at FROM loans WHERE applicant_id=? AND id!=? ORDER BY created_at DESC LIMIT 5").all(loan.applicant_id,loan.id); res.json({...loan,repayments:db.prepare('SELECT * FROM repayments WHERE loan_id=? ORDER BY month_number').all(loan.id),applicant_profile:profile,savings_summary:{total_deposits:dep,total_withdrawals:wit,balance:Math.max(dep-wit,0)},credit_assessment:cs,past_loans:pastLoans}); }catch(e){res.status(500).json({detail:e.message});} });
router.post('/loans/:id/review',...requireCoordinator,(req,res)=>{ try{ const {action,remarks='',interest_rate}=req.body; if(!['approve','reject','forward'].includes(action))return res.status(400).json({detail:'action must be: approve, reject, or forward'}); const db=getDb(),loan=db.prepare('SELECT * FROM loans WHERE id=?').get(req.params.id); if(!loan)return res.status(404).json({detail:'Loan not found'}); let ns,oid=null,cid=null,or=null,cr=null,rr=null,dd=null; if(action==='approve'){ns='approved';oid=req.user.id;or=remarks;dd=new Date().toISOString().slice(0,10);if(interest_rate)db.prepare('UPDATE loans SET interest_rate=? WHERE id=?').run(parseFloat(interest_rate),loan.id);}else if(action==='reject'){ns='rejected';rr=remarks||'Rejected by reviewing officer';oid=req.user.id;}else{ns=req.user.role==='coordinator'?'officer_review':'coordinator_review';if(req.user.role==='coordinator')cid=req.user.id;else oid=req.user.id;cr=remarks;} db.prepare("UPDATE loans SET status=?,officer_id=COALESCE(?,officer_id),coordinator_id=COALESCE(?,coordinator_id),officer_remarks=COALESCE(?,officer_remarks),coordinator_remarks=COALESCE(?,coordinator_remarks),rejection_reason=COALESCE(?,rejection_reason),disbursement_date=COALESCE(?,disbursement_date),updated_at=datetime('now') WHERE id=?").run(ns,oid,cid,or,cr,rr,dd,loan.id); const msgs={approve:`✅ LOAN APPROVED! Your loan #${loan.loan_number} for ₹${loan.amount.toLocaleString('en-IN')} has been approved! Funds will be disbursed soon.`,reject:`❌ Loan #${loan.loan_number} was not approved. Reason: ${remarks||'Does not meet criteria.'}`,forward:`📤 Loan #${loan.loan_number} forwarded for ${req.user.role==='coordinator'?'bank officer':'coordinator'} review.`}; notify(db,loan.applicant_id,action==='approve'?'✅ Loan Approved!':action==='reject'?'❌ Loan Rejected':'📤 Loan Forwarded',msgs[action],'loan',loan.id,'loan'); if(action==='forward'&&req.user.role==='coordinator')db.prepare("SELECT id FROM users WHERE role IN ('bank_officer','admin')").all().forEach(o=>notify(db,o.id,'🏦 Loan Awaiting Approval',`${req.user.full_name} forwarded ₹${loan.amount.toLocaleString('en-IN')} loan. Credit: ${loan.ai_credit_score}/100.`,'loan',loan.id,'loan')); audit(db,req.user.id,`loan_${action}`,'loan',loan.id,remarks); res.json({message:`Loan ${action}d`,status:ns,loan_id:loan.id}); }catch(e){res.status(500).json({detail:e.message});} });
router.post('/loans/:id/pay-emi',...requireCoordinator,(req,res)=>{ try{ const {month_number}=req.body; const db=getDb(),rep=db.prepare('SELECT * FROM repayments WHERE loan_id=? AND month_number=?').get(req.params.id,month_number); if(!rep)return res.status(404).json({detail:'EMI not found'}); if(rep.is_paid)return res.status(400).json({detail:'Already paid'}); const rc=`EMI-${Date.now()}-${Math.random().toString(36).slice(2,4).toUpperCase()}`; db.prepare("UPDATE repayments SET is_paid=1,paid_date=date('now'),receipt_number=? WHERE id=?").run(rc,rep.id); db.prepare("UPDATE member_profiles SET credit_score=MIN(100,credit_score+0.5) WHERE user_id=(SELECT applicant_id FROM loans WHERE id=?)").run(req.params.id); const loan=db.prepare('SELECT * FROM loans WHERE id=?').get(req.params.id); notify(db,loan.applicant_id,'✅ EMI Recorded',`EMI #${month_number} (₹${rep.emi_amount}) for loan #${loan.loan_number} recorded. Receipt: ${rc}`,'loan',loan.id,'loan'); res.json({success:true,receipt_number:rc}); }catch(e){res.status(500).json({detail:e.message});} });
// Backwards-compatible route name: /loans/:id/repayment
router.post('/loans/:id/repayment',...requireCoordinator,(req,res)=>{ try{ const {month_number}=req.body; const db=getDb(),rep=db.prepare('SELECT * FROM repayments WHERE loan_id=? AND month_number=?').get(req.params.id,month_number); if(!rep)return res.status(404).json({detail:'EMI not found'}); if(rep.is_paid)return res.status(400).json({detail:'Already paid'}); const rc=`EMI-${Date.now()}-${Math.random().toString(36).slice(2,4).toUpperCase()}`; db.prepare("UPDATE repayments SET is_paid=1,paid_date=date('now'),receipt_number=? WHERE id=?").run(rc,rep.id); db.prepare("UPDATE member_profiles SET credit_score=MIN(100,credit_score+0.5) WHERE user_id=(SELECT applicant_id FROM loans WHERE id=?)").run(req.params.id); const loan=db.prepare('SELECT * FROM loans WHERE id=?').get(req.params.id); notify(db,loan.applicant_id,'✅ EMI Recorded',`EMI #${month_number} (₹${rep.emi_amount}) for loan #${loan.loan_number} recorded. Receipt: ${rc}`,'loan',loan.id,'loan'); res.json({success:true,receipt_number:rc}); }catch(e){res.status(500).json({detail:e.message});} });
// LOAN DOCUMENTS
router.get('/loans/:id/documents',authenticate,(req,res)=>{ try{ const db=getDb(),loan=db.prepare('SELECT * FROM loans WHERE id=?').get(req.params.id); if(!loan)return res.status(404).json({detail:'Loan not found'}); if(loan.applicant_id!==req.user.id&&!['coordinator','bank_officer','admin'].includes(req.user.role))return res.status(403).json({detail:'Access denied'}); const docs=[]; if(loan.bank_passbook_path)docs.push({document_type:'bank_passbook',file_path:loan.bank_passbook_path,upload_date:loan.created_at}); if(loan.aadhaar_path)docs.push({document_type:'aadhaar',file_path:loan.aadhaar_path,upload_date:loan.created_at}); res.json({loan_id:req.params.id,loan_number:loan.loan_number,documents:docs}); }catch(e){res.status(500).json({detail:e.message});} });
router.get('/loans/download/:filename',authenticate,(req,res)=>{ try{ const filePath=path.join(UPLOAD_DIR,req.params.filename); if(!filePath.startsWith(UPLOAD_DIR))return res.status(403).json({detail:'Access denied'}); if(!fs.existsSync(filePath))return res.status(404).json({detail:'File not found'}); const orig=decodeURIComponent(req.query.original||req.params.filename); return res.download(filePath,orig); }catch(e){res.status(500).json({detail:e.message});} });
// SKILLS
router.get('/skills',(req,res)=>res.json(getDb().prepare('SELECT * FROM skills ORDER BY category,name').all()));
router.get('/skills/my',authenticate,(req,res)=>{ const uid=req.query.member_id&&['coordinator','admin'].includes(req.user.role)?Number(req.query.member_id):req.user.id; res.json(getDb().prepare('SELECT ms.*,s.name,s.category,s.description FROM member_skills ms JOIN skills s ON ms.skill_id=s.id WHERE ms.member_id=? ORDER BY ms.added_at DESC').all(uid)); });
router.post('/skills/my',authenticate,(req,res)=>{ try{ const {skill_id,proficiency='beginner',years_experience=0}=req.body; if(!skill_id)return res.status(400).json({detail:'skill_id required'}); const db=getDb(); const id=db.prepare('INSERT INTO member_skills (member_id,skill_id,proficiency,years_experience) VALUES (?,?,?,?)').run(req.user.id,skill_id,proficiency,years_experience).lastInsertRowid; res.status(201).json(db.prepare('SELECT ms.*,s.name,s.category FROM member_skills ms JOIN skills s ON ms.skill_id=s.id WHERE ms.id=?').get(id)); }catch(e){if(e.message.includes('UNIQUE'))return res.status(409).json({detail:'Skill already added'});res.status(500).json({detail:e.message});} });
router.put('/skills/my/:id',authenticate,(req,res)=>{ getDb().prepare('UPDATE member_skills SET proficiency=COALESCE(?,proficiency),years_experience=COALESCE(?,years_experience) WHERE id=? AND member_id=?').run(req.body.proficiency||null,req.body.years_experience||null,req.params.id,req.user.id); res.json({success:true}); });
router.delete('/skills/my/:id',authenticate,(req,res)=>{ getDb().prepare('DELETE FROM member_skills WHERE id=? AND member_id=?').run(req.params.id,req.user.id); res.json({success:true}); });
// TRAINING
router.get('/training',(req,res)=>{ try{ const db=getDb(); const progs=db.prepare('SELECT * FROM training_programs WHERE is_active=1 ORDER BY start_date ASC').all(); const uid=req.user?.id; const results=progs.map(p=>({ ...p, is_enrolled: uid ? db.prepare('SELECT id FROM training_enrollments WHERE program_id=? AND member_id=?').get(p.id, uid) ? true : false : false, seats_left: Math.max(0, p.max_participants - p.enrolled_count) })); res.json(results); }catch(e){res.status(500).json({detail:e.message});} });
router.get('/training/my-enrollments',authenticate,(req,res)=>{ try{ res.json(getDb().prepare('SELECT te.*,tp.title,tp.provider,tp.mode,tp.start_date,tp.location,tp.duration_days,tp.description FROM training_enrollments te JOIN training_programs tp ON te.program_id=tp.id WHERE te.member_id=? ORDER BY te.enrolled_at DESC').all(req.user.id)); }catch(e){res.status(500).json({detail:e.message});} });
router.get('/training/:id',(req,res)=>{ try{ const db=getDb(),prog=db.prepare('SELECT * FROM training_programs WHERE id=? AND is_active=1').get(req.params.id); if(!prog)return res.status(404).json({detail:'Program not found'}); const uid=req.user?.id; res.json({...prog, is_enrolled: uid ? db.prepare('SELECT id FROM training_enrollments WHERE program_id=? AND member_id=?').get(prog.id, uid) ? true : false : false, seats_left: Math.max(0, prog.max_participants - prog.enrolled_count), enrolled_members: db.prepare('SELECT u.id, u.full_name, u.phone FROM training_enrollments te JOIN users u ON te.member_id=u.id WHERE te.program_id=?').all(prog.id)}); }catch(e){res.status(500).json({detail:e.message});} });
router.post('/training',...requireCoordinator,(req,res)=>{ 
	try{ 
		const {title,description='',provider='',mode='offline',duration_days,start_date,location='',max_participants=20}=req.body; 
		if(!title||!title.trim())return res.status(400).json({detail:'Program title is required'}); 
		if(!duration_days||duration_days<1)return res.status(400).json({detail:'Duration must be at least 1 day'}); 
		if(!provider||!provider.trim())return res.status(400).json({detail:'Provider/Trainer name is required'}); 
		if(max_participants<1||max_participants>1000)return res.status(400).json({detail:'Max participants must be between 1 and 1000'}); 
		const db=getDb(); 
		const prog_data = { title: title.trim(), description: description.trim(), provider: provider.trim(), mode: ['offline','online','hybrid'].includes(mode) ? mode : 'offline', duration_days: parseInt(duration_days), start_date: start_date || null, location: location.trim(), max_participants: parseInt(max_participants), enrolled_count: 0, is_active: 1 }; 
		const result = db.prepare('INSERT INTO training_programs (title,description,provider,mode,duration_days,start_date,location,max_participants,enrolled_count,is_active) VALUES (?,?,?,?,?,?,?,?,?,?)').run( prog_data.title, prog_data.description, prog_data.provider, prog_data.mode, prog_data.duration_days, prog_data.start_date, prog_data.location, prog_data.max_participants, prog_data.enrolled_count, prog_data.is_active ); 
		const id = result.lastInsertRowid; 
		const prog = db.prepare('SELECT * FROM training_programs WHERE id=?').get(id); 
		audit(db, req.user.id, 'training_create', 'training_program', id, title); 
		// Notify all active members 
		db.prepare("SELECT id FROM users WHERE role='member' AND is_active=1").all().forEach(m=>{ 
			const notif_msg = `🎓 New Training Program!\n\n"${title}"\n\n⏱️ Duration: ${duration_days} days\n🏛️ Mode: ${mode}\n👥 Seats: ${max_participants}\n${ start_date ? '📅 Starts: ' + start_date : '⏳ Flexible timing' }\n${location ? '📍 Location: ' + location : ''}\n\n👉 Enroll now from Skills & Training section!`; 
			notify(db, m.id, '🎓 New Training Program', notif_msg, 'training', id, 'training'); 
		}); 
		const response = { ...prog, seats_left: Math.max(0, prog.max_participants - prog.enrolled_count), enrollment_percentage: 0 }; 
		res.status(201).json(response); 
	}catch(e){
		console.error(e);
		res.status(500).json({detail:'Failed to create program: '+e.message});
	} 
});

router.post('/training/:id/enroll',authenticate,(req,res)=>{ try{ const db=getDb(),prog=db.prepare('SELECT * FROM training_programs WHERE id=? AND is_active=1').get(req.params.id); if(!prog)return res.status(404).json({detail:'Program not found'}); if(prog.enrolled_count>=prog.max_participants)return res.status(400).json({detail:`Program is full. Only ${prog.max_participants} seats available.`}); const existing=db.prepare('SELECT id FROM training_enrollments WHERE program_id=? AND member_id=?').get(req.params.id,req.user.id); if(existing)return res.status(409).json({detail:'Already enrolled in this program'}); db.prepare('INSERT INTO training_enrollments (program_id,member_id) VALUES (?,?)').run(req.params.id,req.user.id); db.prepare('UPDATE training_programs SET enrolled_count=enrolled_count+1 WHERE id=?').run(req.params.id); notify(db,req.user.id,'🎓 Enrolled in Training!',`✅ You are enrolled in "${prog.title}" (${prog.duration_days} days). ${prog.location?'📍 Location: '+prog.location:''} ${prog.start_date?'📅 Start: '+prog.start_date:''}. Check your dashboard for materials.`,'training',prog.id,'training'); audit(db,req.user.id,'training_enroll','training_enrollment',req.params.id,`${prog.title}`); res.json({success:true,message:`Enrolled in ${prog.title}`,program:db.prepare('SELECT * FROM training_programs WHERE id=?').get(req.params.id)}); }catch(e){res.status(500).json({detail:e.message});} });
// COORDINATOR: Get training programs with enrollment data
router.get('/coordinator/training-programs',...requireCoordinator,(req,res)=>{ try{ const db=getDb(); const progs=db.prepare('SELECT tp.*, COUNT(te.id) as enrolled_count FROM training_programs tp LEFT JOIN training_enrollments te ON tp.id=te.program_id WHERE tp.is_active=1 GROUP BY tp.id ORDER BY tp.start_date ASC').all(); const results=progs.map(p=>({ ...p, seats_left: Math.max(0, p.max_participants - p.enrolled_count), enrollment_percentage: Math.round((p.enrolled_count / p.max_participants) * 100) })); res.json(results); }catch(e){res.status(500).json({detail:e.message});} });
// COORDINATOR: Get enrollments for a specific training program
router.get('/coordinator/training-programs/:id/enrollments',...requireCoordinator,(req,res)=>{ try{ const db=getDb(); const prog=db.prepare('SELECT * FROM training_programs WHERE id=?').get(req.params.id); if(!prog)return res.status(404).json({detail:'Program not found'}); const enrollments=db.prepare('SELECT te.id, te.enrolled_at, te.status, u.id as member_id, u.full_name, u.phone, mp.village, mp.district, mp.occupation FROM training_enrollments te JOIN users u ON te.member_id=u.id LEFT JOIN member_profiles mp ON u.id=mp.user_id WHERE te.program_id=? ORDER BY te.enrolled_at DESC').all(req.params.id); res.json({program:prog, total_enrolled: enrollments.length, seats_left: prog.max_participants - enrollments.length, enrollments}); }catch(e){res.status(500).json({detail:e.message});} });
// SCHEMES
router.get('/schemes',(req,res)=>{ const {category,search,page=1,limit=20}=req.query,db=getDb(); let q='SELECT * FROM government_schemes WHERE is_active=1',p=[]; if(category){q+=' AND category=?';p.push(category);} if(search){q+=' AND (name LIKE ? OR benefits LIKE ?)';const s=`%${search}%`;p.push(s,s);} const total=db.prepare(q.replace('SELECT *','SELECT COUNT(*) as c')).get(...p).c; res.json({items:db.prepare(q+` ORDER BY id ASC LIMIT ${limit} OFFSET ${(page-1)*limit}`).all(...p),total,page:Number(page),pages:Math.ceil(total/limit)}); });
router.get('/schemes/my-applications',authenticate,(req,res)=>res.json(getDb().prepare("SELECT sa.*,gs.name as scheme_name,gs.category,gs.benefits,gs.ministry FROM scheme_applications sa JOIN government_schemes gs ON sa.scheme_id=gs.id WHERE sa.applicant_id=? ORDER BY sa.submission_date DESC").all(req.user.id)));
router.post('/schemes/apply',authenticate,(req,res)=>{ try{ const {scheme_id,form_data={}}=req.body; if(!scheme_id)return res.status(400).json({detail:'scheme_id required'}); const db=getDb(); if(!db.prepare('SELECT id FROM government_schemes WHERE id=? AND is_active=1').get(scheme_id))return res.status(404).json({detail:'Scheme not found'}); const an=`GS-SCH-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`; const id=db.prepare('INSERT INTO scheme_applications (scheme_id,applicant_id,application_number,form_data,ai_eligibility_score) VALUES (?,?,?,?,?)').run(scheme_id,req.user.id,an,JSON.stringify(form_data),Math.round(70+Math.random()*20)).lastInsertRowid; const sc=db.prepare('SELECT * FROM government_schemes WHERE id=?').get(scheme_id); notify(db,req.user.id,'📋 Application Submitted',`Application #${an} for "${sc.name}" submitted successfully.`,'scheme',id,'scheme'); audit(db,req.user.id,'scheme_apply','scheme_application',id,sc.name); res.status(201).json(db.prepare('SELECT * FROM scheme_applications WHERE id=?').get(id)); }catch(e){if(e.message.includes('UNIQUE'))return res.status(409).json({detail:'Already applied for this scheme'});res.status(500).json({detail:e.message});} });
router.put('/schemes/applications/:id/status',...requireCoordinator,(req,res)=>{ const {status,remarks=''}=req.body; if(!['pending','under_review','approved','rejected'].includes(status))return res.status(400).json({detail:'Invalid status'}); const db=getDb(),app=db.prepare("SELECT sa.*,gs.name as scheme_name FROM scheme_applications sa JOIN government_schemes gs ON sa.scheme_id=gs.id WHERE sa.id=?").get(req.params.id); if(!app)return res.status(404).json({detail:'Not found'}); db.prepare("UPDATE scheme_applications SET status=?,remarks=? WHERE id=?").run(status,remarks,req.params.id); notify(db,app.applicant_id,`Scheme ${status==='approved'?'✅ Approved':status==='rejected'?'❌ Rejected':'Updated'}`,`Your application for "${app.scheme_name}" is now: ${status}.${remarks?' Note: '+remarks:''}`,'scheme',app.id,'scheme'); res.json({success:true,status}); });
router.post('/schemes',...requireAdmin,(req,res)=>{ try{ const db=getDb(); const {name,category,description,benefits,eligibility_criteria,required_documents,application_url,max_benefit_amount,ministry}=req.body; if(!name)return res.status(400).json({detail:'Name is required'}); const id=db.prepare('INSERT INTO government_schemes (name,category,description,benefits,eligibility_criteria,required_documents,application_url,max_benefit_amount,ministry) VALUES (?,?,?,?,?,?,?,?,?)').run(name,category,description,benefits,JSON.stringify(eligibility_criteria||{}),JSON.stringify(required_documents||[]),application_url||'',max_benefit_amount||0,ministry||'').lastInsertRowid; res.status(201).json(db.prepare('SELECT * FROM government_schemes WHERE id=?').get(id)); }catch(e){res.status(500).json({detail:e.message});} });
router.delete('/schemes/:id',...requireAdmin,(req,res)=>{ try{ getDb().prepare('UPDATE government_schemes SET is_active=0 WHERE id=?').run(req.params.id); res.json({success:true}); }catch(e){res.status(500).json({detail:e.message});} });
router.post('/schemes/auto-fetch', ...requireAdmin, async (req, res) => {
  try {
    const prompt = `Generate a JSON array of 3 highly realistic Indian government schemes for rural empowerment. Output MUST be an array of objects matching this exact structure: [{ "name": "String", "category": "Finance"|"Agriculture"|"Housing"|"Livelihood"|"Health"|"Employment"|"Business", "description": "String", "benefits": "String", "ministry": "String", "max_benefit_amount": number, "eligibility_criteria": {"limit":"..."}, "required_documents": ["Aadhaar", "Passbook"] }]. Output ONLY valid raw JSON array starting with '[' without markdown blocks.`;
    const response = await getAIResponse(prompt, [], 'en');
    let schemes;
    try { schemes = JSON.parse(response.trim().replace(/```json/g,'').replace(/```/g,'')); } catch(err) { return res.status(500).json({detail: 'Failed to parse AI response into JSON. ' + response.substring(0,60)}); }
    const db = getDb(); let count = 0;
    for(const s of schemes) {
       db.prepare('INSERT INTO government_schemes (name,category,description,benefits,eligibility_criteria,required_documents,max_benefit_amount,ministry) VALUES (?,?,?,?,?,?,?,?)').run(s.name,s.category,s.description,s.benefits,JSON.stringify(s.eligibility_criteria||{}),JSON.stringify(s.required_documents||[]),s.max_benefit_amount||0,s.ministry||'');
       count++;
    }
    res.json({success:true, count});
  } catch(e) { res.status(500).json({detail: e.message}); }
});
// MARKETPLACE
router.get('/marketplace/products',(req,res)=>{ const {category,search,page=1,limit=20,seller_id}=req.query,db=getDb(); let q="SELECT p.*,u.full_name as seller_name FROM products p JOIN users u ON p.seller_id=u.id WHERE p.is_active=1",p=[]; if(category){q+=' AND p.category=?';p.push(category);} if(search){q+=' AND p.name LIKE ?';p.push(`%${search}%`);} if(seller_id){q+=' AND p.seller_id=?';p.push(seller_id);} const cntQ=q.replace("SELECT p.*,u.full_name as seller_name FROM products p JOIN users u ON p.seller_id=u.id","SELECT COUNT(*) as c FROM products p JOIN users u ON p.seller_id=u.id"); const total=db.prepare(cntQ).get(...p).c; res.json({items:db.prepare(q+` ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${(page-1)*limit}`).all(...p),total,page:Number(page),pages:Math.ceil(total/limit)}); });
router.get('/marketplace/products/:id',(req,res)=>{ const p=getDb().prepare('SELECT p.*,u.full_name as seller_name,u.phone as seller_phone FROM products p JOIN users u ON p.seller_id=u.id WHERE p.id=?').get(req.params.id); if(!p)return res.status(404).json({detail:'Not found'}); res.json(p); });
// product creation handled below (supports images)
// Allow images to be saved on create (expects `images` as array of URLs)
router.post('/marketplace/products',...requireMember,async(req,res)=>{ try{ const {name,description='',price,stock=0,category,image_emoji='📦',tags=[],images=[]}=req.body; if(!name?.trim())return res.status(400).json({detail:'Product name required'}); if(!price||price<=0)return res.status(400).json({detail:'Valid price required'}); if(!category)return res.status(400).json({detail:'Category required'}); const ai_desc=await genProductDesc(name,category,price); const db=getDb(); const id=db.prepare('INSERT INTO products (seller_id,name,description,ai_description,price,stock,category,image_emoji,tags,images) VALUES (?,?,?,?,?,?,?,?,?,?)').run(req.user.id,name.trim(),description,ai_desc,price,stock,category,image_emoji,JSON.stringify(tags),JSON.stringify(images||[])).lastInsertRowid; audit(db,req.user.id,'product_list','product',id,`${name} ₹${price}`); res.status(201).json(db.prepare('SELECT p.*,u.full_name as seller_name FROM products p JOIN users u ON p.seller_id=u.id WHERE p.id=?').get(id)); }catch(e){res.status(500).json({detail:e.message});} });
router.put('/marketplace/products/:id',authenticate,(req,res)=>{ try{ const db=getDb(),p=db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id); if(!p)return res.status(404).json({detail:'Not found'}); if(p.seller_id!==req.user.id&&req.user.role!=='admin')return res.status(403).json({detail:'Access denied'}); const {name,price,stock,category,description,image_emoji,is_active}=req.body; db.prepare("UPDATE products SET name=COALESCE(?,name),price=COALESCE(?,price),stock=COALESCE(?,stock),category=COALESCE(?,category),description=COALESCE(?,description),image_emoji=COALESCE(?,image_emoji),is_active=COALESCE(?,is_active),updated_at=datetime('now') WHERE id=?").run(name||null,price||null,stock||null,category||null,description||null,image_emoji||null,is_active!=null?is_active:null,req.params.id); res.json(db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id)); }catch(e){res.status(500).json({detail:e.message});} });

// DELETE product (soft-delete for sellers/admins)
router.delete('/marketplace/products/:id',authenticate,(req,res)=>{ try{ const db=getDb(),p=db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id); if(!p) return res.status(404).json({detail:'Product not found'}); if(p.seller_id!==req.user.id && req.user.role!=='admin') return res.status(403).json({detail:'Access denied'}); // soft delete
	db.prepare('UPDATE products SET is_active=0,updated_at=datetime("now") WHERE id=?').run(req.params.id); audit(db,req.user.id,'product_delete','product',req.params.id,`soft-delete`); res.json({success:true}); }catch(e){res.status(500).json({detail:e.message});} });

// Simple recommendations: top-selling or category-based personalized suggestions
router.get('/marketplace/recommendations',(req,res)=>{ try{ const db=getDb(); const {buyer_id,category,limit=6}=req.query; if(buyer_id){ // personalize by buyer past orders
		const cats = db.prepare('SELECT DISTINCT p.category FROM order_items oi JOIN products p ON oi.product_id=p.id JOIN orders o ON oi.order_id=o.id WHERE o.buyer_id=? ORDER BY oi.id DESC LIMIT 5').all(buyer_id).map(r=>r.category); if(cats.length){ const items=db.prepare('SELECT p.*,u.full_name as seller_name FROM products p JOIN users u ON p.seller_id=u.id WHERE p.is_active=1 AND p.category IN ('+cats.map(()=>'?').join(',')+') ORDER BY p.total_sold DESC LIMIT ?').all(...cats,Number(limit)); return res.json({items}); } }
	// category filter or top selling
	if(category) return res.json({items: db.prepare('SELECT p.*,u.full_name as seller_name FROM products p JOIN users u ON p.seller_id=u.id WHERE p.is_active=1 AND p.category=? ORDER BY p.total_sold DESC LIMIT ?').all(category,Number(limit))});
	const items = db.prepare('SELECT p.*,u.full_name as seller_name FROM products p JOIN users u ON p.seller_id=u.id WHERE p.is_active=1 ORDER BY p.total_sold DESC LIMIT ?').all(Number(limit)); res.json({items}); }catch(e){res.status(500).json({detail:e.message});} });

// Predict simple demand per category (rule-based estimate)
router.post('/marketplace/predict',(req,res)=>{ try{ const db=getDb(); const rows = db.prepare("SELECT category,SUM(total_sold) as sold,MIN(created_at) as first FROM products WHERE is_active=1 GROUP BY category").all(); const preds = rows.map(r=>{ const months = Math.max(1, Math.ceil((new Date()-new Date(r.first))/ (1000*60*60*24*30))); const perMonth = (r.sold||0)/months; return {category:r.category, predicted_next_30_days: Math.round(perMonth) }; }); res.json({predictions:preds}); }catch(e){res.status(500).json({detail:e.message});} });
router.post('/marketplace/orders',async(req,res)=>{ try{ const {buyer_name,buyer_phone,buyer_address,payment_method='cod',notes='',items,buyer_id}=req.body; if(!buyer_name?.trim())return res.status(400).json({detail:'Buyer name required'}); if(!buyer_phone||!/^[6-9]\d{9}$/.test(buyer_phone))return res.status(400).json({detail:'Valid 10-digit phone required'}); if(!buyer_address?.trim())return res.status(400).json({detail:'Delivery address required'}); if(!items?.length)return res.status(400).json({detail:'At least one item required'}); const db=getDb(); let total=0; const res2=[]; for(const item of items){const p=db.prepare('SELECT * FROM products WHERE id=? AND is_active=1').get(item.product_id);if(!p)return res.status(404).json({detail:`Product ${item.product_id} not found`});if(p.stock<item.quantity)return res.status(400).json({detail:`Only ${p.stock} units of "${p.name}" available`});const t=p.price*item.quantity;total+=t;res2.push({product:p,qty:item.quantity,total:t});} const on=`GS-ORD-${Date.now().toString(36).toUpperCase()}`; const oid=db.prepare('INSERT INTO orders (order_number,buyer_id,buyer_name,buyer_phone,buyer_address,total_amount,payment_method,notes) VALUES (?,?,?,?,?,?,?,?)').run(on,buyer_id||null,buyer_name.trim(),buyer_phone,buyer_address.trim(),total,payment_method,notes).lastInsertRowid; const sn=new Set(); for(const {product,qty,total:t} of res2){db.prepare('INSERT INTO order_items (order_id,product_id,quantity,unit_price,total_price) VALUES (?,?,?,?,?)').run(oid,product.id,qty,product.price,t);db.prepare("UPDATE products SET stock=stock-?,total_sold=total_sold+?,updated_at=datetime('now') WHERE id=?").run(qty,qty,product.id);if(!sn.has(product.seller_id)){notify(db,product.seller_id,'🛒 New Order!',`Order #${on}: "${product.name}" x${qty}. Total ₹${Math.round(total).toLocaleString('en-IN')}. Ship to: ${buyer_address.substring(0,50)}`,'order',oid,'order');sn.add(product.seller_id);}} if(buyer_id)notify(db,buyer_id,'✅ Order Placed!',`Order #${on} placed! Total: ₹${Math.round(total).toLocaleString('en-IN')}. Seller will confirm shortly.`,'order',oid,'order'); res.status(201).json({order:db.prepare('SELECT * FROM orders WHERE id=?').get(oid),total,order_number:on}); }catch(e){res.status(500).json({detail:e.message});} });
router.get('/marketplace/orders',authenticate,(req,res)=>{ const db=getDb(); const orders=req.user.role==='admin'?db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 100').all():db.prepare("SELECT DISTINCT o.* FROM orders o JOIN order_items oi ON o.id=oi.order_id JOIN products p ON oi.product_id=p.id WHERE p.seller_id=? ORDER BY o.created_at DESC").all(req.user.id); res.json(orders.map(o=>({...o,items:db.prepare('SELECT oi.*,p.name as product_name,p.image_emoji FROM order_items oi JOIN products p ON oi.product_id=p.id WHERE oi.order_id=?').all(o.id)}))); });
router.get('/marketplace/my-orders',authenticate,(req,res)=>{ const db=getDb(),orders=db.prepare("SELECT * FROM orders WHERE buyer_id=? ORDER BY created_at DESC").all(req.user.id); res.json(orders.map(o=>({...o,items:db.prepare('SELECT oi.*,p.name as product_name,p.image_emoji FROM order_items oi JOIN products p ON oi.product_id=p.id WHERE oi.order_id=?').all(o.id)}))); });
router.put('/marketplace/orders/:id/status',authenticate,(req,res)=>{ try{ const {status}=req.body; if(!['placed','confirmed','shipped','delivered','cancelled'].includes(status))return res.status(400).json({detail:'Invalid status'}); const db=getDb(),order=db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id); if(!order)return res.status(404).json({detail:'Order not found'}); db.prepare("UPDATE orders SET status=?,updated_at=datetime('now') WHERE id=?").run(status,req.params.id); const m={confirmed:'Seller confirmed your order. It will be shipped soon!',shipped:'Your order is on the way!',delivered:'Order delivered! Thank you for supporting rural artisans 🌱',cancelled:'Your order has been cancelled.'}; if(order.buyer_id&&m[status])notify(db,order.buyer_id,`Order ${status.charAt(0).toUpperCase()+status.slice(1)}`,m[status],'order',order.id,'order'); res.json({success:true,status}); }catch(e){res.status(500).json({detail:e.message});} });
// AI
router.post('/ai/scheme-check', authenticate, async (req, res) => {
	try {
        const { scheme_id } = req.body;
        const db = getDb();
        const scheme = db.prepare('SELECT * FROM government_schemes WHERE id=?').get(scheme_id);
        if(!scheme) return res.status(404).json({detail:'Scheme not found'});
        const profile = db.prepare('SELECT p.*,u.full_name as name FROM member_profiles p JOIN users u ON p.user_id=u.id WHERE p.user_id=?').get(req.user.id);
        const prompt = `Act as an expert village-level coordinator. The user "${profile?.name}" (Occupation: ${profile?.occupation||'N/A'}, Income: ${profile?.annual_income+' INR'||'N/A'}, District: ${profile?.district||'N/A'}, Credit Score: ${profile?.credit_score||'N/A'}) wants to know if they are eligible for the government scheme "${scheme.name}". 
Scheme Benefits: ${scheme.benefits}
Scheme Eligibility: ${scheme.eligibility_criteria}
Required Documents: ${scheme.required_documents}

Write a short, friendly, personalized 2-paragraph response explaining: 
1. Are they likely eligible based on their profile data? 
2. What are the specific next steps and documents they should gather?
Keep the language extremely simple and empowering. Avoid legal jargon.`;
        const lang = req.body.language || req.body.lang;
        const reply = await getAIResponse(prompt, [], lang);
        res.json({ reply });
	} catch (e) {
		console.error('[api] /ai/scheme-check error', e);
		res.status(500).json({ detail: e.message || 'AI error' });
	}
});

router.post('/ai/chat', authenticate, async (req, res) => {
	try {
		const { message, conversation_history = [] } = req.body;
		if (!message?.trim()) return res.status(400).json({ detail: 'message required' });
		const db = getDb();
		const past = db.prepare('SELECT message,response FROM ai_conversations WHERE user_id=? ORDER BY created_at DESC LIMIT 5').all(req.user.id)
			.reverse()
			.flatMap(r => [{ role: 'user', content: r.message }, { role: 'assistant', content: r.response }]);

		try {
			const lang = req.body && (req.body.language || req.body.lang) ? (req.body.language || req.body.lang) : null
			const reply = await getAIResponse(message.trim(), [...past, ...conversation_history.slice(-4)], lang);
			db.prepare('INSERT INTO ai_conversations (user_id,message,response) VALUES (?,?,?)').run(req.user.id, message.trim(), reply);
			const m = message.toLowerCase(), sug = [];
			if (!m.includes('scheme')) sug.push('What government schemes am I eligible for?');
			if (!m.includes('loan')) sug.push('How to apply for a MUDRA loan?');
			if (sug.length < 3) sug.push('What income opportunities suit my skills?');
			return res.json({ reply, suggestions: sug.slice(0, 3) });
		} catch (aiErr) {
			console.error('[api] /ai/chat error', aiErr && aiErr.message, aiErr);
			const status = (aiErr && (aiErr.status || aiErr.statusCode)) ? (aiErr.status || aiErr.statusCode) : 500;
			const detail = aiErr?.message || 'AI service unavailable';
			const isMissingKey = detail.includes('No GROQ key') || detail.includes('No Gemini key');
			const userMessage = isMissingKey 
				? 'AI service not configured. Please set up API keys (GROQ_API_KEY or GEMINI_API_KEY in .env)'
				: detail;
			console.error(`[api] /ai/chat response: status=${status}, message="${userMessage}"`);
			return res.status(status).json({ detail: userMessage });
		}
	} catch (e) {
		console.error('[api] /ai/chat outer', e && e.message);
		res.status(500).json({ detail: e.message });
	}
});
// Server-side Parler TTS - streams WAV audio produced by backend Python script
router.post('/ai/tts', authenticate, async (req, res) => {
	try {
		const { text, description, speaker, provider } = req.body || {}
		if (!text || !text.trim()) return res.status(400).json({ detail: 'text required' })

		// If hosted provider requested or configured, try calling it first when forced
		const hostedProvider = provider || process.env.HOSTED_TTS_PROVIDER || null
		const HF_KEY = process.env.HF_API_KEY
		const preferHosted = process.env.FORCE_HOSTED_TTS === '1'

		// Helper to stream response body
		const streamResponse = async (stream, contentType='audio/wav') => {
			try {
				res.setHeader('Content-Type', contentType)
				res.setHeader('Content-Disposition', 'inline; filename="tts.wav"')
				if (stream.pipe) stream.pipe(res)
				else {
					// buffer
					const buf = await stream.arrayBuffer()
					res.end(Buffer.from(buf))
				}
			} catch (e) { console.error('streamResponse error', e); if (!res.headersSent) res.status(500).json({ detail: 'stream error' }) }
		}

		// Try hosted HuggingFace inference if configured and available
		if ((hostedProvider === 'hf' || (hostedProvider === null && process.env.HOSTED_TTS_PROVIDER === 'hf')) && HF_KEY) {
			try {
				const fetch = require('node-fetch')
				const url = `https://api-inference.huggingface.co/models/ai4bharat/indic-parler-tts`
				const body = { inputs: text, parameters: { description: description || '', speaker: speaker || '', lang: req.body.language || req.body.lang || null } }
				const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${HF_KEY}`, 'Accept': 'audio/wav', 'Content-Type': 'application/json' }, body: JSON.stringify(body), timeout: 120000 })
				if (r.ok) {
					// stream HF binary response
					return streamResponse(r.body, r.headers.get('content-type') || 'audio/wav')
				} else {
					const errbody = await r.text().catch(()=>'')
					console.error('[tts] hosted hf non-ok', r.status, errbody.substring? errbody.substring(0,200): errbody)
					if (preferHosted) return res.status(502).json({ detail: 'Hosted TTS failed', error: errbody.slice? errbody.slice(0,200): errbody })
				}
			} catch (e) { console.error('[tts] hosted hf error', e); if (preferHosted) return res.status(502).json({ detail: 'Hosted TTS error', error: String(e).slice(0,200) }) }
		}

		// Fallback to local Python script execution
		const PY = process.env.PYTHON_BIN || 'python'
		const spawn = require('child_process').spawn
		const py = spawn(PY, ['scripts/parler_tts.py'], { cwd: path.resolve(__dirname, '..') })

		// pipe JSON input (include language if provided)
		py.stdin.write(JSON.stringify({ text, description: description || '', speaker: speaker || '', lang: req.body.language || req.body.lang || null }))
		py.stdin.end()

		let sentHeaders = false
		py.stdout.on('data', chunk => {
			if (!sentHeaders) {
				sentHeaders = true
				res.setHeader('Content-Type', 'audio/wav')
				res.setHeader('Content-Disposition', 'inline; filename="tts.wav"')
			}
			res.write(chunk)
		})

		let errBuf = ''
		py.stderr.on('data', d => { errBuf += d.toString() })

		py.on('close', code => {
			if (!sentHeaders) {
				// no audio produced
				console.error('[tts] local python failed', errBuf.substring? errBuf.substring(0,200): errBuf)
				return res.status(502).json({ detail: 'TTS generation failed', error: errBuf.slice? errBuf.slice(0,200): errBuf })
			}
			res.end()
		})

		py.on('error', err => { console.error('parler_tts spawn error', err); if (!res.headersSent) res.status(500).json({ detail: 'parler_tts spawn error' }) })
	} catch (e) {
		console.error('tts route error', e && e.message)
		res.status(500).json({ detail: e.message })
	}
});

router.get('/ai/chat/history',authenticate,(req,res)=>res.json(getDb().prepare('SELECT * FROM ai_conversations WHERE user_id=? ORDER BY created_at DESC LIMIT 20').all(req.user.id)));
router.post('/ai/health',authenticate,async(req,res)=>{ try{ const {query}=req.body; if(!query?.trim())return res.status(400).json({detail:'query required'}); const response=await getHealthResponse(query.trim()); const q=query.toLowerCase(),cat=q.match(/pregnant|maternal/)?'maternal':q.match(/food|eat|nutrition/)?'nutrition':q.match(/mental|stress/)?'mental':q.match(/child|baby|vaccine/)?'child':'general'; const db=getDb(),id=db.prepare('INSERT INTO health_queries (user_id,query_text,response,category) VALUES (?,?,?,?)').run(req.user.id,query.trim(),response,cat).lastInsertRowid; res.json(db.prepare('SELECT * FROM health_queries WHERE id=?').get(id)); }catch(e){res.status(500).json({detail:e.message});} });
router.get('/ai/health/history',authenticate,(req,res)=>res.json(getDb().prepare('SELECT * FROM health_queries WHERE user_id=? ORDER BY created_at DESC LIMIT 20').all(req.user.id)));
router.get('/ai/livelihoods',authenticate,(req,res)=>{ const recs=getLivelihoods(req.user.id),skills=getDb().prepare('SELECT s.name FROM member_skills ms JOIN skills s ON ms.skill_id=s.id WHERE ms.member_id=?').all(req.user.id).map(r=>r.name); res.json({recommendations:recs,user_skills:skills}); });
// SHG
router.get('/shg',...requireCoordinator,(req,res)=>res.json(getDb().prepare('SELECT * FROM shg_groups WHERE is_active=1 ORDER BY name').all()));
router.post('/shg',...requireCoordinator,(req,res)=>{ try{ const {name,village='',district='',state='Telangana',reg_number}=req.body; if(!name)return res.status(400).json({detail:'Group name required'}); const db=getDb(),id=db.prepare('INSERT INTO shg_groups (name,reg_number,village,district,state,coordinator_id) VALUES (?,?,?,?,?,?)').run(name,reg_number||null,village,district,state,req.user.id).lastInsertRowid; res.status(201).json(db.prepare('SELECT * FROM shg_groups WHERE id=?').get(id)); }catch(e){res.status(500).json({detail:e.message});} });
router.post('/shg/:id/assign-member',...requireCoordinator,(req,res)=>{ const {member_id}=req.body; if(!member_id)return res.status(400).json({detail:'member_id required'}); const db=getDb(); db.prepare('UPDATE member_profiles SET shg_id=? WHERE user_id=?').run(req.params.id,member_id); db.prepare('UPDATE shg_groups SET total_members=(SELECT COUNT(*) FROM member_profiles WHERE shg_id=?) WHERE id=?').run(req.params.id,req.params.id); notify(db,Number(member_id),'👥 Added to SHG','You have been added to an SHG group!','system'); res.json({success:true}); });
// UPLOAD
router.post('/upload',authenticate,upload.single('file'),(req,res)=>{ if(!req.file)return res.status(400).json({detail:'No file uploaded'}); res.json({url:`/uploads/${req.file.filename}`,filename:req.file.filename,size:req.file.size}); });

// ADMIN: AI keys management (stored in backend/ai_keys.json)
router.get('/admin/ai-keys',...requireAdmin,(req,res)=>{ try{ const p=path.resolve(__dirname,'..','..','ai_keys.json'); if(!fs.existsSync(p)) return res.json({groq:false,gemini:false}); const j=JSON.parse(fs.readFileSync(p,'utf8')); res.json({groq:!!(process.env.GROQ_API_KEY||j.groq_key),gemini:!!(process.env.GEMINI_API_KEY||j.gemini_key)}); }catch(e){res.status(500).json({detail:e.message});} });
router.post('/admin/ai-keys',...requireAdmin,(req,res)=>{ try{ const {groq_key,gemini_key}=req.body; const p=path.resolve(__dirname,'..','..','ai_keys.json'); const data={groq_key:groq_key||null,gemini_key:gemini_key||null,updated_at:new Date().toISOString(),updated_by:req.user.id}; fs.writeFileSync(p,JSON.stringify(data, null, 2),'utf8'); // load into env for current process
	if (groq_key) process.env.GROQ_API_KEY = groq_key; if (gemini_key) process.env.GEMINI_API_KEY = gemini_key; audit(getDb(),req.user.id,'admin_update','ai_keys',null,`Updated keys`); res.json({success:true}); }catch(e){res.status(500).json({detail:e.message});} });
module.exports = router;
