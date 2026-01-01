#!/bin/bash

# Script to convert .env file to gcloud env-vars format
# Filters out comments and empty lines, then formats as comma-separated values

set -e  # Exit on any error

if [ ! -f .env ]; then
  echo "Error: .env file not found" >&2
  exit 1
fi

# Process .env file:
# - Remove comments (lines starting with #)
# - Remove inline comments  
# - Remove trailing whitespace
# - Remove empty lines after processing
# - Format as comma-separated values
env_vars=$(sed 's/#.*//' .env | sed 's/[[:space:]]*$//' | grep -v '^$' | paste -sd ',' -)

if [ -z "$env_vars" ]; then
  echo "Error: No valid environment variables found in .env file" >&2
  exit 1
fi

echo "$env_vars"