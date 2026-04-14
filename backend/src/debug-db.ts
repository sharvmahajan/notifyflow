import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('--- DB DEBUG START ---');
  
  const users = await prisma.user.findMany();
  console.log('Total users in DB:', users.length);
  
  const target = users.find(u => u.email === 'test@notifyflow.dev');
  
  if (target) {
    console.log('Found test@notifyflow.dev');
    console.log('isAdmin status:', target.isAdmin);
    
    const isPasswordValid = await bcrypt.compare('password', target.passwordHash);
    console.log('Verification with "password":', isPasswordValid);
  } else {
    console.log('User test@notifyflow.dev NOT FOUND');
    console.log('Existing emails:', users.map(u => u.email));
  }
  
  console.log('--- DB DEBUG END ---');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
