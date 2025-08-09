// src/pages/api/public/voyages/[slug].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Méthode ${req.method} non autorisée`)
  }

  const { slug, pin } = req.query
  if (typeof slug !== 'string') return res.status(400).json({ error: 'Slug manquant' })
  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: 'PIN invalide (4 chiffres)' })
  }

  try {
    const partage = await prisma.partage.findUnique({
      where: { slug },
      select: { id: true, voyage_id: true, code_pin_hash: true, expiration: true }
    })
    if (!partage || partage.expiration < new Date()) {
      return res.status(404).json({ error: 'Lien invalide ou expiré' })
    }

    const ok = await bcrypt.compare(pin, partage.code_pin_hash)
    if (!ok) return res.status(403).json({ error: 'PIN incorrect' })

    const voyage = await prisma.voyage.findUnique({
      where: { id: partage.voyage_id },
      include: {
        etape: true,                    // adapte si ta relation est etape/etapes
        user: { select: { email: true } }
      }
    })
    if (!voyage) return res.status(404).json({ error: 'Voyage introuvable' })

    await prisma.partage.update({
      where: { id: partage.id },
      data: { views: { increment: 1 } }
    })

    return res.status(200).json({ voyage })
  } catch (e) {
    console.error('[GET public voyage]', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}
