# IST Timezone Configuration Guide

## Server-Side Timezone Setup

### 1. Environment Variables
Add these to your deployment platform:

```bash
# For Vercel/Netlify
TZ=Asia/Kolkata
NEXT_PUBLIC_TIMEZONE=Asia/Kolkata
NODE_TZ=Asia/Kolkata
```

### 2. Vercel Configuration
In your `vercel.json`:
```json
{
  "env": {
    "TZ": "Asia/Kolkata"
  }
}
```

### 3. Docker Configuration
In your `Dockerfile`:
```dockerfile
ENV TZ=Asia/Kolkata
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
```

### 4. Node.js Server
```bash
export TZ=Asia/Kolkata
```

## Frontend Implementation

The frontend now includes:
- ✅ IST timezone utility functions
- ✅ Proper IST conversion for countdown timer
- ✅ IST-formatted date display
- ✅ Consistent timezone handling

## Testing

1. Deploy with IST environment variables
2. Check countdown timer accuracy
3. Verify scheduled time display
4. Test across different browsers/devices

## Troubleshooting

If timezone issues persist:
1. Check server logs for timezone settings
2. Verify environment variables are set
3. Test with `new Date().toString()` in console
4. Ensure backend also uses IST
