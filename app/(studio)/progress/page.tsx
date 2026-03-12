"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "@/components/progress-tabs/overview-tab";
import { IntelligenceTab } from "@/components/progress-tabs/intelligence-tab";
import { PortfolioTab } from "@/components/progress-tabs/portfolio-tab";
import { ArtifactsTab } from "@/components/progress-tabs/artifacts-tab";
import { HistoryTab } from "@/components/progress-tabs/history-tab";
import { SignalsTab } from "@/components/progress-tabs/signals-tab";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProgressHubPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, router, user]);

  return (
    <div className="flex h-full min-h-0 flex-col w-full">
      <div className="border-b bg-background px-6 pt-6">
        <header className="mb-4 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Your Mirror</h1>
          <p className="text-sm text-muted-foreground">
            The central hub for your growth. Track your academic, career, and wellness journey, manage your portfolio, and view intelligence insights.
          </p>
        </header>
      </div>
      
      <Tabs defaultValue="overview" className="flex flex-col flex-1 w-full min-h-0">
        <div className="border-b px-6 bg-background">
          <TabsList className="bg-transparent space-x-4 h-auto p-0">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3 pt-3 font-medium text-muted-foreground data-[state=active]:text-foreground"
            >
              The Pulse
            </TabsTrigger>
            <TabsTrigger 
              value="intelligence"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3 pt-3 font-medium text-muted-foreground data-[state=active]:text-foreground"
            >
              Intelligence & Map
            </TabsTrigger>
            <TabsTrigger 
              value="portfolio"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3 pt-3 font-medium text-muted-foreground data-[state=active]:text-foreground"
            >
              Evidence & Vault
            </TabsTrigger>
            <TabsTrigger 
              value="gamification"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3 pt-3 font-medium text-muted-foreground data-[state=active]:text-foreground"
            >
              History & Logs
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto w-full p-4 lg:p-6 bg-muted/10">
          <TabsContent value="overview" className="mt-0 w-full outline-none focus-visible:ring-0">
            <OverviewTab />
          </TabsContent>
          
          <TabsContent value="intelligence" className="mt-0 w-full outline-none focus-visible:ring-0 space-y-8">
            <IntelligenceTab />
            <div className="border-t border-border/50 pt-8 mt-8">
              <SignalsTab />
            </div>
          </TabsContent>

          <TabsContent value="portfolio" className="mt-0 w-full outline-none focus-visible:ring-0 space-y-8">
            <PortfolioTab />
            <div className="border-t border-border/50 pt-8 mt-8">
              <ArtifactsTab />
            </div>
          </TabsContent>

          <TabsContent value="gamification" className="mt-0 w-full outline-none focus-visible:ring-0">
            <HistoryTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
