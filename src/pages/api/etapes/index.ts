import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'
import { z } from 'zod'

const EtapeSchema = z.object({
  titre: z.string().min(1),
  adresse: z.string(),
  texte: z.string().optional(),
  date: z.coerce.date(),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  voyage_id: z.number()
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.id) return res.status(401).json({ error: 'Non autorisé' })

  // 🔁 GET - Toutes les étapes de l'utilisateur
  if (req.method === 'GET') {
    try {
      const etapes = await prisma.etape.findMany({
        where: {
          voyage: { user_id: Number(token.id) }
        },
        orderBy: { createdAt: 'asc' }
      })
      return res.status(200).json(etapes)
    } catch (error) {
      console.error('[ERREUR GET /etapes]', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  // ➕ POST - Ajouter une nouvelle étape
  if (req.method === 'POST') {
    try {
      const data = EtapeSchema.parse(req.body)

      const voyage = await prisma.voyage.findUnique({
        where: { id: data.voyage_id }
      })

      if (!voyage || voyage.user_id !== Number(token.id)) {
        return res.status(403).json({ error: 'Accès interdit' })
      }

      const etape = await prisma.etape.create({ data })
      return res.status(201).json(etape)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Erreur de validation', details: error.errors })
      }
      console.error('[ERREUR POST /etapes]', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end(`Méthode ${req.method} non autorisée`)
}
