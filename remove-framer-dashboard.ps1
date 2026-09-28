# PowerShell script to remove framer-motion from dashboard pages

$dashboardPages = @(
    "src/app/dashboard/shipments/[id]/page.tsx",
    "src/app/dashboard/shipments/new/page.tsx",
    "src/app/dashboard/users/page.tsx",
    "src/app/dashboard/containers/page.tsx",
    "src/app/dashboard/containers/[id]/page.tsx",
    "src/app/dashboard/containers/[id]/items/new/page.tsx",
    "src/app/dashboard/invoices/[id]/page.tsx",
    "src/app/dashboard/settings/page.tsx",
    "src/app/dashboard/invoices/page.tsx",
    "src/app/dashboard/invoices/new/page.tsx",
    "src/app/dashboard/users/new/page.tsx",
    "src/app/dashboard/profile/page.tsx",
    "src/app/dashboard/documents/page.tsx",
    "src/app/dashboard/analytics/page.tsx",
    "src/app/dashboard/containers/new/page.tsx",
    "src/app/dashboard/tracking/page.tsx"
)

foreach ($page in $dashboardPages) {
    if (Test-Path $page) {
        $content = Get-Content $page -Raw
        
        # Remove framer-motion import
        $content = $content -replace "import \{ motion.*\} from 'framer-motion';?\r?\n", ""
        $content = $content -replace "import \{ AnimatePresence.*\} from 'framer-motion';?\r?\n", ""
        
        # Replace motion.div with div (preserving attributes)
        $content = $content -replace '<motion\.div[^>]*\s+initial=\{[^\}]+\}\s+animate=\{[^\}]+\}\s+(?:transition=\{[^\}]+\}\s+)?(?:whileHover=\{[^\}]+\}\s+)?(?:viewport=\{[^\}]+\}\s+)?', '<div '
        $content = $content -replace '</motion\.div>', '</div>'
        
        # Replace motion components with Box
        $content = $content -replace 'component=\{motion\.div\}[^>]*\s+initial=\{[^\}]+\}\s+(?:animate|whileInView)=\{[^\}]+\}\s+(?:transition=\{[^\}]+\}\s+)?(?:viewport=\{[^\}]+\}\s+)?', ''
        
        Set-Content $page -Value $content -NoNewline
        Write-Host "Processed: $page"
    }
}

Write-Host "Done!"

