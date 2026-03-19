import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/dal/admin";
import { getSocialPosts, getAutomationConfig, getCredentials } from "@/lib/actions/social-posts";
import { SocialPostsClient } from "./social-posts-client";

export default async function AdminSocialPostsPage() {
  const userId = await requireAdmin();
  if (!userId) redirect("/login");

  const [postsResult, automationConfig, credentials] = await Promise.all([
    getSocialPosts(),
    getAutomationConfig(),
    getCredentials(),
  ]);

  return (
    <SocialPostsClient
      initialPosts={postsResult.data}
      initialAutomation={automationConfig}
      initialCredentials={credentials}
    />
  );
}
