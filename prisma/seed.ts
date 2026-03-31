import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Genres
  const genres = await Promise.all([
    prisma.genre.upsert({ where: { slug: 'rock' }, update: {}, create: { name: 'Rock', slug: 'rock' } }),
    prisma.genre.upsert({ where: { slug: 'pop' }, update: {}, create: { name: 'Pop', slug: 'pop' } }),
    prisma.genre.upsert({ where: { slug: 'jazz' }, update: {}, create: { name: 'Jazz', slug: 'jazz' } }),
    prisma.genre.upsert({ where: { slug: 'hip-hop' }, update: {}, create: { name: 'Hip-Hop', slug: 'hip-hop' } }),
    prisma.genre.upsert({ where: { slug: 'electronic' }, update: {}, create: { name: 'Electronic', slug: 'electronic' } }),
    prisma.genre.upsert({ where: { slug: 'metal' }, update: {}, create: { name: 'Metal', slug: 'metal' } }),
    prisma.genre.upsert({ where: { slug: 'indie' }, update: {}, create: { name: 'Indie', slug: 'indie' } }),
    prisma.genre.upsert({ where: { slug: 'classical' }, update: {}, create: { name: 'Classical', slug: 'classical' } }),
  ]);

  // Artists
  const radiohead = await prisma.artist.upsert({
    where: { slug: 'radiohead' },
    update: {},
    create: {
      name: 'Radiohead',
      slug: 'radiohead',
      country: 'UK',
      formedYear: 1985,
      bio: 'Radiohead are an English rock band formed in Abingdon, Oxfordshire.',
    },
  });

  const pinkFloyd = await prisma.artist.upsert({
    where: { slug: 'pink-floyd' },
    update: {},
    create: {
      name: 'Pink Floyd',
      slug: 'pink-floyd',
      country: 'UK',
      formedYear: 1965,
      bio: 'Pink Floyd were an English rock band formed in London.',
    },
  });

  // Connect artists to genres
  await prisma.artistGenre.upsert({
    where: { artistId_genreId: { artistId: radiohead.id, genreId: genres[0].id } },
    update: {},
    create: { artistId: radiohead.id, genreId: genres[0].id },
  });
  await prisma.artistGenre.upsert({
    where: { artistId_genreId: { artistId: radiohead.id, genreId: genres[6].id } },
    update: {},
    create: { artistId: radiohead.id, genreId: genres[6].id },
  });

  // Albums
  const okComputer = await prisma.album.upsert({
    where: { slug: 'ok-computer' },
    update: {},
    create: {
      title: 'OK Computer',
      slug: 'ok-computer',
      artistId: radiohead.id,
      releaseYear: 1997,
      releaseDate: new Date('1997-05-21'),
      totalTracks: 12,
      description: 'Third studio album by Radiohead.',
      tracks: {
        create: [
          { title: 'Airbag', number: 1, duration: 277 },
          { title: 'Paranoid Android', number: 2, duration: 383 },
          { title: 'Subterranean Homesick Alien', number: 3, duration: 274 },
          { title: 'Exit Music (For a Film)', number: 4, duration: 253 },
          { title: 'Let Down', number: 5, duration: 298 },
          { title: 'Karma Police', number: 6, duration: 263 },
          { title: 'Fitter Happier', number: 7, duration: 116 },
          { title: 'Electioneering', number: 8, duration: 230 },
          { title: 'Climbing Up the Walls', number: 9, duration: 276 },
          { title: 'No Surprises', number: 10, duration: 228 },
          { title: 'Lucky', number: 11, duration: 257 },
          { title: 'The Tourist', number: 12, duration: 325 },
        ],
      },
    },
  });

  await prisma.albumGenre.upsert({
    where: { albumId_genreId: { albumId: okComputer.id, genreId: genres[0].id } },
    update: {},
    create: { albumId: okComputer.id, genreId: genres[0].id },
  });

  const theWall = await prisma.album.upsert({
    where: { slug: 'the-wall' },
    update: {},
    create: {
      title: 'The Wall',
      slug: 'the-wall',
      artistId: pinkFloyd.id,
      releaseYear: 1979,
      releaseDate: new Date('1979-11-30'),
      totalTracks: 26,
      description: 'Eleventh studio album by Pink Floyd.',
    },
  });

  await prisma.albumGenre.upsert({
    where: { albumId_genreId: { albumId: theWall.id, genreId: genres[0].id } },
    update: {},
    create: { albumId: theWall.id, genreId: genres[0].id },
  });

  // Seed user
  const passwordHash = await bcrypt.hash('password123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@humix.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@humix.com',
      displayName: 'Admin',
      passwordHash,
      isVerified: true,
    },
  });

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
