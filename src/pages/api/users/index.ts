import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../app/lib/prisma';
import bcrypt from 'bcrypt';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
      try {
        const users = await prisma.user.findMany({
          select: {
            id: true,
            email: true,
            role: true,
            premium: true,
            created_at: true
          }
        });
        res.status(200).json(users);
      } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
      }
    }
    
    else if (req.method === 'POST') {
      const { email, password, role } = req.body;
    
      if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis' });
      }
    
      try {
        // Vérifie si l'email existe déjà
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
          return res.status(400).json({ error: 'Email déjà utilisé' });
        }
    
        // Hash du mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);
    
        const user = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            role: role || 'user',
            premium: false,
          },
          select: {
            id: true,
            email: true,
            role: true,
            premium: true,
            created_at: true
          }
        });
    
        res.status(201).json(user);
      } catch (error) {
        console.error('Erreur création user:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    }
    
    else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
