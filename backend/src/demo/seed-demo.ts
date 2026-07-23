import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { AppLocale } from '@/common/locale/request-locale';
import { DemoService } from './demo.service';

const getSeedLocale = (): AppLocale =>
  process.env.DEMO_LOCALE?.toLowerCase() === 'ru' ? 'ru' : 'en';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const demoService = app.get(DemoService);
    const locale = getSeedLocale();
    const result = await demoService.seedSharedDemoWorkspace(locale);
    console.log(
      `Demo workspace ready (${locale}): ${result.workspaceId}; start board: ${result.boardId}`,
    );
  } finally {
    await app.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
