"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Get user's subscriptions
router.get('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const subscriberId = req.user.id;
        console.log('🔍 Fetching subscriptions for user:', subscriberId);
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
        });
        console.log('📋 Found subscriptions:', subscriptions.length);
        console.log('📊 Subscription details:', subscriptions.map(s => ({
            id: s.id,
            publisherId: s.publisherId,
            publisherUsername: s.publisher.username
        })));
        const response = {
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
        };
        console.log('✅ Sending subscriptions response:', response);
        res.json(response);
    }
    catch (error) {
        console.error('❌ Error fetching subscriptions:', error);
        next(error);
    }
});
// Get users subscribed to current user (followers)
router.get('/followers', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const publisherId = req.user.id;
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
        });
        res.json({
            followers: followers.map(sub => ({
                id: sub.id,
                subscriber: sub.subscriber,
                createdAt: sub.createdAt
            }))
        });
    }
    catch (error) {
        next(error);
    }
});
// Unsubscribe from a user
router.delete('/:subscriptionId', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { subscriptionId } = req.params;
        const subscriberId = req.user.id;
        // Find the subscription
        const subscription = await prisma.subscription.findUnique({
            where: { id: subscriptionId },
            include: {
                publisher: {
                    select: { username: true }
                }
            }
        });
        if (!subscription) {
            return res.status(404).json({
                error: 'Subscription not found'
            });
        }
        // Verify the subscription belongs to the current user
        if (subscription.subscriberId !== subscriberId) {
            return res.status(403).json({
                error: 'You can only unsubscribe from your own subscriptions'
            });
        }
        // Delete the subscription
        await prisma.subscription.delete({
            where: { id: subscriptionId }
        });
        res.json({
            message: `Successfully unsubscribed from ${subscription.publisher.username}'s feed`
        });
    }
    catch (error) {
        next(error);
    }
});
// Unsubscribe by publisher ID (alternative endpoint)
router.delete('/publisher/:publisherId', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { publisherId } = req.params;
        const subscriberId = req.user.id;
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
        });
        if (!subscription) {
            return res.status(404).json({
                error: 'Subscription not found'
            });
        }
        await prisma.subscription.delete({
            where: {
                subscriberId_publisherId: {
                    subscriberId,
                    publisherId
                }
            }
        });
        res.json({
            message: `Successfully unsubscribed from ${subscription.publisher.username}'s feed`
        });
    }
    catch (error) {
        next(error);
    }
});
// Get subscription stats
router.get('/stats', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const [subscriptionCount, followerCount] = await Promise.all([
            prisma.subscription.count({
                where: { subscriberId: userId }
            }),
            prisma.subscription.count({
                where: { publisherId: userId }
            })
        ]);
        res.json({
            subscriptions: subscriptionCount,
            followers: followerCount
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=subscriptions.js.map