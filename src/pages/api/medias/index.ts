import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'
import { z } from 'zod'

// Extensions autorisées
const allowedImageExtensions = ['.png', '.jpg', '.jpeg'];
const allowedVideoExtensions = ['.mp4'];

// Validation avec Zod
const MediaSchema = z.object({
  etape_id: z.number(),
  type: z.enum(['image', 'video']),
  url: z.string().url()
}).superRefine((data, ctx) => {
  const lowerUrl = data.url.toLowerCase();
  if (data.type === 'image' && !allowedImageExtensions.some(ext => lowerUrl.endsWith(ext))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Extension de fichier invalide pour le type choisi'
    });
  }
  if (data.type === 'video' && !allowedVideoExtensions.some(ext => lowerUrl.endsWith(ext))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Extension de fichier invalide pour le type choisi'
    });
  }
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.id) return res.status(401).json({ error: 'Non autorisé' });

  if (req.method === 'GET') {
    try {
      const medias = await prisma.media.findMany({
        where: {
          etape: {
            voyage: { user_id: Number(token.id) }
          }
        },
        orderBy: { uploaded_at: 'desc' }
      });
      return res.status(200).json(medias);
    } catch (error) {
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  if (req.method === 'POST') {
    try {
      const data = MediaSchema.parse(req.body);

      // Vérifier que l'étape appartient à l'utilisateur
      const etape = await prisma.etape.findUnique({
        where: { id: data.etape_id },
        include: { voyage: true }
      });
      if (!etape || etape.voyage.user_id !== Number(token.id)) {
        return res.status(403).json({ error: 'Accès interdit' });
      }

      const media = await prisma.media.create({ data });
      return res.status(201).json(media);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation échouée', details: error.errors });
      }
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Méthode ${req.method} non autorisée`);
}
