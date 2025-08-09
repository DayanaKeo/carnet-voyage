import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Méthode ${req.method} non autorisée`)
  }

  const { pin } = req.query
  if (!pin || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: 'Le code PIN (4 chiffres) est requis' })
  }

  try {
    // 1) récupère tous les partages non expirés (sans include pour éviter l’erreur)
    const partages = await prisma.partage.findMany({
      where: { expiration: { gt: new Date() } },
      select: { id: true, voyage_id: true, code_pin_hash: true }
    })

    // 2) compare le PIN, retourne le premier match
    for (const p of partages) {
      const ok = await bcrypt.compare(pin, p.code_pin_hash)
      if (ok) {
        // 3) récupère le voyage lié — adapte ICI les include aux noms de relations dans TON schema
        const voyage = await prisma.voyage.findUnique({
          where: { id: p.voyage_id },
          include: {
            etape: true,
            user: { select: { email: true } },
          }
        })

        if (!voyage) return res.status(404).json({ error: 'Voyage introuvable' })
        return res.status(200).json(voyage)
      }
    }

    return res.status(404).json({ error: 'Code PIN invalide ou expiré' })
  } catch (error) {
    console.error('Erreur GET /partages/access:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}
