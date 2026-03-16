import { redirect } from "next/navigation";
import { requireAdmin, getAllContacts } from "@/lib/dal/admin";
import { ContactsClient } from "./contacts-client";

export default async function AdminContactsPage() {
  const userId = await requireAdmin();
  if (!userId) redirect("/login");

  const { data: contacts, count } = await getAllContacts();

  return <ContactsClient contacts={contacts} total={count} />;
}
