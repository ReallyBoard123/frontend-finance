// app/dashboard/costs/page.tsx
'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CostsUpload } from "@/components/costs/costs-upload";
import { CategoryManager } from "@/components/budget/category-manager";
import { InquiryList } from "@/components/budget/inquiry-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CostsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Tabs defaultValue="costs" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="costs">Cost Management</TabsTrigger>
          <TabsTrigger value="categories">Categories Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="costs">
          <Card>
            <CardHeader>
              <CardTitle>Cost Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CostsUpload />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Budget & Categories Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryManager />
            </CardContent>
          </Card>
          
          <div className="mt-6">
            <InquiryList />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}