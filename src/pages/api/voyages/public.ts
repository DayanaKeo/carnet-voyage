import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Méthode ${req.method} non autorisée`);
  }

  try {
    const voyages = await prisma.voyage.findMany({
      where: { is_public: true },
      orderBy: { date_debut: 'desc' },
      include: {
        user: { select: { email: true } },
        etapes: true
      }
    });

    return res.status(200).json(voyages);
  } catch (error) {
    console.error('Erreur GET /api/voyages/public:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
