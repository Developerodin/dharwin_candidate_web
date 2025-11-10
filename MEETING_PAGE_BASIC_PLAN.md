# Meeting Page - Basic Implementation Plan

## Overview
Build a basic meeting page with minimal functionality:
1. **Meeting Join** - Allow users to join a meeting with name and email
2. **Display Participant Details** - Show list of participants in the meeting

---

## Step 1: Page Structure & Route Setup
**Goal**: Set up the basic page structure

**Tasks**:
- Ensure route `/meeting/[meetingId]` is set up correctly
- Extract `meetingId` from URL params
- Extract `token` from query params (if available in meeting link)
- Create basic page layout with container

**Expected Outcome**: Page loads and can access meetingId and token

---

## Step 2: Fetch Meeting Information
**Goal**: Display meeting details to the user

**Tasks**:
- Call `getMeetingInfo(meetingId, token)` API on page load
- Display meeting information:
  - Meeting title
  - Meeting description (if available)
  - Meeting status
  - Scheduled time (if scheduled)
  - Current participant count
  - Max participants
- Handle loading state
- Handle error state (meeting not found, invalid token, etc.)

**Expected Outcome**: User sees meeting details before joining

---

## Step 3: Join Form
**Goal**: Allow user to enter their details to join

**Tasks**:
- Create form with fields:
  - Name (required)
  - Email (required)
- Add form validation
- Show form only if meeting info is loaded successfully
- Handle form submission
- Show loading state during join process

**Expected Outcome**: User can enter name and email to join

---

## Step 4: Join Meeting API Integration
**Goal**: Connect to backend to join the meeting

**Tasks**:
- Call `joinMeeting(meetingId, { joinToken, name, email })` API
- Handle successful join response
- Store join response data (participant info, meeting details)
- Handle API errors (already joined, meeting full, etc.)
- Show success message after joining

**Expected Outcome**: User successfully joins the meeting

---

## Step 5: Display Participant Details
**Goal**: Show list of all participants in the meeting

**Tasks**:
- After successful join, call `listParticipantsInMeeting(meetingId)` API
- Display participant information:
  - Participant name
  - Participant email
  - Participant role (if available)
  - Join time (if available)
  - Active status (if available)
- Create a clean list/card layout for participants
- Show participant count
- Handle empty state (no participants yet)
- Handle loading state
- Handle error state

**Expected Outcome**: User can see all participants in the meeting

---

## Step 6: Refresh Participant List (Optional)
**Goal**: Keep participant list updated

**Tasks**:
- Add refresh button to manually refresh participant list
- Or auto-refresh every few seconds (optional, can be added later)
- Update participant count dynamically

**Expected Outcome**: Participant list stays current

---

## Implementation Details

### API Functions to Use:
1. `getMeetingInfo(meetingId, token)` - Get meeting details
2. `joinMeeting(meetingId, { joinToken, name, email })` - Join meeting
3. `listParticipantsInMeeting(meetingId)` - Get participant list

### Data Structures:

**Meeting Info Response:**
```typescript
interface MeetingInfo {
  meetingId: string;
  title: string;
  description?: string;
  status: string;
  scheduledAt?: string;
  duration?: number;
  maxParticipants?: number;
  currentParticipants: number;
  allowGuestJoin?: boolean;
}
```

**Join Meeting Response:**
```typescript
interface JoinMeetingResponse {
  success: boolean;
  data: {
    meeting: MeetingInfo;
    participant: {
      name: string;
      email: string;
      role: string;
      joinedAt: string;
    };
  };
}
```

**Participant:**
```typescript
interface Participant {
  name: string;
  email: string;
  role?: string;
  joinedAt?: string;
  isActive?: boolean;
}
```

### UI States:
1. **Loading** - Fetching meeting info
2. **Error** - Meeting not found or invalid token
3. **Join Form** - Show form to enter details
4. **Joining** - Submitting join request
5. **Joined** - Successfully joined, show participant list
6. **Participant List** - Display all participants

---

## File Structure
```
app/meeting/[meetingId]/
  └── page.tsx (main meeting page component)
```

---

## UI Layout

### Before Join:
```
┌─────────────────────────────────┐
│      Meeting Information         │
│  Title: [Meeting Title]         │
│  Status: [Status]                │
│  Participants: [X/Y]             │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│         Join Form                │
│  Name: [input]                   │
│  Email: [input]                  │
│  [Join Meeting Button]           │
└─────────────────────────────────┘
```

### After Join:
```
┌─────────────────────────────────┐
│      Meeting Information         │
│  Title: [Meeting Title]         │
│  Status: [Status]               │
│  Participants: [X/Y]             │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│    Successfully Joined!         │
│  Your Name: [Name]               │
│  Your Role: [Role]               │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│      Participants (X)            │
│  ┌─────────────────────────┐    │
│  │ Name: [Name]            │    │
│  │ Email: [Email]          │    │
│  │ Role: [Role]            │    │
│  │ Joined: [Time]          │    │
│  └─────────────────────────┘    │
│  [More participant cards...]    │
└─────────────────────────────────┘
```

---

## Next Steps (Future Enhancements)
- Add video call functionality (Agora integration)
- Add real-time participant updates (WebSocket)
- Add chat functionality
- Add screen sharing
- Add meeting controls (mute, video toggle, etc.)

---

## Implementation Order

1. ✅ **Step 1**: Page Structure & Route Setup
2. ✅ **Step 2**: Fetch Meeting Information
3. ✅ **Step 3**: Join Form
4. ✅ **Step 4**: Join Meeting API Integration
5. ✅ **Step 5**: Display Participant Details
6. ⏭️ **Step 6**: Refresh Participant List (Optional)

---

## Notes
- Keep it simple and focused on the two main features
- No video/audio functionality yet
- No real-time updates (manual refresh only)
- Clean, minimal UI
- Proper error handling
- Loading states for all async operations

