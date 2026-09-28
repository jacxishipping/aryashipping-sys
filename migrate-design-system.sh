#!/bin/bash

# Design System Migration Script
# Automates common replacements across dashboard pages

echo "🚀 Starting Design System Migration..."
echo ""

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter
COUNT=0

# Find all dashboard page files
FILES=$(find src/app/dashboard -name "page.tsx" -o -name "*.tsx")

for file in $FILES; do
    echo "Processing: $file"
    
    # Skip if file doesn't exist
    if [ ! -f "$file" ]; then
        continue
    fi
    
    # Backup original
    cp "$file" "$file.backup"
    
    # 1. Update imports - Add design system imports if not present
    if ! grep -q "from '@/components/design-system'" "$file"; then
        # Add import after other imports
        sed -i "/from '@mui\/material'/a import { Breadcrumbs, Button, toast, EmptyState, SkeletonCard, SkeletonTable, Tooltip, StatusBadge } from '@/components/design-system';" "$file"
    fi
    
    # 2. Replace ActionButton with Button
    sed -i 's/<ActionButton/<Button/g' "$file"
    sed -i 's/<\/ActionButton>/<\/Button>/g' "$file"
    sed -i "s/from '@\/components\/design-system'/from '@\/components\/design-system'/g" "$file"
    
    # 3. Replace MUI Button variants
    sed -i 's/variant="contained"/variant="primary"/g' "$file"
    sed -i 's/variant="outlined"/variant="outline"/g' "$file"
    sed -i 's/variant="text"/variant="ghost"/g' "$file"
    
    # 4. Replace button sizes
    sed -i 's/size="small"/size="sm"/g' "$file"
    sed -i 's/size="medium"/size="md"/g' "$file"
    sed -i 's/size="large"/size="lg"/g' "$file"
    
    # 5. Replace startIcon with icon + iconPosition
    sed -i 's/startIcon=/icon=/g' "$file"
    # Note: Manual review needed for iconPosition="start"
    
    # 6. Replace endIcon with icon + iconPosition
    sed -i 's/endIcon=/icon=/g' "$file"
    # Note: Manual review needed for iconPosition="end"
    
    # 7. Replace Snackbar with toast (simple patterns)
    sed -i "s/setSnackbar({ open: true, message: '\([^']*\)', severity: 'success' })/toast.success('\1')/g" "$file"
    sed -i "s/setSnackbar({ open: true, message: '\([^']*\)', severity: 'error' })/toast.error('\1')/g" "$file"
    sed -i "s/setSnackbar({ open: true, message: '\([^']*\)', severity: 'warning' })/toast.warning('\1')/g" "$file"
    
    # 8. Replace CircularProgress loading patterns (simple cases)
    sed -i 's/{loading && <CircularProgress \/>}/{loading && <LoadingState \/>}/g' "$file"
    
    # 9. Remove Snackbar import from MUI if present
    sed -i 's/, Snackbar//g' "$file"
    sed -i 's/Snackbar, //g' "$file"
    
    ((COUNT++))
done

echo ""
echo -e "${GREEN}✅ Processed $COUNT files${NC}"
echo ""
echo -e "${YELLOW}⚠️  Manual Review Required:${NC}"
echo "1. Check iconPosition for startIcon/endIcon replacements"
echo "2. Review Snackbar → toast conversions (complex patterns)"
echo "3. Add Breadcrumbs component to each page manually"
echo "4. Test each page for functionality"
echo ""
echo "Backup files created with .backup extension"
echo "Run 'find src/app/dashboard -name \"*.backup\" -delete' to remove backups"
echo ""
echo "🎉 Migration script complete!"
