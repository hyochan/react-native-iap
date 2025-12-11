#!/bin/bash

echo "📋 Copying screen files from example to example-expo..."

# Check if we're in the example-expo directory
if [ ! -d "app" ]; then
    echo "❌ Error: app directory not found. Make sure you're in the example-expo directory."
    exit 1
fi

# Check if example directory exists
if [ ! -d "../example/screens" ]; then
    echo "❌ Error: ../example/screens directory not found."
    exit 1
fi

# Function to add generation comment to copied file and update imports
add_generation_comment() {
    local source_file=$1
    local target_file=$2
    local source_name=$(basename "$source_file")
    
    # Create temp file with comment and modified content
    {
        echo "// Generated from example/screens/$source_name"
        echo "// This file is automatically copied during postinstall"
        echo "// Do not edit directly - modify the source file instead"
        echo ""
        # Read the source file and replace imports
        # example uses ../src/*, example-expo uses ../* (components/, utils/, hooks/ at root level)
        sed \
            -e "s|from '\.\./src/components/Loading'|from '../components/Loading'|g" \
            -e "s|from '\.\./src/utils/constants'|from '../constants/products'|g" \
            -e "s|from '\.\./src/components/PurchaseDetails'|from '../components/PurchaseDetails'|g" \
            -e "s|from '\.\./src/components/PurchaseSummaryRow'|from '../components/PurchaseSummaryRow'|g" \
            -e "s|from '\.\./src/contexts/DataModalContext'|from '../contexts/DataModalContext'|g" \
            -e "s|from '\.\./src/utils/errorUtils'|from '../utils/errorUtils'|g" \
            -e "s|from '\.\./src/hooks/useVerificationMethod'|from '../hooks/useVerificationMethod'|g" \
            -e "s|from '\.\./src/components/AndroidOneTimeOfferDetails'|from '../components/AndroidOneTimeOfferDetails'|g" \
            -e "s|import {IAPKIT_API_KEY} from '@env';|// IAPKit API Key - Set this in your environment or replace with your actual key\nconst IAPKIT_API_KEY = process.env.EXPO_PUBLIC_IAPKIT_API_KEY \|\| '';|g" \
            "$source_file"
    } > "$target_file"
}

# Copy and rename screen files from example to example-expo
copied_files=0

if [ -f "../example/screens/AvailablePurchases.tsx" ]; then
    add_generation_comment "../example/screens/AvailablePurchases.tsx" "app/available-purchases.tsx"
    echo "✅ Copied AvailablePurchases.tsx → available-purchases.tsx"
    ((copied_files++))
fi

if [ -f "../example/screens/OfferCode.tsx" ]; then
    add_generation_comment "../example/screens/OfferCode.tsx" "app/offer-code.tsx"
    echo "✅ Copied OfferCode.tsx → offer-code.tsx"
    ((copied_files++))
fi

if [ -f "../example/screens/SubscriptionFlow.tsx" ]; then
    add_generation_comment "../example/screens/SubscriptionFlow.tsx" "app/subscription-flow.tsx"
    echo "✅ Copied SubscriptionFlow.tsx → subscription-flow.tsx"
    ((copied_files++))
fi

if [ -f "../example/screens/PurchaseFlow.tsx" ]; then
    add_generation_comment "../example/screens/PurchaseFlow.tsx" "app/purchase-flow.tsx"
    echo "✅ Copied PurchaseFlow.tsx → purchase-flow.tsx"
    ((copied_files++))
fi

if [ $copied_files -eq 0 ]; then
    echo "⚠️  No screen files found to copy."
else
    echo "✅ Successfully copied $copied_files screen files!"

    # Run prettier on copied files to ensure consistent formatting
    if command -v npx >/dev/null 2>&1; then
        echo "🎨 Running prettier on copied files..."
        npx prettier --write "app/available-purchases.tsx" "app/offer-code.tsx" "app/subscription-flow.tsx" "app/purchase-flow.tsx" 2>/dev/null || true
        echo "✅ Prettier formatting complete!"
    fi
fi