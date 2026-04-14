# 🎓 Training Programs Feature - Complete Guide

## Overview
The Training Programs feature allows SHG members to discover, enroll, and track free skill development programs. All programs are **100% FREE** for SHG members.

## ✨ Features

### For Members
- ✅ Browse all available training programs
- ✅ View program details (duration, mode, location, start date)
- ✅ Enroll with one click
- ✅ View seats remaining (real-time capacity tracking)
- ✅ Receive enrollment confirmation notifications
- ✅ Track my enrollments in dedicated tab
- ✅ View enrollment status and program details

### For Coordinators
- ✅ Create new training programs
- ✅ Manage program details and capacity
- ✅ View enrolled members
- ✅ Automatic notifications to SHG members

### For Admins
- ✅ Full access to all member and coordinator features
- ✅ Monitor program popularity and enrollment metrics
- ✅ View dashboard with training programs

## 📊 Available Training Programs (Pre-seeded)

### 1. 🧵 Advanced Tailoring & Pattern Making
- **Provider**: NRLM Telangana
- **Duration**: 30 days (intensive)
- **Mode**: Offline
- **Location**: Nalgonda District Office
- **Capacity**: 20 seats
- **Start Date**: March 25, 2026
- **Description**: Intensive tailoring course covering modern techniques, pattern making and quality finishing

### 2. 💳 Digital Payments & UPI for SHGs
- **Provider**: Google Digi Unnati
- **Duration**: 7 days
- **Mode**: Online
- **Capacity**: 50 seats
- **Start Date**: March 20, 2026
- **Description**: Learn UPI, QR codes, digital bookkeeping and online banking for SHG operations

### 3. 🍎 Organic Food Processing & FSSAI Certification
- **Provider**: FSSAI Regional Center
- **Duration**: 14 days
- **Mode**: Offline
- **Location**: Hyderabad
- **Capacity**: 15 seats
- **Start Date**: April 1, 2026
- **Description**: Food safety, FSSAI licensing, packaging and marketing of processed food products

### 4. 🍄 Mushroom Cultivation Intensive
- **Provider**: Agriculture Department, Telangana
- **Duration**: 5 days
- **Mode**: Offline
- **Location**: Karimnagar ATMA
- **Capacity**: 12 seats
- **Start Date**: April 10, 2026
- **Description**: Complete A-Z mushroom farming — substrate, spawn, harvesting, packaging and marketing

### 5. 💰 Financial Literacy & SHG Management
- **Provider**: NABARD
- **Duration**: 3 days
- **Mode**: Online
- **Capacity**: 40 seats
- **Start Date**: March 28, 2026
- **Description**: Savings, loans, interest calculation, digital ledger and banking for SHG leaders

### 6. 🎨 Bamboo & Cane Craft Mastery
- **Provider**: Tribal Welfare Department
- **Duration**: 21 days
- **Mode**: Offline
- **Location**: Adilabad
- **Capacity**: 10 seats
- **Start Date**: April 15, 2026
- **Description**: Traditional crafts modernized for export markets — baskets, furniture, decor items

## 🔌 API Endpoints

### Public Endpoints

#### Get All Training Programs
```http
GET /api/v1/training
```

**Response:**
```json
[
  {
    "id": 1,
    "title": "Advanced Tailoring & Pattern Making",
    "description": "30-day intensive...",
    "provider": "NRLM Telangana",
    "mode": "offline",
    "duration_days": 30,
    "start_date": "2026-03-25",
    "location": "Nalgonda District Office",
    "max_participants": 20,
    "enrolled_count": 8,
    "is_free": 1,
    "is_active": 1,
    "is_enrolled": false,
    "seats_left": 12,
    "created_at": "2026-03-14T10:30:00"
  }
  // ... more programs
]
```

#### Get Training Program Details
```http
GET /api/v1/training/:id
```

