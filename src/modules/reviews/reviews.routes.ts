import { Router } from 'express';
import { validate } from '../../shared/middleware/validate';
import { authenticate } from '../../shared/middleware/authenticate';
import { createReviewSchema, updateReviewSchema, reviewQuerySchema } from './reviews.schemas';
import * as reviewsController from './reviews.controller';

const router = Router();

router.get('/albums/:albumSlug/reviews', validate(reviewQuerySchema, 'query'), reviewsController.getAlbumReviews);
router.post('/', authenticate, validate(createReviewSchema), reviewsController.createReview);
router.patch('/:reviewId', authenticate, validate(updateReviewSchema), reviewsController.updateReview);
router.delete('/:reviewId', authenticate, reviewsController.deleteReview);

export default router;
