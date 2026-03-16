"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /mirror is now merged into /progress ("Your Mirror").
 * This redirect preserves any bookmarks or direct navigations.
 */
export default function MirrorRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/progress");
  }, [router]);

  return null;
}
