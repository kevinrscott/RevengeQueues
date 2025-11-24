const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding...");

  // Ensure COD exists
  const cod = await prisma.game.upsert({
    where: { shortCode: "COD" },
    update: {},
    create: {
      name: "Call of Duty",
      shortCode: "COD",
    },
  });

  // COD rank list
  const codRanks = [
    { name: "Bronze", order: 1, iconUrl: "/ranks/cod/bronze.png" },
    { name: "Silver", order: 2, iconUrl: "/ranks/cod/silver.png" },
    { name: "Gold", order: 3, iconUrl: "/ranks/cod/gold.png" },
    { name: "Platinum", order: 4, iconUrl: "/ranks/cod/platinum.png" },
    { name: "Diamond", order: 5, iconUrl: "/ranks/cod/diamond.png" },
    { name: "Crimson", order: 6, iconUrl: "/ranks/cod/crimson.png" },
    { name: "Iridescent", order: 7, iconUrl: "/ranks/cod/iridescent.png" },
  ];

  // Ensure ranks exist
  for (const r of codRanks) {
    await prisma.gameRank.upsert({
      where: {
        gameId_name: {
          gameId: cod.id,
          name: r.name,
        },
      },
      update: r,
      create: {
        ...r,
        gameId: cod.id,
      },
    });
  }

  console.log("Games + ranks seeded successfully!");
}

main()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
