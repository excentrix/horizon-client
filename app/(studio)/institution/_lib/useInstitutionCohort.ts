"use client";

import { useCallback, useEffect, useState } from "react";
import { institutionsApi } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";

export interface Cohort {
  id: string;
  name: string;
  mentor_name?: string | null;
  student_count?: number;
  is_active?: boolean;
}

export interface StudentInsight {
  user_id: string;
  email: string;
  name: string;
  plan_progress: number;
  plan_title?: string | null;
  plan_status?: string | null;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  last_task_completed_at?: string | null;
  days_inactive?: number | null;
  last_activity: string | null;
  engagement_trend: "up" | "down" | "flat";
  engagement_last_7: number;
  engagement_prev_7: number;
  risk_flags: string[];
  risk_level: "low" | "medium" | "high";
  top_skill_gap?: string | null;
  next_best_action?: string | null;
}

export interface CohortDashboard {
  cohort_id: string;
  cohort_name: string;
  total_students: number;
  students: StudentInsight[];
}

interface UseInstitutionCohortOptions {
  withDashboard?: boolean;
}

export function useInstitutionCohort(options: UseInstitutionCohortOptions = {}) {
  const { withDashboard = true } = options;
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<CohortDashboard | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshCohorts = useCallback(() => {
    institutionsApi
      .listCohorts()
      .then((data) => {
        setCohorts(data);
        if (data.length > 0 && !selectedCohort) {
          setSelectedCohort(data[0].id);
        }
      })
      .catch((err) => telemetry.error("Failed to load cohorts", { err }));
  }, [selectedCohort]);

  useEffect(() => {
    refreshCohorts();
  }, [refreshCohorts]);

  useEffect(() => {
    if (!withDashboard || !selectedCohort) return;
    setLoading(true);
    institutionsApi
      .cohortDashboard(selectedCohort)
      .then((data) => setDashboard(data))
      .catch((err) => telemetry.error("Failed to load cohort dashboard", { err }))
      .finally(() => setLoading(false));
  }, [selectedCohort, withDashboard]);

  return {
    cohorts,
    selectedCohort,
    setSelectedCohort,
    dashboard,
    loading,
    refreshCohorts,
  };
}
