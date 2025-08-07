import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'
import { z } from 'zod'

const EtapeUpdateSchema = z.object({
  titre: z.string().min(1).optional(),
  adresse: z.string().optional(),
  texte: z.string().optional(),
  date: z.coerce.date().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional()
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  const etapeId = parseInt(id as string, 10)
  if (isNaN(etapeId)) return res.status(400).json({ error: 'ID invalide' })

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.id) return res.status(401).json({ error: 'Non autorisé' })

  try {
    const etape = await prisma.etape.findUnique({
      where: { id: etapeId },
      include: { voyage: true }
    })

    if (!etape) return res.status(404).json({ error: 'Étape non trouvée' })
    if (etape.voyage.user_id !== Number(token.id)) {
      return res.status(403).json({ error: 'Accès interdit' })
    }

    // 🔄 PATCH - Modifier une étape
    if (req.method === 'PATCH') {
      try {
        const data = EtapeUpdateSchema.parse(req.body)

        const updated = await prisma.etape.update({
          where: { id: etapeId },
          data
        })

        return res.status(200).json(updated)
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            error: 'Erreur de validation',
            details: error.errors
          })
        }
        console.error('[ERREUR PATCH /etapes/:id]', error)
        return res.status(500).json({ error: 'Erreur serveur' })
      }
    }

    // 🗑️ DELETE - Supprimer l’étape
    if (req.method === 'DELETE') {
      await prisma.etape.delete({ where: { id: etapeId } })
      return res.status(204).end()
    }

    // 📄 GET - Récupérer une étape
    if (req.method === 'GET') {
      return res.status(200).json(etape)
    }

    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE'])
    return res.status(405).end(`Méthode ${req.method} non autorisée`)
  } catch (error) {
    console.error('[ERREUR API /etapes/[id]]', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}
