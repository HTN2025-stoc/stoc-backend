import express from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticateToken, AuthRequest } from '../middleware/auth'

const router = express.Router()
const prisma = new PrismaClient()

// Get users for discovery (strangers to swipe on)
router.get('/users', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const currentUserId = req.user!.id
    const { limit = 10, offset = 0 } = req.query

    // Get users that aren't already connected (for now, until we add swipe tracking)
    const connectedUserIds = await prisma.subscription.findMany({
      where: { subscriberId: currentUserId },
      select: { publisherId: true }
    })

    const excludedIds = [
      currentUserId,
      ...connectedUserIds.map((c: any) => c.publisherId)
    ]

    const users = await prisma.user.findMany({
      where: {
        id: { notIn: excludedIds },
        feedPosts: {
          some: {} // Only show users who have at least one post
        }
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        _count: {
          select: { 
            feedPosts: true,
            subscribers: true
          }
        }
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { createdAt: 'desc' }
    })

    // Get preview posts for each user
    const usersWithPreviews = await Promise.all(
      users.map(async (user) => {
        const previewPosts = await prisma.feedPost.findMany({
          where: { userId: user.id },
          orderBy: { capturedAt: 'desc' },
          select: {
            id: true,
            platform: true,
            author: true,
            title: true,
            content: true,
            mediaUrl: true,
            thumbnailUrl: true,
            likes: true,
            comments: true,
            shares: true,
            timestamp: true,
            capturedAt: true
          }
        })

        return {
          ...user,
          previewPosts: previewPosts.map((post: any) => ({
            id: post.id,
            platform: post.platform.toLowerCase(),
            author: post.author,
            title: post.title,
            content: post.content,
            mediaUrl: post.mediaUrl,
            thumbnailUrl: post.thumbnailUrl,
            engagement: {
              likes: post.likes,
              comments: post.comments,
              shares: post.shares
            },
            timestamp: post.timestamp,
            capturedAt: post.capturedAt
          }))
        }
      })
    )

    res.json({
      users: usersWithPreviews,
      hasMore: users.length === parseInt(limit as string)
    })
  } catch (error) {
    next(error)
  }
})

// Record a swipe (simplified for now - will be enhanced after migration)
router.post('/swipe', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const currentUserId = req.user!.id
    const { userId, direction } = req.body

    if (!userId || !direction) {
      return res.status(400).json({
        error: 'userId and direction are required'
      })
    }

    if (!['LEFT', 'RIGHT'].includes(direction)) {
      return res.status(400).json({
        error: 'direction must be LEFT or RIGHT'
      })
    }

    // For now, if it's a right swipe, create a subscription directly
    // This will be enhanced with proper swipe tracking after migration
    if (direction === 'RIGHT') {
      try {
        // Check if subscription already exists
        const existingSubscription = await prisma.subscription.findUnique({
          where: {
            subscriberId_publisherId: {
              subscriberId: currentUserId,
              publisherId: userId
            }
          }
        })

        if (!existingSubscription) {
          await prisma.subscription.create({
            data: {
              subscriberId: currentUserId,
              publisherId: userId
            }
          })
        }

        res.json({
          success: true,
          direction,
          isMatch: true,
          message: 'Successfully subscribed to user'
        })
      } catch (error) {
        res.status(500).json({
          error: 'Failed to create subscription'
        })
      }
    } else {
      // Left swipe - just acknowledge
      res.json({
        success: true,
        direction,
        isMatch: false,
        message: 'Swipe recorded'
      })
    }
  } catch (error) {
    next(error)
  }
})

// Get potential matches (simplified)
router.get('/matches', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const currentUserId = req.user!.id

    // For now, return current subscriptions as "matches"
    const subscriptions = await prisma.subscription.findMany({
      where: { subscriberId: currentUserId },
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
      matches: subscriptions.map((sub: any) => ({
        id: sub.id,
        user: sub.publisher,
        matchedAt: sub.createdAt
      }))
    })
  } catch (error) {
    next(error)
  }
})

export default router
