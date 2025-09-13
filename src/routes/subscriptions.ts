import express from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticateToken, AuthRequest } from '../middleware/auth'

const router = express.Router()
const prisma = new PrismaClient()

// Get user's subscriptions
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const subscriberId = req.user!.id

    const subscriptions = await prisma.subscription.findMany({
      where: { subscriberId },
      include: {
        publisher: {
          select: {
            id: true,
            username: true,
            email: true,
            _count: {
              select: { feedPosts: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        publisher: {
          id: sub.publisher.id,
          username: sub.publisher.username,
          email: sub.publisher.email,
          postCount: sub.publisher._count.feedPosts
        },
        createdAt: sub.createdAt
      }))
    })
  } catch (error) {
    next(error)
  }
})

// Get users subscribed to current user (followers)
router.get('/followers', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const publisherId = req.user!.id

    const followers = await prisma.subscription.findMany({
      where: { publisherId },
      include: {
        subscriber: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({
      followers: followers.map(sub => ({
        id: sub.id,
        subscriber: sub.subscriber,
        createdAt: sub.createdAt
      }))
    })
  } catch (error) {
    next(error)
  }
})

// Unsubscribe from a user
router.delete('/:subscriptionId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { subscriptionId } = req.params
    const subscriberId = req.user!.id

    // Find the subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        publisher: {
          select: { username: true }
        }
      }
    })

    if (!subscription) {
      return res.status(404).json({
        error: 'Subscription not found'
      })
    }

    // Verify the subscription belongs to the current user
    if (subscription.subscriberId !== subscriberId) {
      return res.status(403).json({
        error: 'You can only unsubscribe from your own subscriptions'
      })
    }

    // Delete the subscription
    await prisma.subscription.delete({
      where: { id: subscriptionId }
    })

    res.json({
      message: `Successfully unsubscribed from ${subscription.publisher.username}'s feed`
    })
  } catch (error) {
    next(error)
  }
})

// Unsubscribe by publisher ID (alternative endpoint)
router.delete('/publisher/:publisherId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { publisherId } = req.params
    const subscriberId = req.user!.id

    // Find and delete the subscription
    const subscription = await prisma.subscription.findUnique({
      where: {
        subscriberId_publisherId: {
          subscriberId,
          publisherId
        }
      },
      include: {
        publisher: {
          select: { username: true }
        }
      }
    })

    if (!subscription) {
      return res.status(404).json({
        error: 'Subscription not found'
      })
    }

    await prisma.subscription.delete({
      where: {
        subscriberId_publisherId: {
          subscriberId,
          publisherId
        }
      }
    })

    res.json({
      message: `Successfully unsubscribed from ${subscription.publisher.username}'s feed`
    })
  } catch (error) {
    next(error)
  }
})

// Get subscription stats
router.get('/stats', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id

    const [subscriptionCount, followerCount] = await Promise.all([
      prisma.subscription.count({
        where: { subscriberId: userId }
      }),
      prisma.subscription.count({
        where: { publisherId: userId }
      })
    ])

    res.json({
      subscriptions: subscriptionCount,
      followers: followerCount
    })
  } catch (error) {
    next(error)
  }
})

export default router
