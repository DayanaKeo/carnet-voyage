import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'
import { z } from 'zod'

const VoyageSchema = z.object({
  titre: z.string().min(3),
  description: z.string().optional(),
  date_debut: z.coerce.date(),
  date_fin: z.coerce.date(),
  image: z.string().url().optional(),
  is_public: z.boolean(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    try {
      if (token?.id) {
        // 🔐 connecté → voyages de l’utilisateur
        const voyages = await prisma.voyage.findMany({
          where: { user_id: Number(token.id) },
          include: {
            user: { select: { email: true } },
            etape: true,     // ⚠️ respecte les noms de relations de ton schema
            partage: true,   // idem
          },
          orderBy: { date_debut: 'desc' },
        })
        return res.status(200).json(voyages)
      } else {
        // 🌍 non connecté → derniers voyages publics
        const voyages = await prisma.voyage.findMany({
          where: { is_public: true },
          take: 10,
          orderBy: { date_debut: 'desc' },
          include: {
            user: { select: { email: true } },
          },
        })
        return res.status(200).json(voyages)
      }
    } catch (error) {
      console.error('Erreur GET voyages:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  if (req.method === 'POST') {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) return res.status(401).json({ error: 'Non autorisé' })

    try {
      const parsed = VoyageSchema.parse(req.body) // valide et typé
      const voyage = await prisma.voyage.create({
        data: {
          ...parsed,
          user_id: Number(token.id),
        },
      })
      return res.status(201).json(voyage)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Erreur de validation', details: error.errors })
      }
      console.error('Erreur API:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).end(`Method ${req.method} Not Allowed`)
}
