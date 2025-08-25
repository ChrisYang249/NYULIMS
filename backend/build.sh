#!/bin/bash
# Build script for Render deployment

echo "Upgrading pip..."
pip install --upgrade pip

echo "Installing Python dependencies with pre-compiled wheels..."
pip install --no-cache-dir --only-binary=all -r requirements.txt

echo "Build completed successfully!"
