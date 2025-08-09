import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'
import { z } from 'zod'

const VoyageUpdateSchema = z.object({
  titre: z.string().min(1).optional(),
  description: z.string().optional(),
  date_debut: z.coerce.date().optional(),
  date_fin: z.coerce.date().optional(),
  image: z.string().url().optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  // ✅ normalisation string | string[] → string
  const idParam = Array.isArray(id) ? id[0] : id

  if (!idParam || isNaN(Number(idParam))) {
    return res.status(400).json({ error: 'ID invalide' })
  }
  const voyageId = Number(idParam)

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.id) return res.status(401).json({ error: 'Non autorisé' })

  try {
    const voyage = await prisma.voyage.findUnique({ where: { id: voyageId } })
    if (!voyage) return res.status(404).json({ error: 'Voyage non trouvé' })
    if (voyage.user_id !== Number(token.id)) {
      return res.status(403).json({ error: 'Accès interdit : vous n’êtes pas propriétaire de ce voyage' })
    }

    if (req.method === 'GET') {
      const data = await prisma.voyage.findUnique({
        where: { id: voyageId },
        include: { user: { select: { email: true } }, etape: true, partage: true }
      })
      return res.status(200).json(data)
    }
    if (req.method === 'PATCH') {
      try {
        const data = VoyageUpdateSchema.parse(req.body)
        const updated = await prisma.voyage.update({
          where: { id: voyageId },
          data,
        })
        return res.status(200).json(updated)
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: 'Erreur de validation', details: error.errors })
        }
        console.error('Erreur PATCH voyage :', error)
        return res.status(500).json({ error: 'Erreur serveur' })
      }
    }

    if (req.method === 'DELETE') {
      await prisma.voyage.delete({ where: { id: voyageId } })
      return res.status(204).end()
    }
    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
    
  } catch (e) {
    console.error('Erreur API voyages/[id]:', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