**Response:**
```json
{
  "id": 1,
  "title": "Advanced Tailoring & Pattern Making",
  "description": "30-day intensive...",
  "provider": "NRLM Telangana",
  "mode": "offline",
  "duration_days": 30,
  "start_date": "2026-03-25",
  "location": "Nalgonda District Office",
  "max_participants": 20,
  "enrolled_count": 8,
  "is_free": 1,
  "is_active": 1,
  "is_enrolled": true,
  "seats_left": 12,
  "enrolled_members": [
    {
      "id": 2,
      "full_name": "Savitha Kumar",
      "phone": "9876543210"
    },
    // ... more enrolled members
  ]
}
```

### Authenticated Endpoints

#### Enroll in Training Program
```http
POST /api/v1/training/:id/enroll
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Enrolled in Advanced Tailoring & Pattern Making",
  "program": {
    "id": 1,
    "title": "Advanced Tailoring & Pattern Making",
    "enrolled_count": 9,
    // ... program details
  }
}
```

**Error Responses:**
- `404`: Program not found
- `400`: Program is full
- `409`: Already enrolled in this program

#### Get My Enrollments
```http
GET /api/v1/training/my-enrollments
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 5,
    "program_id": 1,
    "member_id": 2,
    "enrolled_at": "2026-03-15T14:30:00",
    "status": "enrolled",
    "title": "Advanced Tailoring & Pattern Making",
    "provider": "NRLM Telangana",
    "mode": "offline",
    "start_date": "2026-03-25",
    "location": "Nalgonda District Office",
    "duration_days": 30,
    "description": "30-day intensive..."
  }
  // ... more enrollments
}
```

### Admin/Coordinator Endpoints

#### Create New Training Program
```http
POST /api/v1/training
Authorization: Bearer <coordinator_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Advanced Accounting for SHGs",
  "description": "Learn GST, tax filing, PAN registration",
  "provider": "CA Association",
  "mode": "offline",
  "duration_days": 5,
  "start_date": "2026-04-20",
  "location": "District Training Center",
  "max_participants": 30
}
```

**Response:**
```json
{
  "id": 7,
  "title": "Advanced Accounting for SHGs",
  "description": "Learn GST, tax filing, PAN registration",
  "provider": "CA Association",
  "mode": "offline",
  "duration_days": 5,
  "start_date": "2026-04-20",
  "location": "District Training Center",
  "max_participants": 30,
  "enrolled_count": 0,
  "is_free": 1,
  "is_active": 1,
  "created_at": "2026-03-15T15:45:00"
}
```

#### Get All Training Programs with Enrollment Stats (Coordinator)
```http
GET /api/v1/coordinator/training-programs
Authorization: Bearer <coordinator_token>
```

**Response:**
```json
[
  {
    "id": 1,
    "title": "Advanced Tailoring & Pattern Making",
    "description": "30-day intensive...",
    "provider": "NRLM Telangana",
    "mode": "offline",
    "duration_days": 30,
    "start_date": "2026-03-25",
    "location": "Nalgonda District Office",
    "max_participants": 20,
    "enrolled_count": 12,
    "seats_left": 8,
    "enrollment_percentage": 60,
    "is_free": 1,
    "is_active": 1
  }
  // ... more programs
]
```

#### Get Enrollments for a Specific Training Program
```http
GET /api/v1/coordinator/training-programs/:id/enrollments
Authorization: Bearer <coordinator_token>
```

**Response:**
```json
{
  "program": {
    "id": 1,
    "title": "Advanced Tailoring & Pattern Making",
    "provider": "NRLM Telangana",
    "duration_days": 30,
    "max_participants": 20
  },
  "total_enrolled": 12,
  "seats_left": 8,
  "enrollments": [
    {
      "id": 5,
      "member_id": 2,
      "full_name": "Savitha Kumar",
      "phone": "9876543210",
      "village": "Nalgonda",
      "district": "Nalgonda",
      "occupation": "Tailor",
      "enrolled_at": "2026-03-15T14:30:00",
      "status": "enrolled"
    },
    {
      "id": 6,
      "member_id": 5,
      "full_name": "Lakshmi Devi",
      "phone": "9234567890",
      "village": "Narayanapur",
      "district": "Nalgonda",
      "occupation": "Homemaker",
      "enrolled_at": "2026-03-16T10:15:00",
      "status": "enrolled"
    }
    // ... more enrollments
  ]
}
```

