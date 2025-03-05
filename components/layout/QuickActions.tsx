// components/dashboard/QuickActions.tsx
import React from 'react';
import Link from 'next/link';
import { 
  Upload, 
  FileSpreadsheet, 
  HelpCircle, 
  Download, 
  BarChart,
  PlusCircle
} from 'lucide-react';

interface ActionButton {
  title: string;
  description?: string;
  icon: React.FC<{ size?: number; className?: string }>;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
}

interface QuickActionsProps {
  className?: string;
}

export function QuickActions({ className = '' }: QuickActionsProps) {
  const actions: ActionButton[] = [
    {
      title: 'Upload Transactions',
      description: 'Import transaction data from Excel or CSV files',
      icon: Upload,
      href: '/dashboard/transactions/upload',
      primary: true
    },
    {
      title: 'Manage Categories',
      description: 'Add, edit or organize budget categories',
      icon: FileSpreadsheet,
      href: '/dashboard/categories'
    },
    {
      title: 'Ask Gerlind',
      description: 'Get help with transaction categorization',
      icon: HelpCircle,
      href: '/dashboard/help'
    },
    {
      title: 'Export Data',
      description: 'Download transaction data as CSV or Excel',
      icon: Download,
      href: '/dashboard/export'
    },
    {
      title: 'Generate Report',
      description: 'Create custom reports for budgets and spending',
      icon: BarChart,
      href: '/dashboard/reports'
    },
    {
      title: 'Add Transaction',
      description: 'Manually enter a new transaction',
      icon: PlusCircle,
      href: '/dashboard/transactions/add'
    }
  ];
  
  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Quick Actions</h2>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-1 gap-4">
          {actions.map((action, index) => (
            <ActionCard key={index} action={action} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionCard({ action }: { action: ActionButton }) {
  const ButtonContent = () => (
    <div className={`flex items-center p-4 rounded-lg border ${
      action.primary ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'
    } transition-colors`}>
      <action.icon 
        size={24} 
        className={action.primary ? 'text-white' : 'text-gray-500'} 
      />
      <div className="ml-4">
        <h3 className={`text-lg font-medium ${action.primary ? 'text-white' : 'text-gray-900'}`}>
          {action.title}
        </h3>
        {action.description && (
          <p className={`text-sm ${action.primary ? 'text-blue-100' : 'text-gray-500'}`}>
            {action.description}
          </p>
        )}
      </div>
    </div>
  );
  
  if (action.href) {
    return (
      <Link href={action.href}>
        <ButtonContent />
      </Link>
    );
  }
  
  return (
    <button 
      onClick={action.onClick} 
      className="w-full text-left" 
      disabled={!action.onClick}
    >
      <ButtonContent />
    </button>
  );
}