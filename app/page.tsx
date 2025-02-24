'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryManager } from "@/components/budget/category-manager";
import { CostsUpload } from "@/components/costs/costs-upload";

export default function CostsPage() {
  return (
    <div className="container mx-auto py-6">
      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="categories">Categories & Budget</TabsTrigger>
          <TabsTrigger value="costs">Costs Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="categories" className="space-y-6">
          <CategoryManager />
        </TabsContent>
        
        <TabsContent value="costs" className="space-y-6">
          <CostsUpload />
        </TabsContent>
      </Tabs>
    </div>
  );
}