import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { pool } from './pool.js';

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