## 🖥️ Frontend Implementation

### Member Features

#### Accessing Training Programs

#### 1. Navigate to Skills & Training
- Click "Skills & Training" in sidebar navigation
- Three tabs available:
  - **My Skills**: Manage your skills inventory
  - **Training Programs**: Browse and enroll in programs
  - **My Enrollments**: View your active enrollments

#### 2. Enroll in a Program
- Go to "Training Programs" tab
- Review program details in the table
- Click "Enroll" button to register
- You'll receive a confirmation notification
- Status changes to "✓ Enrolled"

#### 3. View My Enrollments
- Click "My Enrollments" tab
- See all your active training enrollments
- View program details, dates, locations
- Track enrollment status

### Coordinator Features

#### Managing Training Programs

##### 1. Navigate to Coordinator Dashboard
- Login as coordinator/admin
- Click "Group Management" in navigation
- Click "Training" tab

##### 2. Create New Training Program
- Click "Create Program" button
- Fill in program details:
  - Title (required)
  - Description
  - Provider name
  - Duration in days (required)
  - Mode (Offline/Online/Hybrid)
  - Start date
  - Location (for offline programs)
  - Maximum participants
- Submit form
- All SHG members receive notification

##### 3. View All Training Programs
- See list of all created programs
- View:
  - Current enrollment count vs. capacity
  - Enrollment percentage
  - Remaining seats
  - Program type and duration
- Click on program card to view enrollments

##### 4. View Program Enrollments
- Click on any training program
- See detailed enrollments including:
  - Member name and phone
  - Location (village/district)
  - Occupation
  - Enrollment date
  - Enrollment status
- Export enrollment data if needed

### Usage Example (TypeScript/React)

#### Member Usage
```typescript
import { trainingApi } from '@/services/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

function TrainingComponent() {
  const qc = useQueryClient()

  // Get all training programs
  const { data: programs } = useQuery({
    queryKey: ['training'],
    queryFn: () => trainingApi.list().then(r => r.data)
  })

  // Get user's enrollments
  const { data: myEnrollments } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: () => trainingApi.myEnrollments().then(r => r.data)
  })

  // Enroll in training
  const enrollMutation = useMutation({
    mutationFn: (id: number) => trainingApi.enroll(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training'] })
      qc.invalidateQueries({ queryKey: ['my-enrollments'] })
    }
  })

  const handleEnroll = (programId: number) => {
    enrollMutation.mutate(programId)
  }

  return (
    <div>
      {programs?.map(program => (
        <div key={program.id}>
          <h3>{program.title}</h3>
          <p>{program.provider}</p>
          <p>Seats Left: {program.seats_left}</p>
          {program.is_enrolled ? (
            <span>✓ Enrolled</span>
          ) : (
            <button onClick={() => handleEnroll(program.id)}>
              Enroll Now
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
```

