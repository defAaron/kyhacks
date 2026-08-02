import { PrismaClient, Role, ListingStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo1234";

/** Placeholder food images (public URLs; Vision not required for seed). */
const FOOD_IMAGES = {
  friedRice:
    "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&q=80",
  sandwiches:
    "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80",
  salad:
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
  bread:
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80",
} as const;

async function main() {
  // Idempotent: clear dependent rows first (FK-safe order), then recreate.
  await prisma.claim.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.donorProfile.deleteMany();
  await prisma.user.deleteMany({
    where: {
      email: { in: ["donor@demo.com", "donor2@demo.com", "recipient@demo.com"] },
    },
  });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const now = new Date();
  const pickupEnd = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  const donor = await prisma.user.create({
    data: {
      email: "donor@demo.com",
      name: "Demo Donor",
      passwordHash,
      role: Role.DONOR,
      donorProfile: {
        create: {
          orgName: "Whiskey Row Kitchen",
          address: "101 W Main St, Louisville, KY 40202",
          lat: 38.2561,
          lng: -85.755,
          phone: "502-555-0101",
        },
      },
    },
    include: { donorProfile: true },
  });

  const donor2 = await prisma.user.create({
    data: {
      email: "donor2@demo.com",
      name: "Demo Donor 2",
      passwordHash,
      role: Role.DONOR,
      donorProfile: {
        create: {
          orgName: "NuLu Pantry Co-op",
          address: "822 E Market St, Louisville, KY 40206",
          lat: 38.2529,
          lng: -85.7415,
          phone: "502-555-0102",
        },
      },
    },
    include: { donorProfile: true },
  });

  await prisma.user.create({
    data: {
      email: "recipient@demo.com",
      name: "Demo Recipient",
      passwordHash,
      role: Role.RECIPIENT,
    },
  });

  const primaryDonorId = donor.donorProfile!.id;
  const secondaryDonorId = donor2.donorProfile!.id;

  await prisma.listing.createMany({
    data: [
      {
        donorId: primaryDonorId,
        photoUrl: FOOD_IMAGES.friedRice,
        title: "Tray of vegetable fried rice",
        description:
          "End-of-service vegetable fried rice with mixed vegetables. Packed hot for pickup.",
        categories: JSON.stringify(["prepared", "asian", "vegetarian"]),
        allergens: JSON.stringify(["soy", "sesame"]),
        quantityAvailable: 8,
        quantityClaimed: 0,
        pickupStart: now,
        pickupEnd,
        status: ListingStatus.AVAILABLE,
      },
      {
        donorId: primaryDonorId,
        photoUrl: FOOD_IMAGES.sandwiches,
        title: "Assorted deli sandwiches",
        description:
          "Half-tray of turkey and veggie sandwiches from lunch service. Individually wrapped.",
        categories: JSON.stringify(["prepared", "sandwich"]),
        allergens: JSON.stringify(["gluten", "dairy"]),
        quantityAvailable: 12,
        quantityClaimed: 0,
        pickupStart: now,
        pickupEnd,
        status: ListingStatus.AVAILABLE,
      },
      {
        donorId: secondaryDonorId,
        photoUrl: FOOD_IMAGES.salad,
        title: "Mixed green salad bowls",
        description:
          "Fresh mixed greens with vinaigrette on the side. Great for a multi-stop pickup run.",
        categories: JSON.stringify(["produce", "salad", "vegetarian"]),
        allergens: JSON.stringify([]),
        quantityAvailable: 6,
        quantityClaimed: 0,
        pickupStart: now,
        pickupEnd,
        status: ListingStatus.AVAILABLE,
      },
      {
        donorId: secondaryDonorId,
        photoUrl: FOOD_IMAGES.bread,
        title: "Day-old artisan bread loaves",
        description:
          "Sourdough and multigrain loaves baked this morning. Still soft, perfect for sharing.",
        categories: JSON.stringify(["bakery", "bread"]),
        allergens: JSON.stringify(["gluten"]),
        quantityAvailable: 10,
        quantityClaimed: 0,
        pickupStart: now,
        pickupEnd,
        status: ListingStatus.AVAILABLE,
      },
    ],
  });

  const counts = {
    users: await prisma.user.count(),
    donorProfiles: await prisma.donorProfile.count(),
    listings: await prisma.listing.count(),
  };

  console.log("Seed complete:", counts);
  console.log("Demo logins: donor@demo.com / recipient@demo.com (password: demo1234)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
