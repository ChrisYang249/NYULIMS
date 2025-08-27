# NYU LIMS Admin Setup Guide

## Overview

This guide explains how to set up a permanent admin user for the NYU LIMS system, eliminating the need to run the temporary `create-admin` endpoint repeatedly.

## Current Issue

The existing `/api/v1/auth/create-admin` endpoint creates a temporary admin user with hardcoded credentials:
- Username: `admin`
- Password: `Admin123!`
- Email: `admin@lims.com`

This endpoint is designed for initial setup and should not be used for permanent admin access.

## Permanent Solution

### Option 1: Use the Setup Script (Recommended)

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Run the permanent admin setup script:**
   ```bash
   python setup_permanent_admin.py
   ```

3. **Follow the interactive prompts:**
   - Enter your desired username (default: admin)
   - Enter your email address
   - Enter your full name
   - Enter and confirm a strong password

4. **The script will:**
   - Validate password strength
   - Check if the user already exists
   - Create the admin user with your custom credentials
   - Provide confirmation of successful creation

### Option 2: Use the API Endpoint (Temporary)

If you need a quick admin user for testing:

```bash
curl -X POST "https://nyulims.onrender.com/api/v1/auth/create-admin"
```

**Credentials:**
- Username: `admin`
- Password: `Admin123!`

## Changing Admin Password

Once you have an admin account, you can change the password using the API:

```bash
curl -X POST "https://nyulims.onrender.com/api/v1/auth/change-password" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "Admin123!",
    "new_password": "YourNewSecurePassword123!"
  }'
```

## Password Requirements

Passwords must meet the following criteria:
- At least 8 characters long
- Contains at least one uppercase letter
- Contains at least one lowercase letter
- Contains at least one number
- Cannot be the same as the current password
- Cannot be one of the last 5 passwords used

## Security Best Practices

1. **Use the setup script** instead of the temporary endpoint
2. **Choose a strong password** that meets all requirements
3. **Change the default password** immediately after first login
4. **Keep credentials secure** and don't share them
5. **Use environment variables** for production deployments
6. **Regularly rotate passwords** for admin accounts

## Troubleshooting

### "User already exists" Error
If you get this error when running the setup script:
1. The admin user already exists in the database
2. Use the password change endpoint to update the password
3. Or contact your system administrator to reset the account

### "Invalid password" Error
If password change fails:
1. Ensure the current password is correct
2. Check that the new password meets all requirements
3. Verify the new password is different from the current one

### Database Connection Issues
If you can't connect to the database:
1. Check that the database is running
2. Verify database connection settings in `.env`
3. Ensure you have the correct database permissions

## API Endpoints Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/create-admin` | POST | Create temporary admin user |
| `/api/v1/auth/change-password` | POST | Change user password |
| `/api/v1/auth/login` | POST | User login |
| `/api/v1/auth/me` | GET | Get current user info |

## Support

For additional help with admin setup:
1. Check the main README.md file
2. Review the API documentation at `/docs`
3. Contact the development team
