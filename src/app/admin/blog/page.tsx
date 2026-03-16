import { redirect } from "next/navigation";
import { requireAdmin, getAllPosts } from "@/lib/dal/admin";
import { BlogClient } from "./blog-client";

export default async function AdminBlogPage() {
  const userId = await requireAdmin();
  if (!userId) redirect("/login");

  const [blogResult, guideResult] = await Promise.all([
    getAllPosts("blog"),
    getAllPosts("guide"),
  ]);

  return (
    <BlogClient
      blogPosts={blogResult.data}
      guides={guideResult.data}
    />
  );
}
