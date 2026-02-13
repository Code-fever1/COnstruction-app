require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRequests() {
  try {
    const requests = await prisma.editRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
    console.log('Found', requests.length, 'requests');

    requests.forEach((req, i) => {
      console.log(`\n--- Request ${i + 1} ---`);
      console.log('ID:', req.id);
      console.log('Collection:', req.collectionName);
      console.log('Status:', req.status);
      console.log('New Data:', JSON.stringify(req.newData, null, 2));
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRequests();
