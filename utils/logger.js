import chalk from 'chalk';

const log = {
  info: (msg) => console.log(chalk.cyan(`[INFO] ${new Date().toLocaleTimeString()} → ${msg}`)),
  success: (msg) => console.log(chalk.green(`[SUCCESS] ${new Date().toLocaleTimeString()} → ${msg}`)),
  warn: (msg) => console.log(chalk.yellow(`[WARN] ${new Date().toLocaleTimeString()} → ${msg}`)),
  error: (msg) => console.log(chalk.red.bold(`[ERROR] ${new Date().toLocaleTimeString()} → ${msg}`))
};

export default log;
