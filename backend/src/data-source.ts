import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config();
const { DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME, DATABASE_URL } =
  process.env;

export const AppDataSource = new DataSource({
  type: 'postgres',
  ...(DATABASE_URL
    ? { url: DATABASE_URL }
    : {
        host: DB_HOST,
        port: Number(DB_PORT),
        username: DB_USERNAME,
        password: DB_PASSWORD,
        database: DB_NAME,
      }),
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
  migrationsRun: false,
});
