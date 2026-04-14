# 🧪 Training Programs - Verification & Testing Guide

**Complete End-to-End Testing for GramSathi Training Features**

---

## ✅ Pre-Implementation Checklist

Before testing, ensure:
- [ ] Backend running on port 5000: `npm run server`
- [ ] Frontend running on port 5173: `npm run dev`
- [ ] Database initialized (gramsathi.db)
- [ ] Browser cache cleared
- [ ] No console errors

---

## 🎯 Test Scenario 1: Coordinator Creates Training Program

### Steps:
1. Open application
2. Login as **Coordinator** account
3. Click **[Group Management]** button
4. You should see a page with tabs at top
5. Find and click **[Training]** tab
6. You should see **"🎓 Training Programs Management"** section
7. Look for **[+ Create New Program]** button (top right)
8. Click the button → Modal should open

### Expected UI Elements:
```
✅ Modal Title: "🎓 Create New Training Program"
✅ Info Banner: Blue box explaining notifications
✅ Form Fields:
   - 🎯 Program Title (required)
   - 📝 Description (optional)
   - 🏢 Provider/Trainer (required)
   - ⏱️ Duration in days (required)
   - 🏛️ Mode dropd own (Offline/Online/Hybrid)
   - 📅 Start Date field
   - 📍 Location field
   - 👥 Max Participants (required)
✅ Warning Banner: Amber box about notifications
✅ Submit Button: "CREATE PROGRAM & NOTIFY ALL MEMBERS"
```

### Verify Form Validation:

**Test 1A: Submit empty form**
```
Expected: Error message "Program title is required"
Actual: _______________
```

**Test 1B: Fill only title (leave others empty)**
```
Expected: Error for Provider, Duration, or Max Participants
Actual: _______________
```

**Test 1C: Set duration to 0**
```
Expected: Error "Duration must be at least 1 day"
Actual: _______________
```

**Test 1D: Set participants to 0**
```
Expected: Error "Max participants must be between 1 and 1000"
Actual: _______________
```

### Fill Form Correctly:

**Test 2: Create valid program**
```
Fields to Fill:
- Title: "Advanced Tailoring Masterclass"
- Description: "Learn professional tailoring techniques and start your business"
- Provider: "NRLM Telangana"
- Duration: 21
- Mode: Select "Offline"
- Location: "Community Center, Nalgonda"
- Start Date: 2026-04-25
- Max Participants: 20
```

### Expected Results:
```
✅ Toast notification: "Training program created!"
✅ Modal closes automatically
✅ Form clears
✅ Program appears in "Active Programs" list
✅ Shows: "Advanced Tailoring Masterclass"
✅ Shows: "0/20 enrolled" (0% full - 🟢 green)
✅ Shows: "20 seats left"
```

---

## 🎯 Test Scenario 2: All Members Receive Notification

### Steps:
1. After creating program in Test 1
2. **Open a NEW browser window/incognito**
3. Login as **Member** account (different from coordinator)
4. Check notification bell or go to Skills & Training page
5. Click **[Training Programs]** tab

### Expected Results:
```
✅ Member receives notification:
   "🎓 New Training Program"
   "Advanced Tailoring Masterclass"
   "21 days, Offline mode"
   "20 Seats"
   "Starts: 2026-04-25"
   
✅ Program visible in "Training Programs" table
✅ Shows: "0/20 enrolled"
✅ Shows: "20 seats left"
✅ [Enroll] button is clickable and blue (not disabled)
```

---

## 🎯 Test Scenario 3: Member Enrolls in Program

