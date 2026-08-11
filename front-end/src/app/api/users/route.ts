import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

interface BackendUserOverview {
  user_id: string;
  chats_count: number;
  videos_count: number;
  questions_count: number;
  last_active: string | null;
}

export interface EnrichedUserOverview extends BackendUserOverview {
  name: string;
  email: string | null;
  image_url: string | null;
}

export async function GET(_request: NextRequest) {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = await getToken();
    const backendUrl = process.env.BACKEND_API_URL || "http://localhost:8000";

    const response = await fetch(`${backendUrl}/api/users`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || "Failed to fetch users" },
        { status: response.status }
      );
    }

    const rawUsers: BackendUserOverview[] = Array.isArray(data.users) ? data.users : [];

    // Default: identity unresolved, same behavior as before this change.
    let enrichedUsers: EnrichedUserOverview[] = rawUsers.map((u) => ({
      ...u,
      name: u.user_id,
      email: null,
      image_url: null,
    }));

    if (rawUsers.length > 0) {
      try {
        const client = await clerkClient();
        // NOTE: Clerk's getUserList caps out well above typical dashboards,
        // but if this platform ever has 500+ distinct users this single call
        // won't cover all of them — batch/paginate at that point.
        const ids = rawUsers.map((u) => u.user_id).slice(0, 500);
        const result = await client.users.getUserList({ userId: ids, limit: ids.length });
        const clerkUsers = Array.isArray(result) ? result : result.data;

        const byId = new Map(clerkUsers.map((cu) => [cu.id, cu]));

        enrichedUsers = rawUsers.map((u) => {
          const cu = byId.get(u.user_id);
          if (!cu) {
            return { ...u, name: u.user_id, email: null, image_url: null };
          }
          const fullName = [cu.firstName, cu.lastName].filter(Boolean).join(" ").trim();
          const email = cu.emailAddresses?.[0]?.emailAddress ?? null;
          return {
            ...u,
            name: fullName || cu.username || email || u.user_id,
            email,
            image_url: cu.imageUrl ?? null,
          };
        });
      } catch (clerkErr) {
        // A Clerk lookup failure must NEVER take down the whole Users page —
        // fall back to raw IDs, exactly what the page already showed before.
        console.error("Clerk user enrichment failed, falling back to raw IDs:", clerkErr);
      }
    }

    return NextResponse.json({ is_admin: Boolean(data.is_admin), users: enrichedUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
