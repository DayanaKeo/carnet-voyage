import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import authOptions from "../auth/[...nextauth]";
import { getToken } from "next-auth/jwt";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const voyages = await prisma.voyage.findMany({
        include: {
             user: { select: { email: true } },
             etapes: true,
             partages: true 
            }
      });
      res.status(200).json(voyages);
    } catch (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  else if (req.method === 'POST') {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token || !token.id) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const userId = token.id;

    const { titre, description, date_debut, date_fin, image } = req.body;

    if (!titre || !date_debut || !date_fin) {
      return res.status(400).json({ error: 'Champs requis manquants' });
    }

    try {
      const voyage = await prisma.voyage.create({
        data: {
          titre,
          description,
          date_debut: new Date(date_debut),
          date_fin: new Date(date_fin),
          image,
          user_id: Number(userId)
        }
      });
      res.status(201).json(voyage);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
