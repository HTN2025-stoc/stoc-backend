"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Get user's feed posts
router.get('/posts', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { limit = 50, offset = 0 } = req.query;
        const posts = await prisma.feedPost.findMany({
            where: { userId },
            orderBy: { capturedAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset),
            include: {
                user: {
                    select: { username: true }
                }
            }
        });
        const totalCount = await prisma.feedPost.count({
            where: { userId }
        });
        res.json({
            posts: posts.map(post => ({
                id: post.id,
                platform: post.platform.toLowerCase(),
                postId: post.postId,
                author: post.author,
                content: post.content,
                mediaUrl: post.mediaUrl,
                thumbnailUrl: post.thumbnailUrl,
                engagement: {
                    likes: post.likes,
                    comments: post.comments,
                    shares: post.shares
                },
                timestamp: post.timestamp,
                viewDuration: post.viewDuration,
                capturedAt: post.capturedAt
            })),
            totalCount,
            hasMore: (parseInt(offset) + posts.length) < totalCount
        });
    }
    catch (error) {
        next(error);
    }
});
// Get specific user's feed posts (for subscriptions)
router.get('/posts/:userId', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        const { limit = 50, offset = 0 } = req.query;
        // Check if current user is subscribed to this user
        console.log('🔍 Checking subscription:', { currentUserId, userId });
        const subscription = await prisma.subscription.findUnique({
            where: {
                subscriberId_publisherId: {
                    subscriberId: currentUserId,
                    publisherId: userId
                }
            }
        });
        console.log('📋 Subscription found:', subscription);
        if (!subscription) {
            console.log('❌ No subscription found between users');
            return res.status(403).json({
                error: 'You are not subscribed to this user\'s feed'
            });
        }
        console.log('🔍 Fetching posts for userId:', userId);
        const posts = await prisma.feedPost.findMany({
            where: { userId },
            orderBy: { capturedAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset),
            include: {
                user: {
                    select: { username: true }
                }
            }
        });
        const totalCount = await prisma.feedPost.count({
            where: { userId }
        });
        console.log('📊 Posts found:', posts.length, 'Total count:', totalCount);
        res.json({
            posts: posts.map(post => ({
                id: post.id,
                platform: post.platform.toLowerCase(),
                postId: post.postId,
                author: post.author,
                content: post.content,
                mediaUrl: post.mediaUrl,
                thumbnailUrl: post.thumbnailUrl,
                engagement: {
                    likes: post.likes,
                    comments: post.comments,
                    shares: post.shares
                },
                timestamp: post.timestamp,
                viewDuration: post.viewDuration,
                capturedAt: post.capturedAt
            })),
            user: posts[0]?.user,
            totalCount,
            hasMore: (parseInt(offset) + posts.length) < totalCount
        });
    }
    catch (error) {
        next(error);
    }
});
// Save new feed post
router.post('/posts', [
    auth_1.authenticateToken,
    (0, express_validator_1.body)('platform').isIn(['tiktok', 'instagram', 'twitter']),
    (0, express_validator_1.body)('postId').notEmpty().trim(),
    (0, express_validator_1.body)('author').notEmpty().trim(),
    (0, express_validator_1.body)('content').notEmpty().trim(),
    (0, express_validator_1.body)('engagement.likes').isInt({ min: 0 }),
    (0, express_validator_1.body)('engagement.comments').isInt({ min: 0 }),
    (0, express_validator_1.body)('engagement.shares').isInt({ min: 0 })
], async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }
        const userId = req.user.id;
        const { platform, postId, author, content, mediaUrl, thumbnailUrl, engagement, timestamp, viewDuration } = req.body;
        // Convert platform to uppercase for enum
        const platformEnum = platform.toUpperCase();
        // Check if post already exists
        const existingPost = await prisma.feedPost.findUnique({
            where: {
                userId_platform_postId: {
                    userId,
                    platform: platformEnum,
                    postId
                }
            }
        });
        if (existingPost) {
            // Update existing post with new engagement data
            const updatedPost = await prisma.feedPost.update({
                where: { id: existingPost.id },
                data: {
                    likes: engagement.likes,
                    comments: engagement.comments,
                    shares: engagement.shares,
                    viewDuration
                }
            });
            return res.json({
                message: 'Post updated successfully',
                post: {
                    id: updatedPost.id,
                    platform: updatedPost.platform.toLowerCase(),
                    postId: updatedPost.postId,
                    author: updatedPost.author,
                    content: updatedPost.content,
                    engagement: {
                        likes: updatedPost.likes,
                        comments: updatedPost.comments,
                        shares: updatedPost.shares
                    },
                    capturedAt: updatedPost.capturedAt
                }
            });
        }
        // Create new post
        const post = await prisma.feedPost.create({
            data: {
                userId,
                platform: platformEnum,
                postId,
                author,
                content,
                mediaUrl,
                thumbnailUrl,
                likes: engagement.likes,
                comments: engagement.comments,
                shares: engagement.shares,
                timestamp: timestamp ? new Date(timestamp) : new Date(),
                viewDuration
            }
        });
        res.status(201).json({
            message: 'Post saved successfully',
            post: {
                id: post.id,
                platform: post.platform.toLowerCase(),
                postId: post.postId,
                author: post.author,
                content: post.content,
                engagement: {
                    likes: post.likes,
                    comments: post.comments,
                    shares: post.shares
                },
                capturedAt: post.capturedAt
            }
        });
    }
    catch (error) {
        next(error);
    }
});
// Delete specific feed post
router.delete('/posts/:postId', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { postId } = req.params;
        // First check if the post exists and belongs to the user
        const post = await prisma.feedPost.findUnique({
            where: { id: postId }
        });
        if (!post) {
            return res.status(404).json({
                error: 'Post not found'
            });
        }
        if (post.userId !== userId) {
            return res.status(403).json({
                error: 'You can only delete your own posts'
            });
        }
        // Delete the post
        await prisma.feedPost.delete({
            where: { id: postId }
        });
        res.json({
            message: 'Post deleted successfully',
            postId
        });
    }
    catch (error) {
        next(error);
    }
});
// Delete all user's feed posts
router.delete('/posts', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const deletedCount = await prisma.feedPost.deleteMany({
            where: { userId }
        });
        res.json({
            message: 'Feed posts cleared successfully',
            deletedCount: deletedCount.count
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=feeds.js.map