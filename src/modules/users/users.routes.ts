import { Router } from 'express';
import { validate } from '../../shared/middleware/validate';
import { authenticate, optionalAuthenticate } from '../../shared/middleware/authenticate';
import { updateProfileSchema, paginationSchema } from './users.schemas';
import * as usersController from './users.controller';

const router = Router();

router.get('/:username', optionalAuthenticate, usersController.getProfile);
router.patch('/me/profile', authenticate, validate(updateProfileSchema), usersController.updateProfile);
router.get('/:username/albums', validate(paginationSchema, 'query'), usersController.getUserAlbums);
router.get('/:username/reviews', validate(paginationSchema, 'query'), usersController.getUserReviews);
router.get('/:username/followers', validate(paginationSchema, 'query'), usersController.getFollowers);
router.get('/:username/following', validate(paginationSchema, 'query'), usersController.getFollowing);
router.delete('/:userId', authenticate, usersController.deleteAccount);

export default router;
