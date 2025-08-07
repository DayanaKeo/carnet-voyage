import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'
import { z } from 'zod'

// Extensions autorisées
const allowedImageExtensions = ['.png', '.jpg', '.jpeg'];
const allowedVideoExtensions = ['.mp4'];

const MediaUpdateSchema = z.object({
  type: z.enum(['image', 'video']).optional(),
  url: z.string().url().optional()
}).superRefine((data, ctx) => {
  if (!data.url || !data.type) return;
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

  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'ID invalide' });
  const mediaId = Number(id);

  // Vérifier que le média appartient à l'utilisateur
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    include: { etape: { include: { voyage: true } } }
  });
  if (!media) return res.status(404).json({ error: 'Média non trouvé' });
  if (media.etape.voyage.user_id !== Number(token.id)) {
    return res.status(403).json({ error: 'Accès interdit' });
  }

  if (req.method === 'GET') {
    return res.status(200).json(media);
  }

  if (req.method === 'PATCH') {
    try {
      const data = MediaUpdateSchema.parse(req.body);
      const updated = await prisma.media.update({
        where: { id: mediaId },
        data
      });
      return res.status(200).json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation échouée', details: error.errors });
      }
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.media.delete({ where: { id: mediaId } });
      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
  return res.status(405).end(`Méthode ${req.method} non autorisée`);
}
