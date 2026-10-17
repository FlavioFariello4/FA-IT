import type { Metadata } from "next";
import Link from "next/link";
import { AdminInquiries } from "@/components/admin-inquiries";
import { requireStaffRole } from "@/lib/staff-access";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type ReplyRow = {
  id: string;
  inquiry_id: string;
  sender_email: string;
  body: string;
  delivery_status: "pending" | "sent" | "failed";
  created_at: string;
  sent_at: string | null;
};
type InquiryRow = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
  status: "new" | "in_progress" | "replied" | "archived";
  assigned_to: string | null;
  created_at: string;
};

export const metadata: Metadata = {
  title: "Richieste dei clienti",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function InquiriesPage() {
  const access = await requireStaffRole(["admin", "support"]);
  if (!access) {
    return <section className="section-wrap admin-page"><h1>Configura Supabase per consultare le richieste.</h1></section>;
  }

  const inquiries: InquiryRow[] = [];
  let loadError: { message: string } | null = null;
  for (let offset = 0; ; offset += 1000) {
    const { data: inquiryPage, error } = await access.supabase
      .from("contact_inquiries")
      .select("id,name,email,company,message,status,assigned_to,created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + 999);
    if (error) {
      loadError = error;
      console.error("Unable to load contact inquiries:", error.message);
      break;
    }
    inquiries.push(...(inquiryPage ?? []));
    if ((inquiryPage ?? []).length < 1000) {
      break;
    }
  }

  const assignedEmails: Record<string, string> = {};
  let assignedUsersError = false;
  const assignedIds = new Set(inquiries.flatMap((inquiry) => inquiry.assigned_to ? [inquiry.assigned_to] : []));
  if (!loadError && assignedIds.size > 0) {
    const adminClient = createSupabaseAdminClient();
    if (!adminClient) {
      assignedUsersError = true;
      console.error("Unable to resolve support assignments: admin client is not configured.");
    } else {
      for (
        let page = 1;
        assignedIds.size > Object.keys(assignedEmails).length && page <= 100;
        page += 1
      ) {
        const { data: userPage, error: usersError } = await adminClient.auth.admin.listUsers({
          page,
          perPage: 100,
        });
        if (usersError) {
          assignedUsersError = true;
          console.error("Unable to resolve support assignment emails:", usersError.message);
          break;
        }
        for (const user of userPage.users) {
          if (assignedIds.has(user.id) && user.email) {
            assignedEmails[user.id] = user.email;
          }
        }
        if (userPage.users.length < 100) {
          assignedUsersError = Object.keys(assignedEmails).length < assignedIds.size;
          break;
        }
        if (page === 100) {
          assignedUsersError = Object.keys(assignedEmails).length < assignedIds.size;
        }
      }
    }
  }

  const inquiryIds = inquiries.map((inquiry) => inquiry.id);
  const replies: ReplyRow[] = [];
  let repliesError: { message: string } | null = null;
  for (let index = 0; index < inquiryIds.length && !repliesError; index += 100) {
    const inquiryBatch = inquiryIds.slice(index, index + 100);
    for (let offset = 0; ; offset += 1000) {
      const { data: replyPage, error } = await access.supabase
        .from("contact_inquiry_replies")
        .select("id,inquiry_id,sender_email,body,delivery_status,created_at,sent_at")
        .in("inquiry_id", inquiryBatch)
        .order("created_at", { ascending: true })
        .range(offset, offset + 999);
      if (error) {
        repliesError = error;
        console.error("Unable to load support reply history:", error.message);
        break;
      }
      replies.push(...(replyPage ?? []));
      if ((replyPage ?? []).length < 1000) {
        break;
      }
    }
  }
  const repliesByInquiry = new Map<string, ReplyRow[]>();
  for (const reply of replies ?? []) {
    const inquiryReplies = repliesByInquiry.get(reply.inquiry_id) ?? [];
    inquiryReplies.push(reply);
    repliesByInquiry.set(reply.inquiry_id, inquiryReplies);
  }
  const inquiriesWithReplies = inquiries.map((inquiry) => ({
    ...inquiry,
    assignedEmail: inquiry.assigned_to ? assignedEmails[inquiry.assigned_to] ?? null : null,
    replies: repliesByInquiry.get(inquiry.id) ?? [],
  }));

  return (
    <section className="section-wrap admin-page">
      <p className="eyebrow"><Link href="/area-riservata">Area riservata</Link> · Richieste clienti</p>
      <h1>Richieste <span className="serif-accent">clienti.</span></h1>
      <p className="admin-intro">
        {access.roles.includes("admin")
          ? "Cerca tra i messaggi, segui le assegnazioni e rispondi ai clienti dal pannello."
          : "Puoi consultare tutte le richieste. Rispondi a quelle assegnate a te."}
      </p>
      {(loadError || repliesError) && (
        <p role="alert">Non è stato possibile caricare completamente la inbox. Verifica di aver applicato la migration della inbox supporto.</p>
      )}
      {assignedUsersError && <p role="alert">Non è stato possibile risolvere l’email di tutti gli assegnatari. Verifica la configurazione del backend.</p>}
      {!loadError && !repliesError && (
        <AdminInquiries
          currentUserId={access.user.id}
          initialInquiries={inquiriesWithReplies}
          isAdmin={access.roles.includes("admin")}
        />
      )}
    </section>
  );
}
