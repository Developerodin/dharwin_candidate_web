# Indian Standard Time (IST) Meeting Workflow

## Overview
This system ensures that meetings start at the exact Indian time you specify, regardless of server timezone.

## How It Works

### 1. Meeting Creation (Frontend → Backend)
- **User Input**: You enter "11:50 AM" in Indian time
- **Frontend Conversion**: Converts Indian time to UTC before sending to API
- **API Storage**: Stores UTC time in database
- **Example**: 11:50 AM IST → 6:20 AM UTC

### 2. Meeting Display (Backend → Frontend)
- **API Response**: Returns UTC time (e.g., "2025-10-28T06:20:00.000Z")
- **Frontend Conversion**: Converts UTC back to IST for display
- **User Sees**: "28 October 2025 at 11:50:00 am IST"

### 3. Countdown Timer
- **Calculation**: Uses UTC time difference for accuracy
- **Display**: Shows countdown until Indian time

## Timezone Conversion Functions

### `convertIndianTimeToUTC(indianDateTime)`
Converts Indian time to UTC for API storage
```javascript
// Input: "2025-10-28T11:50:00" (Indian time)
// Output: "2025-10-28T06:20:00.000Z" (UTC)
```

### `formatISTDateTime(utcDateTime)`
Converts UTC to IST for display
```javascript
// Input: "2025-10-28T06:20:00.000Z" (UTC)
// Output: "28 October 2025 at 11:50:00 am IST"
```

## Example Workflow

1. **Create Meeting**: User sets 11:50 AM IST
2. **Frontend**: Converts to 6:20 AM UTC
3. **API**: Stores 6:20 AM UTC
4. **Display**: Shows "11:50 AM IST" to user
5. **Countdown**: Calculates time until 11:50 AM IST
6. **Meeting Starts**: At exactly 11:50 AM IST

## Benefits

- ✅ **User-friendly**: Always work in Indian time
- ✅ **Accurate**: Proper timezone conversion
- ✅ **Consistent**: Same time regardless of server location
- ✅ **Reliable**: Countdown matches actual start time

## Testing

To verify the system works:
1. Create a meeting for 11:50 AM IST
2. Check API response shows 6:20 AM UTC
3. Verify display shows 11:50 AM IST
4. Confirm countdown is accurate
