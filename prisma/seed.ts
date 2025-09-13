import { PrismaClient, Platform } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Type declaration for Node.js process
declare const process: {
  exit: (code?: number) => never
}

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create demo users
  const hashedPassword = await bcrypt.hash('password123', 12)

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      username: 'alice_feeds',
      password: hashedPassword,
    },
  })

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      username: 'bob_discovers',
      password: hashedPassword,
    },
  })


  console.log('✅ Database seeded successfully!')
  console.log(`👤 Created users: ${alice.username}, ${bob.username}`)
  console.log('🔑 Default password for demo users: password123')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
