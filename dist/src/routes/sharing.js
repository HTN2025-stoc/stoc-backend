"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Create one-time sharing link
router.post('/create', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        // Check if user has any posts to share
        const postCount = await prisma.feedPost.count({
            where: { userId }
        });
        if (postCount === 0) {
            return res.status(400).json({
                error: 'No posts to share. Start recording your feed first.'
            });
        }
        // Invalidate any existing unused share links for this user
        await prisma.shareLink.updateMany({
            where: {
                userId,
                isUsed: false,
                expiresAt: { gt: new Date() }
            },
            data: { isUsed: true }
        });
        // Create new share link (expires in 24 hours)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        const shareLink = await prisma.shareLink.create({
            data: {
                userId,
                token: (0, uuid_1.v4)(),
                expiresAt
            }
        });
        res.json({
            message: 'Share link created successfully',
            shareLink: shareLink.token,
            expiresAt: shareLink.expiresAt
        });
    }
    catch (error) {
        next(error);
    }
});
// Redeem sharing link and create subscription
router.post('/redeem', [
    auth_1.authenticateToken,
    (0, express_validator_1.body)('token').notEmpty().trim()
], async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }
        const { token } = req.body;
        const subscriberId = req.user.id;
        // Find the share link
        const shareLink = await prisma.shareLink.findUnique({
            where: { token },
            include: {
                user: {
                    select: { id: true, username: true, email: true }
                }
            }
        });
        if (!shareLink) {
            return res.status(404).json({
                error: 'Invalid share link'
            });
        }
        // Check if link has expired
        if (shareLink.expiresAt < new Date()) {
            return res.status(410).json({
                error: 'Share link has expired'
            });
        }
        // Check if link has already been used
        if (shareLink.isUsed) {
            return res.status(410).json({
                error: 'Share link has already been used'
            });
        }
        // Check if user is trying to subscribe to themselves
        if (shareLink.userId === subscriberId) {
            return res.status(400).json({
                error: 'You cannot subscribe to your own feed'
            });
        }
        // Check if subscription already exists
        const existingSubscription = await prisma.subscription.findUnique({
            where: {
                subscriberId_publisherId: {
                    subscriberId,
                    publisherId: shareLink.userId
                }
            }
        });
        if (existingSubscription) {
            return res.status(409).json({
                error: 'You are already subscribed to this user\'s feed'
            });
        }
        // Create subscription and mark link as used
        const [subscription] = await prisma.$transaction([
            prisma.subscription.create({
                data: {
                    subscriberId,
                    publisherId: shareLink.userId
                },
                include: {
                    publisher: {
                        select: { id: true, username: true }
                    }
                }
            }),
            prisma.shareLink.update({
                where: { id: shareLink.id },
                data: {
                    isUsed: true,
                    usedBy: subscriberId
                }
            })
        ]);
        res.json({
            message: 'Successfully subscribed to feed',
            subscription: {
                id: subscription.id,
                publisher: subscription.publisher,
                createdAt: subscription.createdAt
            }
        });
    }
    catch (error) {
        next(error);
    }
});
// Get share link status (for debugging/admin)
router.get('/status/:token', async (req, res, next) => {
    try {
        const { token } = req.params;
        const shareLink = await prisma.shareLink.findUnique({
            where: { token },
            include: {
                user: {
                    select: { username: true }
                }
            }
        });
        if (!shareLink) {
            return res.status(404).json({
                error: 'Share link not found'
            });
        }
        res.json({
            token: shareLink.token,
            isUsed: shareLink.isUsed,
            isExpired: shareLink.expiresAt < new Date(),
            expiresAt: shareLink.expiresAt,
            createdAt: shareLink.createdAt,
            publisher: shareLink.user.username
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=sharing.js.map