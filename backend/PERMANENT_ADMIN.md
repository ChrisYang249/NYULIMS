# Permanent Admin User Setup

## Overview

The NYU LIMS system now has a **permanent admin user** that's always available with simple credentials.

## Admin Credentials

- **Username**: `admin`
- **Password**: `Admin123!`
- **Email**: `admin@lims.com`
- **Role**: `super_admin`

## How to Access

### Option 1: Use the Create Admin Endpoint
```bash
curl -X POST "https://nyulims.onrender.com/api/v1/auth/create-admin"
```

### Option 2: Use the Health Check Endpoint
```bash
curl -X GET "https://nyulims.onrender.com/api/v1/health"
```

### Option 3: Login Directly
Use the credentials above to log in through the web interface.

## Features

✅ **Always Available**: Admin user is guaranteed to exist  
✅ **Simple Credentials**: Easy to remember username/password  
✅ **Safe to Call**: Endpoints are idempotent (safe to run multiple times)  
✅ **Auto-Create**: Admin user is created automatically if missing  
✅ **Auto-Reset**: Admin user is reset to correct credentials if corrupted  

## What Happens When You Call the Endpoints

### `/api/v1/auth/create-admin` (POST)
- If admin doesn't exist: Creates new admin user
- If admin exists: Updates admin user to ensure correct credentials
- Always returns success with admin details

### `/api/v1/health` (GET)
- Checks system health
- Ensures admin user exists (creates if missing)
- Returns system status and admin information

## No More Setup Issues

- ❌ No need to run setup scripts
- ❌ No need for shell access
- ❌ No complex password requirements
- ❌ No temporary endpoints
- ✅ Always guaranteed admin access

## Security Notes

- This is designed for development/testing environments
- For production, consider using stronger passwords
- The admin user has full system access
- Keep credentials secure and don't share publicly

## Troubleshooting

### "Admin user already exists" - No longer an issue!
The endpoints now handle existing admin users gracefully.

### "Password too weak" - No longer an issue!
Admin user creation bypasses password complexity requirements.

### "Can't access shell" - No longer an issue!
Everything works through API endpoints.

## API Response Examples

### Create Admin Response
```json
{
  "message": "Admin user created successfully",
  "username": "admin",
  "email": "admin@lims.com",
  "role": "super_admin"
}
```

### Health Check Response
```json
{
  "status": "healthy",
  "admin_user_exists": true,
  "admin_created": false,
  "admin_username": "admin",
  "message": "LIMS system is running and admin access is guaranteed"
}
```

## That's It!

You now have a permanent, simple admin user that's always available. No more setup hassles!
