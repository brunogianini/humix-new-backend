import { Router } from 'express';
import * as spotifyController from './spotify.controller';

const router = Router();

router.get('/search', spotifyController.searchAlbums);

export default router;