#### Coordinator Usage
```typescript
import { trainingApi } from '@/services/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

function CoordinatorTrainingComponent() {
  const qc = useQueryClient()
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null)

  // Get all training programs with enrollment stats
  const { data: programs } = useQuery({
    queryKey: ['coordinator-training-programs'],
    queryFn: () => trainingApi.allPrograms().then(r => r.data)
  })

  // Get enrollments for a specific program
  const { data: enrollments } = useQuery({
    queryKey: ['training-enrollments', selectedProgramId],
    queryFn: () => trainingApi.programEnrollments(selectedProgramId!).then(r => r.data),
    enabled: !!selectedProgramId
  })

  // Create new training program
  const createMutation = useMutation({
    mutationFn: (formData: any) => trainingApi.create(formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coordinator-training-programs'] })
      qc.invalidateQueries({ queryKey: ['training'] })
    }
  })

  return (
    <div>
      <h2>Training Programs Management</h2>
      
      {/* Program list */}
      {programs?.map(program => (
        <div key={program.id} onClick={() => setSelectedProgramId(program.id)}>
          <h3>{program.title}</h3>
          <p>Enrolled: {program.enrolled_count} / {program.max_participants}</p>
          <p>Fill: {program.enrollment_percentage}%</p>
        </div>
      ))}

      {/* Enrollments for selected program */}
      {selectedProgramId && enrollments && (
        <div>
          <h3>Enrollments: {enrollments.program.title}</h3>
          <p>Total: {enrollments.total_enrolled} / {enrollments.program.max_participants}</p>
          <table>
            <thead>
              <tr>
                <th>Member Name</th>
                <th>Phone</th>
                <th>Location</th>
                <th>Enrolled Date</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.enrollments.map(enrollment => (
                <tr key={enrollment.id}>
                  <td>{enrollment.full_name}</td>
                  <td>{enrollment.phone}</td>
                  <td>{enrollment.village}, {enrollment.district}</td>
                  <td>{new Date(enrollment.enrolled_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

## 🧪 Testing Guide

### Prerequisites
```bash
# Make sure backend is running
npm run server
# Make sure frontend is running  
npm run dev
```

### Test Cases

#### ✅ Test 1: Coordinator Creates Training Program
1. Login as coordinator
2. Navigate to Group Management → Training tab
3. Click "Create Program" button
4. Fill form with:
   - Title: "Test Tailoring Course"
   - Duration: 7 days
   - Mode: Offline
   - Provider: Test Provider
   - Location: Test Location
   - Max participants: 15
5. Submit
6. **Expected**: 
   - Program created successfully
   - Toast notification shows success
   - New program appears in list
   - All members receive notification

#### ✅ Test 2: Member Enrolls in Training (as Member)
1. Login as member
2. Navigate to Skills & Training → Training Programs tab
3. Find the test program created in Test 1
4. Click "Enroll" button
5. **Expected**:
   - Enrollment succeeds
   - Toast notification "Enrolled successfully! 🎓"
   - Status changes to "✓ Enrolled"
   - Confirmation notification received

#### ✅ Test 3: Coordinator Views Enrollments
1. Login as coordinator (same as from Test 1)
2. Navigate to Group Management → Training tab
3. See list of all programs
4. Click on "Test Tailoring Course"
5. **Expected**:
   - Shows "1 / 15 enrolled"
   - Shows the enrolled member in the enrollments table
   - Displays member details: name, phone, location, occupation, enrollment date

#### ✅ Test 4: Multiple Enrollments
1. Enroll 3-5 members from different accounts
2. Coordinator views the same training program
3. **Expected**:
   - Enrollment count updates correctly (e.g., "5 / 15")
   - All enrolled members appear in the table
   - Enrollment percentage shows (e.g., "33% full")

#### ✅ Test 5: Capacity Full Scenario
1. Create a training program with max_participants = 2
2. Enroll 2 members
3. Try to enroll a 3rd member
4. **Expected**:
   - "Enroll" button disabled
   - Shows "Full" instead of button
   - Attempting to enroll returns error "Program is full"

#### ✅ Test 6: View My Enrollments (Member)
1. Login as member with active enrollments
2. Navigate to Skills & Training → My Enrollments tab
3. **Expected**:
   - All enrolled programs display as cards
   - Shows program details: title, provider, duration, mode, location, start date
   - Displays enrollment date

#### ✅ Test 7: Responsive UI - Coordinator Dashboard
1. Test on mobile (< 768px width)
2. **Expected**: 
   - Program cards responsive
   - Enrollment table shows relevant columns
   - Buttons work properly
3. Test on tablet and desktop
4. **Expected**: Proper display on all sizes

#### ✅ Test 8: Duplicate Enrollment Prevention
1. Enroll as member in a program
2. Try to enroll again in the same program
3. **Expected**: Error "Already enrolled in this program"

### Manual API Testing (cURL)

```bash
# 1. Get all training programs (no auth required)
curl http://localhost:5000/api/v1/training

