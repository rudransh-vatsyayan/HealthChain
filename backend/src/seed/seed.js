import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { seedDemoData } from './bootstrap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/healthchain');
  console.log('🌱  Seeding HealthChain database...');

  await seedDemoData({ reset: true });

  console.log('✅  Seed complete!');
  console.log('\n📋  Login credentials:');
  console.log('   Patient  → patient@healthchain.io  / health123');
  console.log('   Doctor   → doctor@healthchain.io   / health123');
  console.log('   Insurer  → insurer@healthchain.io  / health123');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error('❌ Seed failed:', err); process.exit(1); });
