import app from './app';
import { env } from './config/env';
import { testConnection } from './config/database';
import chalk from 'chalk';
import gradient from 'gradient-string';

async function bootstrap() {
  try {
    await testConnection();


    app.listen(env.port, () => {
      const sadaraGradient = gradient(['#3C3CFA', '#E4E5F3', '#11132B']);
      const logo = `
   ███████╗ █████╗ ██████╗  █████╗ ██████╗  █████╗ 
   ██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔══██╗
   ███████╗███████║██║  ██║███████║██████╔╝███████║
   ╚════██║██╔══██║██║  ██║██╔══██║██╔══██╗██╔══██║
   ███████║██║  ██║██████╔╝██║  ██║██║  ██║██║  ██║
   ╚══════╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝`;

      console.log(sadaraGradient(logo));
      console.log(chalk.gray(`  ${'━'.repeat(54)}`));

      console.log(
        `  ${chalk.white.bold('🛰️  SYSTEM STATUS:')} ${chalk.greenBright('OPERATIONAL')}`
      );

      console.log(
        `  ${chalk.white.bold('🌐 NETWORK:')}      ${chalk.blue.underline(`http://localhost:${env.port}`)}`
      );

      console.log(
        `  ${chalk.white.bold('🩺 HEALTH:')}       ${chalk.blue.underline(`http://localhost:${env.port}/api/health`)}`
      );

      // Define a color theme based on the environment
      const isProd = env.nodeEnv === 'production';
      const envColor = isProd ? chalk.redBright.bold : chalk.cyanBright.bold;
      const statusBullet = isProd ? '🔥' : '🛠️';

      console.log(
        `  ${chalk.white.bold('🏗️  ENVIRONMENT:')}  ${envColor(env.nodeEnv.toUpperCase())} ${statusBullet}`
      );

      if (isProd) {
        console.log(chalk.red('  ⚠️  WARNING: RUNNING IN PRODUCTION MODE'));
      }

      console.log(chalk.gray(`  ${'━'.repeat(54)}`));
      console.log(
        chalk.gray(`  [${new Date().toLocaleTimeString()}] `) +
        sadaraGradient('Sadara Engine v1.0.0 is warmed up...')
      );
      console.log('');
    });
  } catch (err) {
    console.error('❌ Failed to start    server:', err);
    process.exit(1);
  }
}

bootstrap();
