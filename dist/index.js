"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const chalk_1 = __importDefault(require("chalk"));
const gradient_string_1 = __importDefault(require("gradient-string"));
async function bootstrap() {
    try {
        await (0, database_1.testConnection)();
        app_1.default.listen(env_1.env.port, () => {
            const sadaraGradient = (0, gradient_string_1.default)(['#3C3CFA', '#E4E5F3', '#11132B']);
            const logo = `
   ███████╗ █████╗ ██████╗  █████╗ ██████╗  █████╗ 
   ██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔══██╗
   ███████╗███████║██║  ██║███████║██████╔╝███████║
   ╚════██║██╔══██║██║  ██║██╔══██║██╔══██╗██╔══██║
   ███████║██║  ██║██████╔╝██║  ██║██║  ██║██║  ██║
   ╚══════╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝`;
            console.log(sadaraGradient(logo));
            console.log(chalk_1.default.gray(`  ${'━'.repeat(54)}`));
            console.log(`  ${chalk_1.default.white.bold('🛰️  SYSTEM STATUS:')} ${chalk_1.default.greenBright('OPERATIONAL')}`);
            console.log(`  ${chalk_1.default.white.bold('🌐 NETWORK:')}      ${chalk_1.default.blue.underline(`http://localhost:${env_1.env.port}`)}`);
            console.log(`  ${chalk_1.default.white.bold('🩺 HEALTH:')}       ${chalk_1.default.blue.underline(`http://localhost:${env_1.env.port}/api/health`)}`);
            // Define a color theme based on the environment
            const isProd = env_1.env.nodeEnv === 'production';
            const envColor = isProd ? chalk_1.default.redBright.bold : chalk_1.default.cyanBright.bold;
            const statusBullet = isProd ? '🔥' : '🛠️';
            console.log(`  ${chalk_1.default.white.bold('🏗️  ENVIRONMENT:')}  ${envColor(env_1.env.nodeEnv.toUpperCase())} ${statusBullet}`);
            if (isProd) {
                console.log(chalk_1.default.red('  ⚠️  WARNING: RUNNING IN PRODUCTION MODE'));
            }
            console.log(chalk_1.default.gray(`  ${'━'.repeat(54)}`));
            console.log(chalk_1.default.gray(`  [${new Date().toLocaleTimeString()}] `) +
                sadaraGradient('Sadara Engine v1.0.0 is warmed up...'));
            console.log('');
        });
    }
    catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=index.js.map