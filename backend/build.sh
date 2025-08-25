#!/bin/bash
# Build script for Render deployment

echo "Upgrading pip..."
pip install --upgrade pip

echo "Installing Python dependencies..."
pip install --no-cache-dir -r requirements.txt

echo "Build completed successfully!"
