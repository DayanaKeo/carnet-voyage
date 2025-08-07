import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  const voyageId = parseInt(id as string, 10)

  if (req.method !== 'GET') {
    return res.setHeader('Allow', ['GET']).status(405).end(`Méthode ${req.method} non autorisée`)
  }

  if (isNaN(voyageId)) {
    return res.status(400).json({ error: 'ID invalide' })
  }

  try {
    const etapes = await prisma.etape.findMany({
      where: { voyage_id: voyageId },
      orderBy: { date: 'asc' }
    })

    return res.status(200).json(etapes)
  } catch (error) {
    console.error('[GET /voyages/[id]/etapes]', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}
