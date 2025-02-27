interface ExportOptions {
    format?: 'csv' | 'json';
    year?: string | number;
    filename?: string;
  }
  
  export const exportService = {
    async exportTransactions(options: ExportOptions = {}): Promise<boolean> {
      try {
        const { format = 'csv', year, filename = 'transactions-export' } = options;
        
        // Build query string
        const params = new URLSearchParams();
        if (format) params.append('format', format);
        if (year) params.append('year', year.toString());
        
        const queryString = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(`/api/export${queryString}`);
        
        if (!response.ok) {
          throw new Error('Export failed');
        }
        
        if (format === 'json') {
          const data = await response.json();
          // Handle JSON data - e.g. save to localStorage or download
          const dataStr = JSON.stringify(data, null, 2);
          this.downloadFile(dataStr, `${filename}.json`, 'application/json');
          return true;
        } else {
          // Handle CSV download
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${filename}.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          return true;
        }
      } catch (error) {
        console.error('Export failed:', error);
        return false;
      }
    },
    
    downloadFile(content: string, filename: string, contentType: string): void {
      const a = document.createElement('a');
      const file = new Blob([content], { type: contentType });
      a.href = URL.createObjectURL(file);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  };