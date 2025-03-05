// components/layout/DashboardLayout.tsx
import React, { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavItem } from './NavItem';
import { 
  LayoutDashboard, 
  Receipt, 
  FileSpreadsheet, 
  LineChart, 
  HelpCircle, 
  Menu,
  RefreshCw,
  Upload,
  Download,
  Save,
  Plus,
  BarChart
} from 'lucide-react';
import { Button } from "@/components/ui/button";

interface QuickAction {
  title: string;
  icon: React.ReactNode;
  href: string;
}

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  onRefresh?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  onSave?: () => void;
  isRefreshing?: boolean;
  isSaving?: boolean;
  showSaveButton?: boolean;
}

export function DashboardLayout({ 
  children, 
  title = "Dashboard",
  onRefresh,
  onImport,
  onExport,
  onSave,
  isRefreshing = false,
  isSaving = false,
  showSaveButton = false
}: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [actionsCollapsed, setActionsCollapsed] = useState(false);
  const pathname = usePathname();
  
  // Quick action links
  const quickActions: QuickAction[] = [
    {
      title: 'Upload Transactions',
      icon: <Upload size={20} />,
      href: '/dashboard/transactions/upload'
    },
    {
      title: 'Manage Categories',
      icon: <FileSpreadsheet size={20} />,
      href: '/dashboard/categories/manage'
    },
    {
      title: 'Add Transaction',
      icon: <Plus size={20} />,
      href: '/dashboard/transactions/add'
    },
    {
      title: 'Generate Report',
      icon: <BarChart size={20} />,
      href: '/dashboard/reports/generate'
    }
  ];
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`bg-white shadow-sm flex flex-col ${sidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300`}>
        <div className="flex items-center justify-between p-4 border-b">
          {!sidebarCollapsed && <h1 className="text-xl font-semibold text-gray-800">Budget App</h1>}
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
            className="text-gray-500 hover:text-gray-700"
          >
            <Menu size={20} />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <NavItem 
            href="/dashboard"
            icon={<LayoutDashboard size={20} />} 
            title="Dashboard" 
            active={pathname === '/dashboard'} 
            collapsed={sidebarCollapsed}
          />
          <NavItem 
            href="/dashboard/transactions"
            icon={<Receipt size={20} />} 
            title="Transactions" 
            active={pathname?.includes('/transactions')} 
            collapsed={sidebarCollapsed}
          />
          <NavItem 
            href="/dashboard/categories"
            icon={<FileSpreadsheet size={20} />} 
            title="Categories" 
            active={pathname?.includes('/categories')} 
            collapsed={sidebarCollapsed}
          />
          <NavItem 
            href="/dashboard/reports"
            icon={<LineChart size={20} />} 
            title="Reports" 
            active={pathname?.includes('/reports')} 
            collapsed={sidebarCollapsed}
          />
          <NavItem 
            href="/dashboard/help"
            icon={<HelpCircle size={20} />} 
            title="Ask Gerlind" 
            active={pathname?.includes('/help')} 
            collapsed={sidebarCollapsed}
          />
        </nav>
        
        {/* Quick Actions Section */}
        <div className="border-t">
          <div 
            className="flex items-center justify-between p-4 cursor-pointer"
            onClick={() => setActionsCollapsed(!actionsCollapsed)}
          >
            {!sidebarCollapsed && <span className="text-sm font-medium text-gray-700">Quick Actions</span>}
            <button className="text-gray-500 hover:text-gray-700">
              {actionsCollapsed ? 
                <Menu size={16} className={sidebarCollapsed ? "mx-auto" : ""} /> :
                <Menu size={16} className={`transform rotate-90 ${sidebarCollapsed ? "mx-auto" : ""}`} />
              }
            </button>
          </div>
          
          {!actionsCollapsed && (
            <div className="px-3 pb-4">
              {quickActions.map((action, index) => (
                <Link 
                  key={index}
                  href={action.href} 
                  className={`flex items-center py-2 px-3 text-sm rounded-md mb-1 hover:bg-gray-100 ${
                    sidebarCollapsed ? 'justify-center' : 'justify-start'
                  }`}
                >
                  <span className="text-gray-500">{action.icon}</span>
                  {!sidebarCollapsed && <span className="ml-3 text-gray-600">{action.title}</span>}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
            <div className="flex items-center space-x-4">
              {onRefresh && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw size={16} className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </Button>
              )}
              
              {onImport && (
                <Button variant="outline" size="sm" onClick={onImport}>
                  <Upload size={16} className="mr-2" />
                  <span>Import</span>
                </Button>
              )}
              
              {onExport && (
                <Button variant="outline" size="sm" onClick={onExport}>
                  <Download size={16} className="mr-2" />
                  <span>Export</span>
                </Button>
              )}
              
              {showSaveButton && onSave && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={onSave}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save size={16} className={`mr-2 ${isSaving ? 'animate-spin' : ''}`} />
                  <span>Save</span>
                </Button>
              )}
            </div>
          </div>
        </header>
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}