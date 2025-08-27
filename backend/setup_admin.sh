#!/bin/bash

# NYU LIMS Admin Setup Script
# This script runs the Python admin setup with proper environment

echo "=== NYU LIMS Admin Setup ==="
echo "Setting up permanent admin user..."
echo ""

# Check if we're in the right directory
if [ ! -f "setup_permanent_admin.py" ]; then
    echo "Error: Please run this script from the backend directory"
    echo "Usage: cd backend && ./setup_admin.sh"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Error: Virtual environment not found. Please run:"
    echo "python -m venv venv"
    echo "source venv/bin/activate"
    exit 1
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Run the setup script
echo "Running admin setup..."
python setup_permanent_admin.py

echo ""
echo "Setup complete!"
