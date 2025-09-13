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

  // Create some demo feed posts for Alice
  const alicePosts = [
    {
      platform: Platform.TIKTOK,
      postId: 'tiktok_001',
      author: 'coolcreator',
      content: 'Amazing dance moves! 🕺 This trend is going viral',
      likes: 15420,
      comments: 234,
      shares: 89,
    },
    {
      platform: Platform.TIKTOK,
      postId: 'tiktok_002',
      author: 'foodie_life',
      content: 'Quick 5-minute pasta recipe that will blow your mind! 🍝',
      likes: 8932,
      comments: 156,
      shares: 234,
    },
    {
      platform: Platform.INSTAGRAM,
      postId: 'ig_001',
      author: 'travel_enthusiast',
      content: 'Sunset views from Santorini never get old ✨ #travel #sunset',
      likes: 2341,
      comments: 45,
      shares: 12,
    },
  ]

  for (const post of alicePosts) {
    await prisma.feedPost.upsert({
      where: {
        userId_platform_postId: {
          userId: alice.id,
          platform: post.platform,
          postId: post.postId,
        },
      },
      update: {},
      create: {
        userId: alice.id,
        platform: post.platform,
        postId: post.postId,
        author: post.author,
        content: post.content,
        likes: post.likes,
        comments: post.comments,
        shares: post.shares,
        timestamp: new Date(),
      },
    })
  }

  // Create some demo feed posts for Bob
  const bobPosts = [
    {
      platform: Platform.TIKTOK,
      postId: 'tiktok_003',
      author: 'tech_tips',
      content: 'Hidden iPhone features you probably don\'t know about 📱',
      likes: 12450,
      comments: 189,
      shares: 567,
    },
    {
      platform: Platform.TWITTER,
      postId: 'tweet_001',
      author: 'startup_news',
      content: 'Breaking: New AI breakthrough could change everything we know about machine learning',
      likes: 3421,
      comments: 78,
      shares: 234,
    },
  ]

  for (const post of bobPosts) {
    await prisma.feedPost.upsert({
      where: {
        userId_platform_postId: {
          userId: bob.id,
          platform: post.platform,
          postId: post.postId,
        },
      },
      update: {},
      create: {
        userId: bob.id,
        platform: post.platform,
        postId: post.postId,
        author: post.author,
        content: post.content,
        likes: post.likes,
        comments: post.comments,
        shares: post.shares,
        timestamp: new Date(),
      },
    })
  }

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
