import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { customAlphabet } from 'nanoid'


const PinSchema = z.string().trim().regex(/^\d{4}$/, 'Le code PIN doit contenir exactement 4 chiffres')
const CreateSchema = z.object({
  voyage_id: z.coerce.number().int().positive(),
  pin: PinSchema,
  expirationHours: z.coerce.number().int().positive().optional() // défaut 48h
})

const nanoid = customAlphabet('abcdef1234567890', 10)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.id) return res.status(401).json({ error: 'Non autorisé' })

  if (req.method === 'GET') {
    try {
      const partages = await prisma.partage.findMany({
        where: { voyage: { user_id: Number(token.id) } },
        include: { voyage: true }
      })
      return res.status(200).json(partages)
    } catch (e) {
      console.error('[GET /partages]', e)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  if (req.method === 'POST') {
    try {
      // ❗️ N’accepte PAS code_pin_hash : on exige pin
      const { voyage_id, pin, expirationHours } = CreateSchema.parse(req.body)

      const voyage = await prisma.voyage.findUnique({ where: { id: voyage_id } })
      if (!voyage || voyage.user_id !== Number(token.id)) {
        return res.status(403).json({ error: 'Accès interdit' })
      }

      const code_pin_hash = await bcrypt.hash(pin, 10)
      const expiration = new Date(Date.now() + (expirationHours ?? 48) * 60 * 60 * 1000)

      const partage = await prisma.partage.create({
        data: { voyage_id, code_pin_hash, expiration, slug: nanoid() }
      })
      const publicUrl = `${process.env.APP_URL}/s/${partage.slug}`

      return res.status(201).json({ message: 'Partage créé', url: publicUrl, partage })

    } catch (e) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation échouée', details: e.errors })
      }
      console.error('[POST /partages]', e)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).end(`Méthode ${req.method} non autorisée`)
}
