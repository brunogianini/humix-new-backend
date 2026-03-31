import { prisma } from '../../database/prisma';
import { NotFoundError } from '../../shared/errors/AppError';

export async function getUserStreaks(username: string) {
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) throw new NotFoundError('User');

  const streaks = await prisma.streak.findMany({
    where: { userId: user.id },
    orderBy: { date: 'desc' },
    select: {
      id: true,
      date: true,
      albumId: true,
    },
  });

  const dates = streaks.map((s) => s.date);
  const currentStreak = calculateCurrentStreak(dates);
  const longestStreak = calculateLongestStreak(dates);

  return {
    currentStreak,
    longestStreak,
    totalDays: streaks.length,
    history: streaks,
  };
}

export async function logStreak(userId: string, albumId?: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.streak.upsert({
    where: { userId_date: { userId, date: today } },
    update: {},
    create: { userId, albumId, date: today },
  });
}

function calculateCurrentStreak(dates: Date[]): number {
  if (!dates.length) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const msPerDay = 86400000;

  const sorted = [...dates].sort((a, b) => b.getTime() - a.getTime());
  let streak = 0;
  let expected = today.getTime();

  for (const date of sorted) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === expected || d.getTime() === expected - msPerDay) {
      streak++;
      expected = d.getTime() - msPerDay;
    } else break;
  }

  return streak;
}

function calculateLongestStreak(dates: Date[]): number {
  if (!dates.length) return 0;
  const msPerDay = 86400000;
  const sorted = [...dates]
    .map((d) => { const dt = new Date(d); dt.setHours(0, 0, 0, 0); return dt.getTime(); })
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b);

  let max = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] === msPerDay) {
      cur++;
      max = Math.max(max, cur);
    } else {
      cur = 1;
    }
  }
  return max;
}
