import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'
import { z } from 'zod'

const BodySchema = z.object({
  is_public: z.boolean()
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  // ✅ normaliser id (string | string[] → string)
  const idParamRaw = req.query.id
  const idParam = Array.isArray(idParamRaw) ? idParamRaw[0] : idParamRaw
  if (!idParam || isNaN(Number(idParam))) {
    return res.status(400).json({ error: 'ID invalide' })
  }
  const voyageId = Number(idParam)

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.id) return res.status(401).json({ error: 'Non autorisé' })

  const parse = BodySchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({ error: 'Le champ is_public est requis et doit être un booléen.', details: parse.error.issues })
  }
  const { is_public } = parse.data

  try {
    const voyage = await prisma.voyage.findUnique({ where: { id: voyageId } })
    if (!voyage) return res.status(404).json({ error: 'Voyage non trouvé.' })
    if (voyage.user_id !== Number(token.id)) {
      return res.status(403).json({ error: 'Accès interdit. Vous n’êtes pas le propriétaire de ce voyage.' })
    }

    const updated = await prisma.voyage.update({
      where: { id: voyageId },
      data: { is_public }
    })
    return res.status(200).json(updated)
  } catch (e) {
    console.error('Erreur PATCH /voyages/privacy:', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}
