import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (typeof id !== 'string' || isNaN(Number(id))) {
    return res.status(400).json({ error: 'ID invalide' })
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.id) return res.status(401).json({ error: 'Non autorisé' })

  if (req.method === 'DELETE') {
    try {
      const partage = await prisma.partage.findUnique({
        where: { id: Number(id) },
        include: { voyage: true }
      })
      if (!partage) return res.status(404).json({ error: 'Partage introuvable' })
      if (partage.voyage.user_id !== Number(token.id)) {
        return res.status(403).json({ error: 'Accès interdit' })
      }

      await prisma.partage.delete({ where: { id: Number(id) } })
      return res.status(204).end()
    } catch (error) {
      console.error('[DELETE /partages/:id] ', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  res.setHeader('Allow', ['DELETE'])
  return res.status(405).end(`Méthode ${req.method} non autorisée`)
}
