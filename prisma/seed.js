const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.game.createMany({
    data: [
      { name: "Call of Duty", shortCode: "COD" },
    ],
    skipDuplicates: true,
  });

  console.log("Games seeded successfully!");
}

main()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
