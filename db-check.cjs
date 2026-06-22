const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
async function main() {
  const users = await p.user.findMany({
    select: { id: true, email: true, phoneE164: true, status: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  console.log(JSON.stringify(users, null, 2));
  const kyc = await p.kycSubmission.findMany({
    select: { id: true, userId: true, status: true, nidaNumber: true, fullName: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  console.log("--- KYC ---");
  console.log(JSON.stringify(kyc, null, 2));
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
