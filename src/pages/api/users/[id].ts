import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcrypt';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID invalide' });
  }

  switch (req.method) {
    case 'GET':
      try {
        const user = await prisma.user.findUnique({
          where: { id: parseInt(id) },
          select: {
            id: true,
            email: true,
            role: true,
            premium: true,
            created_at: true,
          },
        });
        if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
        res.status(200).json(user);
      } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
      }
      break;

    case 'PATCH':
      try {
        const { email, password, role, premium } = req.body;

        const data: any = {};
        if (email) data.email = email;
        if (password) data.password = await bcrypt.hash(password, 10);
        if (role) data.role = role;
        if (typeof premium === 'boolean') data.premium = premium;

        const updatedUser = await prisma.user.update({
          where: { id: parseInt(id) },
          data,
          select: {
            id: true,
            email: true,
            role: true,
            premium: true,
            created_at: true,
          },
        });

        res.status(200).json(updatedUser);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur mise à jour' });
      }
      break;

    case 'DELETE':
      try {
        await prisma.user.delete({
          where: { id: parseInt(id) },
        });
        res.status(204).end();
      } catch (error) {
        res.status(500).json({ error: 'Erreur suppression' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
