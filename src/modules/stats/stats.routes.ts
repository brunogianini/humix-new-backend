import { Router } from 'express';
import * as statsController from './stats.controller';

const router = Router();

router.get('/artists', statsController.getTopArtists);
router.get('/albums', statsController.getTopAlbums);
router.get('/genres', statsController.getTopGenres);
router.get('/users/:username', statsController.getUserStats);

export default router;
