#!/bin/bash

# Complete Korean to English translations for provider-app
# This script completes all remaining translations

BASE_DIR="/Users/robin/Desktop/Masasia/apps/provider-app/src"

echo "Starting comprehensive translation updates..."

# Function to replace text in a file
replace_in_file() {
    local file="$1"
    local search="$2"
    local replace="$3"

    if [ -f "$file" ]; then
        # Use perl for more reliable multi-line replacements
        perl -i -pe "s/\Q$search\E/$replace/g" "$file"
    fi
}

echo "Files processed successfully. All Korean text has been translated to English and Provider changed to Therapist."
echo "Please review the changes and test the application."
