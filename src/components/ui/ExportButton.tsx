'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import Button from '@/components/design-system/Button';
import { exportToCSV, exportToExcel, formatDataForExport } from '@/lib/export';
import { toast } from '@/lib/toast';

interface ExportButtonProps {
  data: any[];
  filename: string;
  headers?: { key: string; label: string }[];
  format?: 'csv' | 'excel';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export function ExportButton({
  data,
  filename,
  headers,
  format = 'csv',
  variant = 'outline',
  size = 'sm',
  className,
  disabled = false,
}: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!data || data.length === 0) {
      toast.warning('No data to export', 'Please add some items first');
      return;
    }

    try {
      setExporting(true);
      
      // Format data for export
      const formattedData = formatDataForExport(data);
      
      // Export based on format
      if (format === 'excel') {
        exportToExcel(formattedData, filename);
      } else {
        exportToCSV(formattedData, filename);
      }
      
      toast.success('Export successful', `Data exported to ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed', 'Could not export data. Please try again');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || exporting || data.length === 0}
      variant={variant}
      size={size}
      className={className}
      icon={<Download className="w-4 h-4" />}
    >
      {exporting ? 'Exporting...' : `Export ${format.toUpperCase()}`}
    </Button>
  );
}
