"use client";

import { useAuth } from "@/context/AuthContext";
import { hqApi } from "@/lib/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useInstitutionScope() {
  const { user } = useAuth();
  const isSuperuser = Boolean(user?.is_superuser);
  const [orgOptions, setOrgOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const selectedOrgId = searchParams.get("org") ?? "";

  useEffect(() => {
    if (!isSuperuser) return;
    setLoading(true);
    hqApi
      .listOrganizations({ page: 1, page_size: 200 })
      .then((data) => {
        const options = data.results.map((org) => ({ id: org.id, name: org.name }));
        setOrgOptions(options);
      })
      .finally(() => setLoading(false));
  }, [isSuperuser]);

  useEffect(() => {
    if (!isSuperuser) return;
    if (selectedOrgId) return;
    if (!orgOptions.length) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("org", orgOptions[0].id);
    router.replace(`${pathname}?${params.toString()}`);
  }, [isSuperuser, selectedOrgId, orgOptions, pathname, router, searchParams]);

  const setSelectedOrgId = useCallback(
    (orgId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (orgId) params.set("org", orgId);
      else params.delete("org");
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return useMemo(
    () => ({
      isSuperuser,
      selectedOrgId,
      setSelectedOrgId,
      orgOptions,
      loading,
    }),
    [isSuperuser, loading, orgOptions, selectedOrgId, setSelectedOrgId]
  );
}
