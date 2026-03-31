import { Router } from 'express';
import { validate } from '../../shared/middleware/validate';
import { authenticate } from '../../shared/middleware/authenticate';
import { createArtistSchema, updateArtistSchema, artistQuerySchema } from './artists.schemas';
import * as artistsController from './artists.controller';

const router = Router();

router.get('/', validate(artistQuerySchema, 'query'), artistsController.listArtists);
router.get('/:slug', artistsController.getArtist);
router.post('/', authenticate, validate(createArtistSchema), artistsController.createArtist);
router.patch('/:slug', authenticate, validate(updateArtistSchema), artistsController.updateArtist);
router.delete('/:slug', authenticate, artistsController.deleteArtist);

export default router;
