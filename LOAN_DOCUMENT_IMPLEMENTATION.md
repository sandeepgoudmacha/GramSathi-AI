# Loan Document Upload & Verification System

## Overview
Implemented a complete document upload system for SHG member loan applications with real-time coordinator/bank officer review and member feedback.

## Features Implemented

### 1. Member Loan Application (Frontend)
**File:** `frontend/src/pages/Core.tsx`
- Updated loan application form with file upload fields:
  - Bank Passbook (PDF/JPG/PNG)
  - Aadhaar Card (PDF/JPG/PNG)
- Files are validated on the frontend (required fields)
- Uses FormData for multipart file uploads
- Shows real-time upload status and instant member feedback

### 2. Backend File Upload Handler
**File:** `backend/routes/api.js` (Line 65+)
- Enhanced `POST /loans/apply` endpoint with multer middleware
- Accepts multipart form data with files
- Saves files to `./uploads` directory with unique filenames
- Creates database records with file paths
- Validates file presence (both documents required)

### 3. Database Schema Updates
**File:** `backend/db/database.js`
- Added new fields to `loans` table:
  - `bank_passbook_path`: TEXT - Path to uploaded bank passbook
  - `aadhaar_path`: TEXT - Path to uploaded Aadhaar document
- All other loan fields preserved (status, remarks, rejection_reason, etc.)

### 4. Document Retrieval Endpoints
**File:** `backend/routes/api.js` (Post-repayment section)

#### `GET /loans/:id/documents`
- Returns loan documents for viewing
- Access control (member, coordinator, bank_officer, admin only)
- Response: `{ loan_id, loan_number, documents: [{document_type, file_path, upload_date}] }`

#### `GET /loans/download/:filename`
- Downloads a specific document file
- Path traversal security checks
- Sets proper filename in response headers

### 5. Coordinator/Bank Officer Review Interface
**File:** `frontend/src/pages/Management.tsx` (Line 786+)
- Enhanced loan review modal with document display section
- Shows both Bank Passbook and Aadhaar documents
- Direct download links with document type indicators
- Color-coded document sections (blue for passbook, purple for Aadhaar)

### 6. Member Loan Status Dashboard
**File:** `frontend/src/pages/Core.tsx`
- New detailed loan view modal showing:
  - Loan amount and duration
  - Purpose and credit score
  - **Approval Notification**: Shows when loan is approved with officer notes
  - **Rejection Notification**: Shows rejection reason with timestamp
  - **Review Status**: Shows "Under Review" for pending applications
- Click on any loan number to view full details
- Real-time WebSocket notifications for status changes

### 7. API Integration
**File:** `frontend/src/services/api.ts`
- Added `loansApi.documents(id)` endpoint for fetching loan documents

## Workflow

### Member Application Process
1. Member clicks "Apply for Loan"
2. Fills loan amount, purpose, duration, collateral
3. **REQUIRED**: Uploads Bank Passbook
4. **REQUIRED**: Uploads Aadhaar Card
5. Submits application with documents
6. Receives confirmation with AI credit score
7. Loan enters "pending" status

### Coordinator Review Process
1. Sees new loan in dashboard
2. Opens loan details modal
3. Views applicant information and AI credit score
4. **Downloads and verifies documents** (Bank Passbook, Aadhaar)
5. Either:
   - Approves → Forwards to Bank Officer
   - Rejects → Member receives rejection reason immediately

### Bank Officer Approval Process
1. Reviews forwarded loans
2. Opens loan review modal
3. **Downloads and verifies documents** (Bank Passbook, Aadhaar)
4. Sets interest rate (optional override)
5. Approves or Rejects with remarks
6. Member receives instant notification

### Member Receives Decision
1. **Real-time WebSocket notification** of approval/rejection
2. Can view full loan details with:
   - Approval status with officer notes
   - Rejection reason (if rejected)
   - Next steps and timeline
3. Approved loans show repayment schedule

## Technical Stack

### Backend
- Express.js with Multer for file uploads
- SQLite3 database with path storage
- RESTful API with proper authentication
- Role-based access control (member, coordinator, bank_officer, admin)

### Frontend
- React with TypeScript
- React Query for data management
- React Hook Form for form handling
- Tailwind CSS for styling
- FormData API for multipart uploads

## File Storage

Documents are stored in:
- **Location**: `backend/uploads/` directory
- **File naming**: `{timestamp}-{randomId}.{extension}`
- **Example**: `1710593142501-a3f2k8.pdf`

Database stores relative paths:
- **Example**: `uploads/1710593142501-a3f2k8.pdf`

## Security Features

1. **File Validation**
   - Accepts only PDF and image files (JPG, PNG)
   - Frontend file type checking
   - Backend multer size limits (10MB)

2. **Access Control**
   - Only file owner, coordinators, bank officers, admins can view
   - Path traversal protection in download endpoint
   - JWT token authentication required

3. **Data Privacy**
   - Documents not served through web root
   - Unique filenames prevent enumeration
   - Proper MIME types in downloads

## API Endpoints Summary

| Endpoint | Method | Access | Purpose |
|----------|--------|--------|---------|
| `/loans/apply` | POST | Member | Submit loan with documents |
| `/loans/:id/documents` | GET | Member/Coordinator/Officer | View loan documents |
| `/loans/download/:filename` | GET | Authenticated | Download document file |
| `/loans/:id/review` | POST | Coordinator/Officer | Approve/Reject loan |
| `/loans/:id` | GET | Member/Coordinator/Officer | View loan details |

## Error Handling

- Missing files: "Bank passbook document required" / "Aadhaar card required"
- Invalid file types: Caught by browser + server validation
- Access denied: 403 error with "Access denied" message
- File not found: 404 error with "File not found" message

## Real-time Notifications

Members receive instant notifications for:
- ✅ Loan approved with officer notes
- ❌ Loan rejected with reason
- 📤 Loan forwarded for officer review

Notifications via WebSocket to member pages with:
- Toast notifications
- Notification center badge
- Automatic dashboard refresh

## Testing Checklist

- [x] Member can upload bank passbook and Aadhaar
- [x] Coordinator can view and download documents
- [x] Bank officer can view and download documents  
- [x] Member receives approval notification instantly
- [x] Member receives rejection with reason instantly
- [x] Loan status shows in member dashboard
- [x] Documents visible in coordinator review modal
- [x] File download works correctly
- [x] Access control prevents unauthorized viewing
- [x] WebSocket notifications working (after port fix)

## Future Enhancements

1. **Document Expiry**: Add document validity period
2. **Resubmission**: Allow members to resubmit rejected applications with new documents
3. **Document Verification**: Add OCR for automated document verification
4. **Email Receipts**: Send documents to member email after approval
5. **Document Archive**: Move documents to secure cold storage after loan closure
6. **Digital Signature**: Add signature verification for documents
7. **Bulk Upload**: Allow uploading multiple supporting documents (bills, receipts, etc.)
