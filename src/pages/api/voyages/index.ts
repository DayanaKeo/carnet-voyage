import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import { z } from 'zod';

const VoyageSchema = z.object({
  titre: z.string().min(3),
  description: z.string().optional(),
  date_debut: z.coerce.date(),
  date_fin: z.coerce.date(),
  image: z.string().url().optional(),
  is_public: z.boolean()
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    try {
      if (token?.id) {
        // 🔐 Utilisateur connecté → ses voyages
        const voyages = await prisma.voyage.findMany({
          where: { user_id: Number(token.id) },
          include: {
            user: { select: { email: true } },
            etapes: true,
            partages: true
          },
          orderBy: { date_debut: 'desc' }
        });

        return res.status(200).json(voyages);
      } else {
        // 🌍 Utilisateur non connecté → voyages publics récents
        const voyages = await prisma.voyage.findMany({
          where: { is_public: true },
          take: 10,
          orderBy: { date_debut: 'desc' },
          include: {
            user: { select: { email: true } }
          }
        });

        return res.status(200).json(voyages);
      }
    } catch (error) {
      console.error('Erreur GET voyages:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  else if (req.method === 'POST') {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token || !token.id) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const userId = token.id;

    const {
      titre,
      description,
      date_debut,
      date_fin,
      image,
      is_public
    } = req.body;

    // Vérification des champs requis
    if (
      !titre ||
      !date_debut ||
      !date_fin ||
      typeof is_public !== 'boolean'
    ) {
      return res.status(400).json({ error: 'Champs requis manquants' });
    }

    try {
      const parsed = VoyageSchema.parse(req.body)

      const voyage = await prisma.voyage.create({
        data: {
          ...parsed,
          user_id: Number(userId)
        }
      })

      return res.status(201).json(voyage)
    } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            error: 'Erreur de validation',
            details: error.errors
          })
        }
      
        console.error('Erreur API:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