### Steps:
1. (Continuing from Test 2 - Member's browser window)
2. Find "Advanced Tailoring Masterclass" in table
3. Click **[Enroll]** button

### Expected Results:
```
✅ Toast notification: "Enrolled successfully! 🎓"
✅ Button changes to "✓ Enrolled" (disabled, green)
✅ Status shows "✓ Enrolled"
✅ Can refresh page, status persists
```

---

## 🎯 Test Scenario 4: Coordinator Sees Enrollment

### Steps:
1. (Go back to Coordinator's browser window)
2. Refresh the Training page (F5) or wait 2-3 seconds
3. The program card should update automatically
4. Click on program card to see details

### Expected Results:
```
✅ Coordinator Dashboard Shows:
├─ Program Card Updated:
│  ├─ Shows: "1/20 enrolled" (was "0/20")
│  ├─ Shows: "5% full" (was "0%")
│  ├─ Shows: "19 seats left" (was "20")
│  └─ Bar color: Still green 🟢
│
└─ Click Program → Enrollment Detail Shows:
   ├─ Large counter: "1" (top right)
   ├─ Progress bar: 5% filled
   ├─ Table with enrolled member:
   │  ├─ Member Name: [Member's name]
   │  ├─ Phone: [Member's phone]
   │  ├─ Location: [Member's location]
   │  ├─ Occupation: [Member's occupation]
   │  └─ Enrolled: [Today's date]
```

---

## 🎯 Test Scenario 5: Multiple Enrollments

### Steps:
1. Login as 4-5 different member accounts
2. Each enrolls in the same program
3. Return to coordinator dashboard

### Expected Results:
```
✅ Program card shows increasing count:
   - After 2nd member: "2/20 enrolled" (10%)
   - After 3rd member: "3/20 enrolled" (15%)
   - After 4th member: "4/20 enrolled" (20%)
   - etc.

✅ Color changes with percentage:
   - 0-50%: 🟢 Green bar
   - At 50%: Turns 🟡 Amber
   - At 80%: Turns 🔴 Red

✅ Enrollment table shows all members:
   - Each row: Name, Phone, Location, Occupation, Enrolled Date
   - Newest enrollments at top
```

---

## 🎯 Test Scenario 6: Capacity Full Scenario

### Steps:
1. Create new program with **Max Participants: 2**
2. Enroll 2 members (Member A, Member B)
3. Try to enroll 3rd member (Member C)

### Expected Results:
```
Member C's View:
✅ Button shows "Full" (not [Enroll])
✅ Button disabled (grayed out)
✅ Can't click to enroll

Coordinator's View on Program Card:
✅ Shows: "2/2 enrolled" (100%)
✅ Bar color: 🔴 RED
✅ Shows: "0 seats left"
✅ Status badge: "Full"
```

---

## 🎯 Test Scenario 7: Duplicate Enrollment Prevention

### Steps:
1. Login as Member A (who already enrolled)
2. Go to Training Programs tab
3. Find the program they enrolled in
4. Try to click [Enroll] again

### Expected Results:
```
Member A's View:
✅ Button shows: "✓ Enrolled" (not [Enroll])
✅ Button is disabled (grayed out)
✅ Can't click again

Toast/Error Message:
✅ "Already enrolled in this program" (if they try API directly)
✅ Or button simply disabled visually
```

---

## 🎯 Test Scenario 8: Coordinator Views "My Enrollments" (Member View)

### Steps:
1. Login as Member A (who enrolled in the program)
2. Go to Skills & Training page
3. Click **[My Enrollments]** tab

### Expected Results:
```
✅ Tab shows cards of enrolled programs:
   ├─ Program Card:
   │  ├─ Title: "Advanced Tailoring Masterclass"
   │  ├─ Provider: "NRLM Telangana"
   │  ├─ Duration: "21 days"
   │  ├─ Mode: "Offline"
   │  ├─ Location: "Community Center, Nalgonda"
   │  ├─ Start Date: "2026-04-25"
   │  ├─ Enrollment Date: "Today's date"
   │  └─ Status: "✓ Enrolled"
```

---

## 🌐 Responsive Design Tests

### Test on Mobile (< 768px)
1. Open coordinator Management page on phone
2. Tap Training tab
3. View program list
4. Tap program card

### Expected:
```
✅ Program cards stack vertically
✅ No horizontal scroll
✅ All buttons clickable (large enough)
✅ Enrollment table responsive (scroll or compressed)
✅ Numbers and percentages visible
```

### Test on Tablet (768px - 1024px)
1. Similar to mobile but with better spacing

### Test on Desktop (> 1024px)
1. Two-column layout
2. Full table visibility
3. All elements properly aligned

---

## 🔴 Error Handling Tests

### Test 1: Network Error During Creation
```
Action: Create program while internet is off
Expected: Toast error "Failed to create program"
Actual: _______________
```

### Test 2: Server Error
```
Action: Backend stops, try to create program
Expected: Toast error showing server error
Actual: _______________
```

### Test 3: Invalid Data Type
```
Action: Try to submit programmatically with invalid data
Expected: 400 Bad Request error
Actual: _______________
```

---

## 📊 Visual Verification Checklist

### Coordinator Dashboard
- [ ] 🎓 Program card shows icon
- [ ] Title is clickable
- [ ] Provider name visible
- [ ] Duration with days shown
- [ ] Mode badge visible (Offline/Online/Hybrid)
- [ ] Location shown if available
- [ ] Start date shown if available
- [ ] Enrollment counter visible (X/Y format)
- [ ] Percentage filled shown
- [ ] Progress bar visible and color-coded
- [ ] "Seats left" shown
- [ ] Hover effect shows on card
- [ ] Click opens enrollment details

### Enrollment Details
- [ ] Program title at top
- [ ] Provider, duration, mode shown
- [ ] Location shown
- [ ] Start date shown
- [ ] Large counter showing enrolled
- [ ] Progress bar with percentage
- [ ] Table with member information
- [ ] All columns visible (Name, Phone, Location, Occupation, Date)
- [ ] Date formatted correctly (DD/MM/YYYY or similar)
- [ ] Back button visible

### Form Modal
- [ ] Title shows "🎓 Create New Training Program"
- [ ] Info banner visible at top (blue)
- [ ] All form fields present and labeled
- [ ] Icons next to labels
- [ ] Placeholders helpful
- [ ] Required fields marked with *
- [ ] Dropdown options correct for Mode
- [ ] Warning banner at bottom (amber)
- [ ] Submit button text clear
- [ ] Cancel/close option available

---

## 🎯 Data Accuracy Tests

### Test: Enrollment Numbers
```
Create program with 20 capacity
Enroll 12 members
Expected calculation:
- Seats left: 20 - 12 = 8 ✓
- Percentage: (12/20) * 100 = 60% ✓
- Color: Amber (between 50-80%) ✓

Actual Numbers:
- Seats left: _______________
- Percentage: _______________
- Color: _______________
```

### Test: Member Information
```
Member enrolls with details:
- Name: John Doe
- Phone: 9876543210
- Location: Nalgonda, Telangana
- Occupation: Farmer

Verify in Coordinator's table:
- Name matches: _______________
- Phone matches: _______________
- Location matches: _______________
- Occupation matches: _______________
- Enrollment date: _______________
```

---

## 📱 Browser Compatibility Tests

| Browser | Desktop | Mobile | Tablet | Status |
|---------|---------|--------|--------|--------|
| Chrome | [ ] | [ ] | [ ] | |
| Firefox | [ ] | [ ] | [ ] | |
| Safari | [ ] | [ ] | [ ] | |
| Edge | [ ] | [ ] | [ ] | |
| Firefox Mobile | [ ] | [ ] | [ ] | |
| Safari iOS | [ ] | [ ] | [ ] | |

---

## 🚀 Performance Tests

### Loading Time
```
Time to load Training tab: _____ seconds (should be < 2s)
Time to create program: _____ seconds (should be < 3s)
Time to see enrollments update: _____ seconds (should be < 1s)
```

### Concurrent Users
```
Stress test: 5 members enrolling simultaneously
Expected: All 5 enrollments recorded with no duplicates
Actual: _______________
```

---

## 📋 Final Verification Checklist

### Core Functionality
- [ ] Coordinator can create program
- [ ] All members get notified
- [ ] Member can see programs
- [ ] Member can enroll
- [ ] Coordinator sees enrollments
- [ ] Member details visible to coordinator
- [ ] Duplicate enrollment prevented
- [ ] Full program shows correct status

### UI/UX
- [ ] All visual elements present
- [ ] Color coding works
- [ ] Icons helpful
- [ ] No console errors
- [ ] Responsive on all devices
- [ ] Tooltips/help visible
- [ ] Form validation clear

### Data
- [ ] Numbers calculated correctly
- [ ] Member info accurate
- [ ] Dates formatted correctly
- [ ] Progress bars accurate

### Performance
- [ ] Pages load quickly
- [ ] Real-time updates smooth
- [ ] No lag when interacting
- [ ] Mobile performance acceptable

---

## ✅ Sign-Off

**Coordinator Name**: ___________________  
**Coordinator Signature**: ___________________  
**Date Tested**: ___________________  

**Test Results**:
- [ ] All tests passed
- [ ] Minor issues (list): _________________
- [ ] Major issues (list): _________________

**Ready for Production**: [ ] YES [ ] NO

---

## 📞 Support Contacts

If tests fail:
1. Check browser console for errors (F12 → Console tab)
2. Verify backend is running
3. Check network tab for API errors
4. Review earlier documentation for known issues

---

*Testing Guide - April 14, 2026*  
*GramSathi AI Platform*
