/**
 * Removes a user from both Supabase Auth and the local Postgres `users`
 * table so registration can be retried cleanly.
 *
 *   npm run user:delete -- you@example.com
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: npm run user:delete -- <email>");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log(`Looking up Supabase auth user for ${email}…`);

  let userId: string | null = null;
  let page = 1;
  while (!userId) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const found = data.users.find(
      (u) => (u.email ?? "").toLowerCase() === email.toLowerCase()
    );
    if (found) {
      userId = found.id;
      break;
    }
    if (data.users.length < 200) break;
    page += 1;
  }

  if (userId) {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;
    console.log(`Deleted Supabase auth user (${userId}).`);
  } else {
    console.log("No Supabase auth user found for this email.");
  }

  const dbUser = await prisma.user.findUnique({ where: { email } });
  if (dbUser) {
    await prisma.user.delete({ where: { id: dbUser.id } });
    console.log(`Deleted Postgres users row (${dbUser.id}).`);
  } else {
    console.log("No Postgres users row found for this email.");
  }

  await prisma.$disconnect();
  console.log("Done. You can register this email again now.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
