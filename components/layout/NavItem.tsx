// components/layout/NavItem.tsx
import React, { ReactNode } from 'react';
import Link from 'next/link';

interface NavItemProps {
  href: string;
  icon: ReactNode;
  title: string;
  active: boolean;
  collapsed: boolean;
}

export function NavItem({ href, icon, title, active, collapsed }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center w-full px-4 py-3 ${
        active ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
      } ${collapsed ? 'justify-center' : 'justify-start'}`}
    >
      <span className={active ? 'text-blue-600' : 'text-gray-500'}>{icon}</span>
      {!collapsed && <span className="ml-3 font-medium">{title}</span>}
    </Link>
  );
}