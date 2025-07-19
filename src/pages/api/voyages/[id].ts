import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID invalide' });
  }

  const voyageId = parseInt(id, 10);

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !token.id) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  const userId = token.id;

  try {
    const voyage = await prisma.voyage.findUnique({
      where: { id: voyageId }
    });

    if (!voyage) {
      return res.status(404).json({ error: 'Voyage non trouvé' });
    }

    if (voyage.user_id !== Number(userId)) {
      return res.status(403).json({ error: 'Accès interdit : vous n’êtes pas propriétaire de ce voyage' });
    }

    if (req.method === 'PATCH') {
      const { titre, description, date_debut, date_fin, image } = req.body;

      const updatedVoyage = await prisma.voyage.update({
        where: { id: voyageId },
        data: {
          titre,
          description,
          date_debut: date_debut ? new Date(date_debut) : undefined,
          date_fin: date_fin ? new Date(date_fin) : undefined,
          image
        }
      });

      return res.status(200).json(updatedVoyage);
    }

    if (req.method === 'DELETE') {
      await prisma.voyage.delete({
        where: { id: voyageId }
      });

      return res.status(204).end();
    }

    res.setHeader('Allow', ['PATCH', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  catch (error) {
    console.error('Erreur API voyages/[id]:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
