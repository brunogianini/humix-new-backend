import { Router } from 'express';
import { validate } from '../../shared/middleware/validate';
import { authenticate, optionalAuthenticate } from '../../shared/middleware/authenticate';
import {
  createAlbumSchema,
  updateAlbumSchema,
  albumQuerySchema,
  userAlbumSchema,
  importAlbumSchema,
} from './albums.schemas';
import * as albumsController from './albums.controller';

const router = Router();

router.post('/import', authenticate, validate(importAlbumSchema), albumsController.importAlbum);
router.get('/', validate(albumQuerySchema, 'query'), albumsController.listAlbums);
router.get('/:slug', optionalAuthenticate, albumsController.getAlbum);
router.post('/', authenticate, validate(createAlbumSchema), albumsController.createAlbum);
router.patch('/:slug', authenticate, validate(updateAlbumSchema), albumsController.updateAlbum);
router.delete('/:slug', authenticate, albumsController.deleteAlbum);

// User-album relationship
router.put('/user/:albumId', authenticate, validate(userAlbumSchema), albumsController.setUserAlbum);
router.delete('/user/:albumId', authenticate, albumsController.removeUserAlbum);

export default router;
