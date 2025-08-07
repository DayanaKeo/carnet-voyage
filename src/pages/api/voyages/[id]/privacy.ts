import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !token.id) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  const { id } = req.query;
  const { is_public } = req.body;

  if (typeof is_public !== 'boolean') {
    return res.status(400).json({ error: 'Le champ is_public est requis et doit être un booléen.' });
  }

  try {
    const voyage = await prisma.voyage.findUnique({
      where: { id: Number(id) }
    });

    if (!voyage) {
      return res.status(404).json({ error: 'Voyage non trouvé.' });
    }

    if (voyage.user_id !== Number(token.id)) {
      return res.status(403).json({ error: 'Accès interdit. Vous n’êtes pas le propriétaire de ce voyage.' });
    }

    const updated = await prisma.voyage.update({
      where: { id: Number(id) },
      data: { is_public }
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Erreur PATCH /privacy:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
