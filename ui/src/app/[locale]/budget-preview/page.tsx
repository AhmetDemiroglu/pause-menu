"use client";
import { useState } from "react";
import { AiSpendingDashboard } from "@/core/components/admin/ai-spending-dashboard";
import type { AiSettings, AiUsageReport } from "@/models/admin/ai-admin.model";
const day = new Date().toISOString().slice(0,10);
const report = { budgets: [{source:"translation",spentTry:151.73,spentTodayTry:15.63},{source:"news",spentTry:151.25,spentTodayTry:8.39}], daily: [{day,source:"translation",model:"text",spentTry:15.63,callCount:153},{day,source:"news",model:"model-image",spentTry:8.39,callCount:4}], newsProduction:[{day,backfill:0,regular:12}], taskStats24h:[],recentTasks:[] } as unknown as AiUsageReport;
export default function Preview(){const [settings,setSettings]=useState({generationPaused:false,totalDailyBudgetTry:null,totalMonthlyBudgetTry:null,translationMonthlyBudgetTry:250,agentMonthlyBudgetTry:250,newsMonthlyBudgetTry:500} as AiSettings);return <main className="mx-auto max-w-7xl p-6"><AiSpendingDashboard report={report} settings={settings} appliedSettings={settings} onChange={setSettings} onSave={()=>{}} saving={false}/></main>}