# 2. Coordinator: Get all programs with enrollment stats
curl http://localhost:5000/api/v1/coordinator/training-programs \
  -H "Authorization: Bearer COORDINATOR_TOKEN"

# 3. Coordinator: Get enrollments for program ID 1
curl http://localhost:5000/api/v1/coordinator/training-programs/1/enrollments \
  -H "Authorization: Bearer COORDINATOR_TOKEN"

# 4. Member: Enroll in training
curl -X POST http://localhost:5000/api/v1/training/1/enroll \
  -H "Authorization: Bearer MEMBER_TOKEN" \
  -H "Content-Type: application/json"

# 5. Member: Get my enrollments
curl http://localhost:5000/api/v1/training/my-enrollments \
  -H "Authorization: Bearer MEMBER_TOKEN"

# 6. Get training program details
curl http://localhost:5000/api/v1/training/1

# 7. Coordinator: Create training program
curl -X POST http://localhost:5000/api/v1/training \
  -H "Authorization: Bearer COORDINATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Training",
    "duration_days": 5,
    "mode": "offline",
    "provider": "Test",
    "location": "Test Location",
    "max_participants": 20
  }'
```

## 🔄 Data Flow

```
User Opens Skills & Training
        ↓
Frontend calls GET /training
        ↓
Backend returns programs + is_enrolled flag
        ↓
User sees programs with enrollment status
        ↓
User clicks Enroll
        ↓
Frontend calls POST /training/:id/enroll
        ↓
Backend:
  - Validates program exists
  - Checks capacity
  - Checks not already enrolled
  - Creates enrollment record
  - Increments enrolled_count
  - Sends notification
        ↓
Frontend:
  - Shows success toast
  - Refreshes training list
  - Refreshes my enrollments
  - UI updates to show ✓ Enrolled
```

## 🐛 Troubleshooting

### Problem: "Program not found" (404)
- **Check**: Program ID is correct
- **Check**: Program is_active = 1 in database
- **Fix**: Reseed database

### Problem: "Already enrolled" (409)
- **Expected**: Each user can enroll only once per program
- **Fix**: Check my-enrollments tab, you're already enrolled
- **Solution**: Try enrolling in a different program

### Problem: Seats showing as full
- **Check**: enrolled_count >= max_participants
- **Fix**: Contact program coordinator to increase capacity
- **Workaround**: Try different program

### Problem: Notifications not received
- **Check**: WebSocket connection is active
- **Check**: User ID is correct
- **Fix**: Refresh page or restart backend

### Problem: Frontend showing old data
- **Clear**: Browser cache and local storage
- **Hard refresh**: Ctrl+Shift+R (Cmd+Shift+R on Mac)
- **Restart**: Frontend dev server

## 📈 Future Enhancements

- [ ] Email notifications with program materials
- [ ] Certificate generation on completion
- [ ] Progress tracking within programs
- [ ] Testimonials and ratings from past participants
- [ ] Video pre-training materials
- [ ] Attendance tracking via QR codes
- [ ] Job placement assistance for completers
- [ ] Advanced scheduling and multi-batch support
- [ ] Export training reports for SHG coordinators
- [ ] Integration with payment gateways (if paid programs added)

## 📝 Database Schema

### training_programs
```sql
CREATE TABLE training_programs (
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
```

### training_enrollments
```sql
CREATE TABLE training_enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL REFERENCES training_programs(id),
  member_id INTEGER NOT NULL REFERENCES users(id),
  enrolled_at TEXT DEFAULT (datetime('now')),
  status TEXT DEFAULT 'enrolled' CHECK(status IN ('enrolled','completed','cancelled')),
  UNIQUE(program_id, member_id)
);
```

## 🤝 Support & Feedback

For issues or feature requests related to training programs:
1. Check this guide first
2. Review troubleshooting section
3. Check error logs in browser console and backend terminal
4. Contact development team with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser and device info
   - Screenshots/screen recordings

---

**Version**: 1.0  
**Last Updated**: March 14, 2026  
**Maintainer**: GramSathi AI Team
