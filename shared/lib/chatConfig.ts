// Chat configuration
// Socket.io needs to connect to the base server URL (without /v1 or other API paths)
// The API URL might include /v1, so we need to extract the base URL

// Get Socket.io server URL
// Priority: NEXT_PUBLIC_SOCKET_URL > NEXT_PUBLIC_API_URL (with /v1 stripped) > default
const getSocketUrl = () => {
  // If a dedicated Socket.io URL is provided, use it
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  
  // If API URL includes /v1, remove it for Socket.io connection
  // Socket.io connects to the root of the server, not API endpoints
  if (apiUrl.includes('/v1')) {
    return apiUrl.replace('/v1', '');
  }
  
  // Also handle other common API path patterns
  if (apiUrl.endsWith('/api')) {
    return apiUrl.replace('/api', '');
  }
  
  // If the URL has a path, try to extract just the origin
  try {
    const url = new URL(apiUrl);
    // If there's a path beyond just '/', return just the origin
    if (url.pathname && url.pathname !== '/') {
      return `${url.protocol}//${url.host}`;
    }
  } catch (e) {
    // If URL parsing fails, return as-is
  }
  
  return apiUrl;
};

// For REST API calls, use the full API URL
const getApiUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
};

export const chatConfig = {
  socketUrl: getSocketUrl(), // Base server URL for Socket.io (without /v1)
  apiUrl: getApiUrl(), // Full API URL for REST calls (with /v1)
  // Socket.io connection options
  socketOptions: {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    reconnectionDelayMax: 5000,
  },
};

